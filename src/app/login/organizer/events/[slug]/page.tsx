import { notFound } from "next/navigation";
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

  return (
    <DashboardShell>
      <EventDashboard event={event} />
    </DashboardShell>
  );
}
