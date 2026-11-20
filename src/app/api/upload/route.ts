import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ROOT_FOLDER = "poplan";
const RESOURCE_TYPES = ["image", "video", "raw"] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];

const FOLDER_PATTERN = /^[a-zA-Z0-9/._@-]{1,250}$/;
const FILE_NAME_PATTERN = /^[a-zA-Z0-9._-]{1,150}$/;
const PUBLIC_ID_PATTERN = /^[a-zA-Z0-9/._@-]{1,400}$/;

function validFolder(folder: string) {
  return FOLDER_PATTERN.test(folder) &&
    folder.split("/").every((segment) => segment !== "." && segment !== ".." && !segment.includes(".."));
}

function config() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return {
    cloudName,
    // Basic Authentication: API key and secret in the Authorization header, no signature needed
    authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
  };
}

async function isAuthenticated(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function guard(request: Request) {
  const cloudinary = config();
  if (!cloudinary) return { response: fail("Cloudinary is not configured", 500) };
  if (!(await isAuthenticated(request))) return { response: fail("Not authenticated", 401) };
  return { cloudinary };
}

export async function POST(request: Request) {
  const { cloudinary, response: denied } = await guard(request);
  if (!cloudinary) return denied;

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return fail("Invalid form data", 400);
  }

  const file = incoming.get("file");
  if (!(file instanceof File) || file.size === 0) return fail("No file provided", 400);
  if (file.size > MAX_FILE_SIZE) return fail("File is too large (max 10MB)", 413);

  const folder = incoming.get("folder");
  const publicId = incoming.get("public_id");
  if (typeof folder === "string" && folder && (!validFolder(folder) || folder.endsWith("/") || folder.includes("//"))) return fail("Invalid folder", 400);
  if (typeof publicId === "string" && publicId && !FILE_NAME_PATTERN.test(publicId)) return fail("Invalid file name", 400);

  const body = new FormData();
  body.append("file", file);
  body.append("folder", [ROOT_FOLDER, typeof folder === "string" ? folder : ""].filter(Boolean).join("/"));
  if (typeof publicId === "string" && publicId) {
    // Images and videos get their extension back as the delivery format, so strip it from the public ID
    const stripExtension = file.type.startsWith("image/") || file.type.startsWith("video/");
    body.append("public_id", stripExtension ? publicId.replace(/\.[^.]+$/, "") : publicId);
    body.append("overwrite", "true");
    body.append("invalidate", "true");
    body.append("unique_filename", "false");
  } else {
    body.append("use_filename", "true");
    body.append("unique_filename", "true");
  }

  const upstream = await fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/auto/upload`, {
    method: "POST",
    headers: { Authorization: cloudinary.authorization },
    body,
  });

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data) {
    console.error("Cloudinary upload error:", data);
    return fail(data?.error?.message || "Upload failed", upstream.ok ? 502 : upstream.status);
  }

  return NextResponse.json({
    url: data.secure_url,
    publicId: data.public_id,
    resourceType: data.resource_type,
    bytes: data.bytes,
    format: data.format,
    originalFilename: data.original_filename,
  });
}

export async function GET(request: Request) {
  const { cloudinary, response: denied } = await guard(request);
  if (!cloudinary) return denied;

  const prefix = new URL(request.url).searchParams.get("prefix") ?? "";
  if (!validFolder(prefix) || prefix.startsWith("/") || prefix.includes("//")) return fail("Invalid prefix", 400);

  const results = await Promise.all(
    RESOURCE_TYPES.map(async (type) => {
      const query = new URLSearchParams({ prefix: `${ROOT_FOLDER}/${prefix}`, max_results: "500" });
      const upstream = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/resources/${type}/upload?${query}`,
        { headers: { Authorization: cloudinary.authorization }, cache: "no-store" },
      );
      const data = await upstream.json().catch(() => null);
      if (!upstream.ok || !data) throw new Error(data?.error?.message || `Could not list ${type} files`);
      return (data.resources ?? []) as Record<string, unknown>[];
    }),
  ).catch((error: Error) => {
    console.error("Cloudinary list error:", error);
    return null;
  });
  if (!results) return fail("Could not list files", 502);

  const files = results
    .flat()
    .map((r) => ({
      publicId: r.public_id as string,
      resourceType: r.resource_type as string,
      format: (r.format as string | undefined) ?? "",
      bytes: Number(r.bytes) || 0,
      url: r.secure_url as string,
      createdAt: (r.created_at as string | undefined) ?? "",
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ files });
}

export async function DELETE(request: Request) {
  const { cloudinary, response: denied } = await guard(request);
  if (!cloudinary) return denied;

  const { publicId, resourceType } = await request.json().catch(() => ({}));
  if (
    typeof publicId !== "string" ||
    !PUBLIC_ID_PATTERN.test(publicId) ||
    publicId.includes("..") ||
    !publicId.startsWith(`${ROOT_FOLDER}/`) ||
    !RESOURCE_TYPES.includes(resourceType as ResourceType)
  ) {
    return fail("Invalid file", 400);
  }

  const query = new URLSearchParams({ invalidate: "true" });
  query.append("public_ids[]", publicId);
  const upstream = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/resources/${resourceType}/upload?${query}`,
    { method: "DELETE", headers: { Authorization: cloudinary.authorization } },
  );
  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data) {
    console.error("Cloudinary delete error:", data);
    return fail(data?.error?.message || "Delete failed", upstream.ok ? 502 : upstream.status);
  }
  if (data.deleted?.[publicId] !== "deleted") return fail("File was not deleted", 404);

  return NextResponse.json({ success: true });
}
