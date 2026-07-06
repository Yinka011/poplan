import Link from "next/link";
import Checklist from "@/components/dashboard/Checklist";
import { EventCountdown } from "@/components/dashboard/EventCountdown";
import { MarketingDeadlines } from "@/components/dashboard/MarketingDeadlines";
import PaymentTracker from "@/components/dashboard/PaymentTracker";
import { StatCard } from "@/components/dashboard/StatCard";
import { getEventDetail } from "@/lib/event-details";
import {
  type EventSummary,
  formatCurrency,
  getDaysToEvent,
} from "@/lib/events";

type EventDashboardProps = {
  event: EventSummary;
};

export function EventDashboard({ event }: EventDashboardProps) {
  const detail = getEventDetail(event.slug);
  const daysToEvent = event.startDate
    ? getDaysToEvent(event.startDate)
    : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/login/organizer/events"
            className="text-sm font-medium text-brown-600/70 transition-colors hover:text-brown-800"
          >
            ← All events
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium text-brown-800 sm:text-4xl">
            {event.name}
          </h1>
          <p className="mt-1 text-sm text-brown-600/70">
            {event.status === "Planning"
              ? `${event.city} is in early planning.`
              : `Here's how ${event.city} is shaping up.`}
          </p>
        </div>
      </div>

      <EventCountdown event={event} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Brands confirmed"
          value={String(event.brandsCount)}
          hint={
            event.brandsCount > 0 ? "All spots filled" : "No brands yet"
          }
        />
        <StatCard
          label="Fees collected"
          value={formatCurrency(event.feesCollected)}
        />
        <StatCard
          label="Outstanding balance"
          value={formatCurrency(event.outstandingBalance)}
          hint={
            event.outstandingBalance > 0
              ? "Brands with balance due"
              : undefined
          }
        />
        <StatCard
          label="Days to event"
          value={daysToEvent !== null ? String(daysToEvent) : "—"}
          hint={event.datesLabel !== "TBD" ? event.datesLabel : "Dates TBD"}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
        <a href={`/login/organizer/events/${event.slug}/expenses`} style={{ padding: "8px 18px", background: "#2c1810", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>💰 View Expenses</a>
        <a href={`/login/organizer/events/${event.slug}/brands`} style={{ padding: "8px 18px", background: "#4a7c59", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif", marginRight: "8px" }}>👥 Brand Activity</a>
        <a href={`/login/organizer/events/${event.slug}/planning`} style={{ padding: "8px 18px", background: "#5b7fa6", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif", marginLeft: "8px" }}>🎨 Planning Hub</a>
      </div>
      <PaymentTracker />

      <div className="grid gap-6 lg:grid-cols-2">
        <Checklist />
        <MarketingDeadlines city={event.city} items={detail.marketingDeadlines} />
      </div>
    </div>
  );
}
