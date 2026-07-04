import { formatDate } from "@/lib/events";

type MarketingItem = {
  id: number;
  task: string;
  due: Date;
  channel: string;
};

type MarketingDeadlinesProps = {
  city: string;
  items: MarketingItem[];
};

function daysUntil(due: Date): number {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function MarketingDeadlines({ city, items }: MarketingDeadlinesProps) {
  return (
    <section className="rounded-2xl border border-nude-300/50 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
      <div>
        <h3 className="font-[family-name:var(--font-display)] text-xl font-medium text-brown-800">
          Marketing deadlines
        </h3>
        <p className="mt-0.5 text-sm text-brown-600/60">
          Upcoming campaigns for {city}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 text-sm text-brown-600/60">
          No marketing deadlines yet. Add campaigns once dates are confirmed.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item) => {
            const days = daysUntil(item.due);
            const isPast = days < 0;
            const isUrgent = days >= 0 && days <= 7;

            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-nude-200/80 bg-nude-50/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-brown-800">
                    {item.task}
                  </p>
                  <p className="mt-0.5 text-xs text-brown-600/50">
                    {item.channel} · Due {formatDate(item.due)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isPast
                      ? "bg-nude-200 text-brown-600/60"
                      : isUrgent
                        ? "bg-brown-500/15 text-brown-700"
                        : "bg-white text-brown-600 ring-1 ring-nude-300/60"
                  }`}
                >
                  {isPast ? "Past due" : days === 0 ? "Today" : `${days}d left`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
