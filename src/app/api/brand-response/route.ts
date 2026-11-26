import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { token, response } = await request.json();
  // response: "interested" | "not_interested"

  if (!token || !["interested", "not_interested"].includes(response)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: app, error } = await supabase
    .from("brand_applications")
    .select("id, brand_name, email, event_slug, status")
    .eq("response_token", token)
    .maybeSingle();

  if (error || !app) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  if (app.status !== "approved") {
    return NextResponse.json({ error: "Already responded" }, { status: 409 });
  }

  const newStatus = response === "interested" ? "interested" : "not_interested";
  await supabase
    .from("brand_applications")
    .update({ status: newStatus })
    .eq("id", app.id);

  return NextResponse.json({ success: true, brand_name: app.brand_name, response });
}
