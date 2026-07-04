import type { EventSummary } from "@/lib/events";
import { formatEventDateRange, getDaysToEvent } from "@/lib/events";

type EventCountdownProps = {
  event: EventSummary;
};

export function EventCountdown({ event }: EventCountdownProps) {
  const hasDates = Boolean(event.startDate);
  const days = event.startDate ? getDaysToEvent(event.startDate) : null;
  const eventLabel = formatEventDateRange(event);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-nude-300/50 bg-gradient-to-br from-brown-700 via-brown-800 to-brown-900 px-6 py-7 text-white shadow-lg shadow-brown-900/10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-brown-500/20 blur-2xl"
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-nude-300/80">
            {hasDates ? "Next event" : "Upcoming event"}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium sm:text-4xl">
            {event.city}
          </h2>
          <p className="mt-1 text-sm text-nude-200/80">{eventLabel}</p>
        </div>

        {hasDates && days !== null ? (
          <div className="flex items-end gap-3">
            <span className="font-[family-name:var(--font-display)] text-6xl font-light leading-none sm:text-7xl">
              {days}
            </span>
            <div className="pb-2">
              <p className="text-lg font-medium">days</p>
              <p className="text-xs text-nude-300/70">until doors open</p>
            </div>
          </div>
        ) : (
          <div className="pb-1">
            <p className="font-[family-name:var(--font-display)] text-3xl font-light">
              TBD
            </p>
            <p className="text-xs text-nude-300/70">dates coming soon</p>
          </div>
        )}
      </div>
    </section>
  );
}
