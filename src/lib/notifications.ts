import { supabase } from "@/lib/supabase";

export async function sendNotification({
  recipientEmail,
  eventSlug,
  type,
  title,
  message,
  link,
}: {
  recipientEmail: string;
  eventSlug: string;
  type: string;
  title: string;
  message: string;
  link: string;
}) {
  const { error } = await supabase.from("notifications").insert({
    recipient_email: recipientEmail,
    event_slug: eventSlug,
    type,
    title,
    message,
    link,
    read: false,
  });
  if (error) console.error("sendNotification error:", error);
}
