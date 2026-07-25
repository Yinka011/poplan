import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { to, subject, html } = await request.json();
  
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  const recipients = Array.isArray(to) ? to : [to];
  const valid = recipients.filter((e: string) => e && e.includes("@"));
  if (!valid.length) return NextResponse.json({ error: "No valid recipients" }, { status: 400 });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Nalpop <notifications@nalpop.com>",
      to: valid,
      subject,
      html,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Resend error:", data);
    return NextResponse.json({ error: data.message || "Email failed" }, { status: 400 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
