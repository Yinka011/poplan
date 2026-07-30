export async function notifyOrganizer({
  event,
  brandEmail,
  brandName,
  type,
  message,
}: {
  event: string;
  brandEmail: string;
  brandName: string;
  type: string;
  message: string;
}) {
  try {
    await fetch("/api/organizer-notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, brandEmail, brandName, type, message }),
    });
  } catch (e) {
    console.error("Organizer notify failed:", e);
  }
}
