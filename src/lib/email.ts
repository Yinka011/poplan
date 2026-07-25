export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
    const data = await response.json();
    if (!response.ok) console.error("Email error:", data);
    return data;
  } catch (e) {
    console.error("Email failed:", e);
  }
}

export function emailTemplate({
  title,
  message,
  buttonText,
  buttonUrl,
  footer,
}: {
  title: string;
  message: string;
  buttonText?: string;
  buttonUrl?: string;
  footer?: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f8faf8;font-family:Georgia,serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="text-align:center;margin-bottom:32px;">
          <div style="font-size:1.5rem;letter-spacing:0.15em;color:#1B3A2D;">NALPOP</div>
          <div style="width:2rem;height:1px;background:#E8C97A;margin:8px auto 0;"></div>
        </div>
        <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e4ebe6;">
          <h1 style="font-size:1.2rem;color:#1c1714;font-weight:normal;margin:0 0 16px;">${title}</h1>
          <p style="font-size:0.95rem;color:#4a5a52;line-height:1.7;margin:0 0 24px;">${message}</p>
          ${buttonText && buttonUrl ? `<a href="${buttonUrl}" style="display:inline-block;padding:10px 24px;background:#1B3A2D;color:#fff;text-decoration:none;border-radius:8px;font-size:0.9rem;font-family:Georgia,serif;">${buttonText}</a>` : ""}
        </div>
        <div style="text-align:center;margin-top:24px;font-size:0.78rem;color:#4a5a52;">
          ${footer || "You are receiving this because you are part of a Nalpop event."}
          <br><a href="https://nalpop.com" style="color:#E8C97A;text-decoration:none;">nalpop.com</a>
        </div>
      </div>
    </body>
    </html>
  `;
}
