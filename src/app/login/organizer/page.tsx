import { Checklist } from "@/components/dashboard/Checklist";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EventCountdown } from "@/components/dashboard/EventCountdown";
import { MarketingDeadlines } from "@/components/dashboard/MarketingDeadlines";
import { PaymentTracker } from "@/components/dashboard/PaymentTracker";
import { StatCard } from "@/components/dashboard/StatCard";
import {
  STATS,
  formatCurrency,
  getDaysToEvent,
} from "@/lib/organizer-data";

export default function OrganizerDashboardPage() {
  const daysToEvent = getDaysToEvent();

  return (
    <DashboardShell>
      <div className="space-y-8">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium text-brown-800 sm:text-4xl">
            Welcome back, Yinka
          </h1>
          <p className="mt-1 text-sm text-brown-600/70">
            Here&apos;s how Atlanta is shaping up.
          </p>
        </div>

        <EventCountdown />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Brands confirmed"
            value={String(STATS.brandsConfirmed)}
            hint="All spots filled"
          />
          <StatCard
            label="Fees collected"
            value={formatCurrency(STATS.feesCollected)}
          />
          <StatCard
            label="Outstanding balance"
            value={formatCurrency(STATS.outstandingBalance)}
            hint="2 brands pending"
          />
          <StatCard
            label="Days to event"
            value={String(daysToEvent)}
            hint="September 12"
          />
        </div>

        <PaymentTracker />

        <div className="grid gap-6 lg:grid-cols-2">
          <Checklist />
          <MarketingDeadlines />
        </div>
      </div>
    </DashboardShell>
  );
}
