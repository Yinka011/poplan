import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://nalpop.com/onboarding"
  });

  if (error) {
    // Fallback: send manual invite email
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "You have been invited to Nalpop",
        html: `<div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:2rem">
          <h2 style="color:#1B3A2D">You have been invited to Nalpop</h2>
          <p style="color:#4a5a52">You have been invited to manage your pop-up events on Nalpop — the platform built for pop-up culture.</p>
          <a href="https://nalpop.com/onboarding" style="display:inline-block;padding:12px 24px;background:#1B3A2D;color:#fff;text-decoration:none;border-radius:8px;margin:1rem 0">Get started on Nalpop</a>
        </div>`
      })
    }).catch(() => {});
    return NextResponse.json({ success: true, fallback: true });
  }

  return NextResponse.json({ success: true });
}
