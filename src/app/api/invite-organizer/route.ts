import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INVITE_HTML = (inviteUrl: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4ebe6">

    <!-- Header -->
    <div style="background:#1B3A2D;padding:2rem 2.5rem">
      <div style="font-size:1.3rem;letter-spacing:0.2em;color:#E8C97A;margin-bottom:0.25rem">NALPOP</div>
      <div style="font-size:0.8rem;color:#ffffff66;letter-spacing:0.08em">THE POP-UP MANAGEMENT PLATFORM</div>
    </div>

    <!-- Body -->
    <div style="padding:2rem 2.5rem">
      <h2 style="color:#1B3A2D;font-weight:normal;font-size:1.4rem;margin:0 0 0.5rem">Welcome to Nalpop</h2>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 0.75rem">
        You've just been invited to Nalpop — the platform built for pop-up organisers. Check your inbox for a separate email with a link to set your password and get in.
      </p>
      <div style="background:#f0f7f2;border-left:3px solid #1B3A2D;padding:10px 14px;border-radius:4px;font-size:0.82rem;color:#1B3A2D;margin-bottom:1.5rem;line-height:1.6">
        Look out for an email from <strong>noreply@mail.app.supabase.io</strong> — that's the one with your invite link to set your password.
      </div>

      <div style="margin-bottom:1.5rem">
        <div style="font-size:0.75rem;color:#4a5a52;letter-spacing:0.08em;margin-bottom:8px">BEFORE YOU DIVE IN</div>
        <a href="https://nalpop.com/tour" style="display:inline-flex;align-items:center;gap:8px;padding:10px 18px;background:#f8faf8;border:1px solid #e4ebe6;border-radius:8px;font-size:0.85rem;color:#1B3A2D;text-decoration:none">
          <span style="font-size:1rem">✦</span> See what Nalpop can do →
        </a>
      </div>

      <div style="border-top:1px solid #e4ebe6;padding-top:1.5rem;margin-top:0.5rem">
        <div style="font-size:0.7rem;color:#4a5a52;letter-spacing:0.1em;margin-bottom:1rem">WHAT TO DO ONCE YOU'RE IN</div>

        ${[
          ["1", "Set up your profile", "Choose your role and pick the features you need. You can change this anytime."],
          ["2", "Create your event", "Add your event name, city, and dates. This is the home for everything."],
          ["3", "Add your brands", "Go into your event and add each brand you've confirmed. Each one gets their own portal."],
          ["4", "Send brand portal links", "From the Brands tab, copy each brand's unique link and send it to them directly."],
          ["5", "Set your venue address and spots", "Back on your event dashboard, add the venue address and the number of brand spots available."],
        ].map(([num, title, desc]) => `
          <div style="display:flex;gap:12px;margin-bottom:14px;align-items:flex-start">
            <div style="width:22px;height:22px;border-radius:50%;background:#1B3A2D;color:#E8C97A;font-size:0.7rem;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;text-align:center;line-height:22px">${num}</div>
            <div>
              <div style="font-size:0.88rem;color:#1B3A2D;margin-bottom:2px">${title}</div>
              <div style="font-size:0.78rem;color:#4a5a52;line-height:1.6">${desc}</div>
            </div>
          </div>
        `).join("")}
      </div>

      <div style="background:#f8faf8;border-radius:10px;padding:1rem 1.25rem;margin-top:1rem;border:1px solid #e4ebe6">
        <div style="font-size:0.78rem;color:#4a5a52;line-height:1.7">
          <strong style="color:#1B3A2D">Your brands get their own portal — for free.</strong> Once you send them their link, they can upload their product catalogue, track tasks and deadlines you set, view their sales after the event, and message you directly.
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f8faf8;padding:1.25rem 2.5rem;border-top:1px solid #e4ebe6">
      <div style="font-size:0.75rem;color:#4a5a52">Questions? Reply to this email and we'll get back to you.</div>
    </div>

  </div>
</body>
</html>
`;

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const redirectTo = "https://nalpop.com/onboarding";

  // Step 1: Supabase sends the magic link / set-password email
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: { invited_as: "organizer" },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Step 2: Send our branded welcome email from hellonalpop@gmail.com
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: email,
      from: "Nalpop <hellonalpop@gmail.com>",
      subject: "Welcome to Nalpop — here's what to expect",
      html: INVITE_HTML(redirectTo),
    }),
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
