import { supabase } from "@/lib/supabase";

export type CloudinaryFile = {
  publicId: string;
  resourceType: string;
  format: string;
  bytes: number;
  url: string;
  createdAt: string;
};

export type UploadResult = {
  url: string;
  publicId: string;
  resourceType: string;
  bytes: number;
  format: string;
  originalFilename: string;
};

const ROOT_FOLDER = "poplan";

export const folderSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "_");
export const safeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");

async function request<T>(input: string, init: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token)
    headers.set("Authorization", `Bearer ${session.access_token}`);
  const response = await fetch(input, { ...init, headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || "Request failed");
  return data as T;
}

// Pass `publicId` (a file name) to make re-uploads replace the existing file instead of adding a new one
export function uploadToCloudinary(
  file: File,
  folder: string,
  publicId?: string,
) {
  const body = new FormData();
  body.append("file", file);
  body.append("folder", folder);
  if (publicId) body.append("public_id", publicId);
  return request<UploadResult>("/api/upload", { method: "POST", body });
}

export async function listCloudinaryFiles(folder: string) {
  const { files } = await request<{ files: CloudinaryFile[] }>(
    `/api/upload?prefix=${encodeURIComponent(`${folder}/`)}`,
  );
  // Only direct children of the folder, not files in sub-folders
  const base = `${ROOT_FOLDER}/${folder}/`;
  return files.filter(
    (f) =>
      f.publicId.startsWith(base) &&
      !f.publicId.slice(base.length).includes("/"),
  );
}

export function deleteCloudinaryFile(file: {
  publicId: string;
  resourceType: string;
}) {
  return request<{ success: boolean }>("/api/upload", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicId: file.publicId,
      resourceType: file.resourceType,
    }),
  });
}

export type BrandFile = {
  name: string;
  size: number;
  url: string;
  category: string;
  uploaded_at: string;
  source: "cloudinary" | "supabase";
  publicId?: string;
  resourceType?: string;
  path?: string;
};

// Brand files are stored as "<category>__<file name>"; images and videos had their extension moved to `format`
export function toBrandFile(file: CloudinaryFile): BrandFile {
  const base = file.publicId.split("/").pop() || "";
  const parts = base.split("__");
  const rawName = parts.slice(1).join("__") || base;
  const name =
    file.resourceType === "raw" ||
    !file.format ||
    rawName.toLowerCase().endsWith(`.${file.format.toLowerCase()}`)
      ? rawName
      : `${rawName}.${file.format}`;
  return {
    name,
    size: file.bytes,
    url: file.url,
    category: parts.length > 1 ? parts[0].replace(/-/g, " ") : "Other",
    uploaded_at: file.createdAt,
    source: "cloudinary",
    publicId: file.publicId,
    resourceType: file.resourceType,
  };
}

// Files uploaded before the Cloudinary migration still live in Supabase storage
async function listLegacyBrandFiles(brandEmail: string): Promise<BrandFile[]> {
  const { data, error } = await supabase.storage
    .from("brand-uploads")
    .list(`${brandEmail}/`, {
      sortBy: { column: "created_at", order: "desc" },
    });
  if (error) throw error;
  return (data ?? [])
    .filter((f) => f.name !== ".emptyFolderPlaceholder" && f.id)
    .map((f) => {
      const path = `${brandEmail}/${f.name}`;
      const parts = f.name.split("__");
      return {
        name: parts[1] || f.name,
        size: f.metadata?.size || 0,
        url: supabase.storage.from("brand-uploads").getPublicUrl(path).data
          .publicUrl,
        category: parts[0]?.replace(/-/g, " ") || "Other",
        uploaded_at: f.created_at || "",
        source: "supabase" as const,
        path,
      };
    });
}

// Lists Cloudinary and legacy Supabase files together; one source failing does not hide the other
export async function listBrandFiles(brandEmail: string): Promise<BrandFile[]> {
  const [cloud, legacy] = await Promise.allSettled([
    listCloudinaryFiles(folderSegment(brandEmail)).then((files) =>
      files.map(toBrandFile),
    ),
    listLegacyBrandFiles(brandEmail),
  ]);

  if (cloud.status === "rejected")
    console.error("Could not list Cloudinary files:", cloud.reason);
  if (legacy.status === "rejected")
    console.error("Could not list legacy Supabase files:", legacy.reason);
  const files = [
    ...(cloud.status === "fulfilled" ? cloud.value : []),
    ...(legacy.status === "fulfilled" ? legacy.value : []),
  ];
  return files.sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}

export async function deleteBrandFile(file: BrandFile) {
  if (file.source === "supabase") {
    if (!file.path) throw new Error("Missing file path");
    const { error } = await supabase.storage
      .from("brand-uploads")
      .remove([file.path]);
    if (error) throw error;
    return;
  }
  if (!file.publicId || !file.resourceType) throw new Error("Missing file id");
  await deleteCloudinaryFile({
    publicId: file.publicId,
    resourceType: file.resourceType,
  });
}
