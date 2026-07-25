export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.error("RESEND_API_KEY not set"); return; }

  const recipients = Array.isArray(to) ? to : [to];
  const validRecipients = recipients.filter(email => email && email.includes("@"));
  if (!validRecipients.length) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Nalpop <notifications@nalpop.com>",
      to: validRecipients,
      subject,
      html,
    }),
  });

  const data = await response.json();
  if (!response.ok) console.error("Email error:", data);
  return data;
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
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body style="margin:0;padding:0;background:#faf8f5;font-family:Georgia,serif;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        
        <!-- Logo -->
        <div style="text-align:center;margin-bottom:32px;">
          <div style="font-size:1.5rem;letter-spacing:0.15em;color:#5a3e2b;">NALPOP</div>
          <div style="width:2rem;height:1px;background:#c4956a;margin:8px auto 0;"></div>
        </div>

        <!-- Card -->
        <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e8e2da;">
          <h1 style="font-size:1.2rem;color:#1c1714;font-weight:normal;margin:0 0 16px;">${title}</h1>
          <p style="font-size:0.95rem;color:#6b5f54;line-height:1.7;margin:0 0 24px;">${message}</p>
          ${buttonText && buttonUrl ? `
          <a href="${buttonUrl}" style="display:inline-block;padding:10px 24px;background:#5a3e2b;color:#fff;text-decoration:none;border-radius:8px;font-size:0.9rem;font-family:Georgia,serif;">
            ${buttonText}
          </a>
          ` : ""}
        </div>

        <!-- Footer -->
        <div style="text-align:center;margin-top:24px;font-size:0.78rem;color:#6b5f54;">
          ${footer || "You are receiving this because you are part of a Nalpop event."}
          <br>
          <a href="https://nalpop.com" style="color:#c4956a;text-decoration:none;">nalpop.com</a>
        </div>

      </div>
    </body>
    </html>
  `;
}
