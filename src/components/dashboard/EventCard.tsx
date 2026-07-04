import Link from "next/link";
import {
  type EventSummary,
  formatCurrency,
  type EventStatus,
} from "@/lib/events";

const STATUS_STYLES: Record<EventStatus, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  Planning: "bg-amber-50 text-amber-700 ring-amber-600/15",
  Completed: "bg-nude-200 text-brown-600 ring-brown-500/10",
};

type EventCardProps = {
  event: EventSummary;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <Link
      href={`/login/organizer/events/${event.slug}`}
      className="group flex flex-col rounded-2xl border border-nude-300/50 bg-white/70 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:border-brown-500/30 hover:bg-white hover:shadow-md hover:shadow-brown-500/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium text-brown-800 group-hover:text-brown-900">
            {event.name}
          </h2>
          <p className="mt-0.5 text-sm text-brown-600/70">{event.city}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[event.status]}`}
        >
          {event.status}
        </span>
      </div>

      <p className="mt-4 text-sm font-medium text-brown-700">{event.datesLabel}</p>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-nude-200/80 pt-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-brown-600/50">
            Brands
          </p>
          <p className="mt-1 text-lg font-medium text-brown-800">
            {event.brandsCount}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-brown-600/50">
            Collected
          </p>
          <p className="mt-1 text-lg font-medium text-brown-800">
            {formatCurrency(event.feesCollected)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-brown-600/50">
            Outstanding
          </p>
          <p className="mt-1 text-lg font-medium text-brown-800">
            {formatCurrency(event.outstandingBalance)}
          </p>
        </div>
      </div>

      <span className="mt-5 text-xs font-medium uppercase tracking-wider text-brown-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        View dashboard →
      </span>
    </Link>
  );
}
