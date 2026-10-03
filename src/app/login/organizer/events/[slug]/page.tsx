import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EventDashboard } from "@/components/dashboard/EventDashboard";
import { getEventBySlug } from "@/lib/events";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch event from database
  const { data: eventData } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  // Fall back to hardcoded events for existing events like "atlanta"
  const hardcodedEvent = getEventBySlug(slug);

  if (!eventData && !hardcodedEvent) notFound();

  const city = eventData?.city || hardcodedEvent?.city || slug.split("-")[0].charAt(0).toUpperCase() + slug.split("-")[0].slice(1);
  const organizerEmail = eventData?.organizer_email || "";

  const { data: brands } = await supabase
    .from("brands")
    .select("*")
    .eq("event", city)
    .eq("organizer_email", organizerEmail);

  const brandsCount = brands?.length || 0;
  const feesCollected = brands?.reduce((sum: number, b: any) => sum + Number(b.amount_paid), 0) || 0;
  const outstandingBalance = brands?.reduce((sum: number, b: any) => sum + Number(b.balance), 0) || 0;

  const event = {
    slug,
    name: eventData?.name || hardcodedEvent?.name || city,
    city,
    datesLabel: eventData?.dates_label || hardcodedEvent?.datesLabel || "TBD",
    status: (eventData?.status || hardcodedEvent?.status || "Planning") as any,
    brandsCount,
    feesCollected,
    outstandingBalance,
    startDate: eventData?.start_date ? new Date(eventData.start_date) : hardcodedEvent?.startDate,
    endDate: eventData?.end_date ? new Date(eventData.end_date) : hardcodedEvent?.endDate,
  };

  return (
    <DashboardShell event={{ name: event.name, slug: event.slug, city: event.city }}>
      <EventDashboard event={event} />
    </DashboardShell>
  );
}
