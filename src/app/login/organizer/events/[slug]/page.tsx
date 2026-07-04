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
  const event = getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: brands } = await supabase
    .from("brands")
    .select("*")
    .eq("event", event.city);

  const brandsCount = brands?.length || 0;
  const feesCollected = brands?.reduce((sum, b) => sum + Number(b.amount_paid), 0) || 0;
  const outstandingBalance = brands?.reduce((sum, b) => sum + Number(b.balance), 0) || 0;

  const liveEvent = {
    ...event,
    brandsCount,
    feesCollected,
    outstandingBalance,
  };

  return (
    <DashboardShell>
      <EventDashboard event={liveEvent} />
    </DashboardShell>
  );
}
