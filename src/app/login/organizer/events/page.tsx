import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EventCard } from "@/components/dashboard/EventCard";
import { EVENTS } from "@/lib/events";

export default function EventsPage() {
  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium text-brown-800 sm:text-4xl">
            Welcome back, Yinka
          </h1>
          <p className="mt-1 text-sm text-brown-600/70">
            Manage all your pop-up events in one place.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EVENTS.map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
