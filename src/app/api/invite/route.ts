import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://nalpop.com/brand/setup",
  });

  if (error) {
    // If the user already has an account, treat as success — they can just log in
    if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered") || error.code === "email_exists") {
      return NextResponse.json({ success: true, already_registered: true });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
