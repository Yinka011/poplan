import { supabase } from "@/lib/supabase";

export async function invitePlannerBrand(email: string) {
  const response = await fetch("/api/invite-organizer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Could not send invitation.");
  }
}

export async function removePlannerEvent(id: number, email: string) {
  const { error } = await supabase.from("event_planners").delete()
    .eq("id", id).eq("planner_email", email).select("id").single();
  if (error) throw error;
}
