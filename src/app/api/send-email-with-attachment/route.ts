import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { to, subject, html, attachments } = await request.json();

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  const recipients = Array.isArray(to) ? to : [to];
  const valid = recipients.filter((e: string) => e && e.includes("@"));
  if (!valid.length) return NextResponse.json({ error: "No valid recipients" }, { status: 400 });

  const body: any = {
    from: "Nalpop <notifications@nalpop.com>",
    to: valid,
    subject,
    html,
  };

  // attachments: [{ filename, url }] — we fetch the file and base64 encode it
  if (attachments?.length) {
    const attached = await Promise.all(
      attachments.map(async ({ filename, url }: { filename: string; url: string }) => {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const content = Buffer.from(buffer).toString("base64");
        return { filename, content };
      })
    );
    body.attachments = attached;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Resend error:", data);
    return NextResponse.json({ error: data.message || "Email failed" }, { status: 400 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
