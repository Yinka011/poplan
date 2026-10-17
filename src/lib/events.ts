export type EventStatus = "Active" | "Planning" | "Completed";

export type EventSummary = {
  slug: string;
  name: string;
  city: string;
  datesLabel: string;
  status: EventStatus;
  brandsCount: number;
  feesCollected: number;
  outstandingBalance: number;
  startDate?: Date;
  endDate?: Date;
};

export const EVENTS: EventSummary[] = [
  {
    slug: "atlanta",
    name: "Atlanta Pop-up",
    city: "Atlanta",
    datesLabel: "Sep 12–13, 2026",
    status: "Active",
    brandsCount: 8,
    feesCollected: 2261.46,
    outstandingBalance: 939.54,
    startDate: new Date("2026-09-12T09:00:00"),
    endDate: new Date("2026-09-13T09:00:00"),
  },
  {
    slug: "houston",
    name: "Houston Pop-up",
    city: "Houston",
    datesLabel: "TBD",
    status: "Planning",
    brandsCount: 0,
    feesCollected: 0,
    outstandingBalance: 0,
  },
  {
    slug: "lagos",
    name: "Lagos Pop-up",
    city: "Lagos",
    datesLabel: "TBD",
    status: "Planning",
    brandsCount: 0,
    feesCollected: 0,
    outstandingBalance: 0,
  },
];

export function getEventBySlug(slug: string): EventSummary | undefined {
  return EVENTS.find((event) => event.slug === slug);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function getDaysToEvent(startDate: Date, from: Date = new Date()): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );
  return Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export function formatEventDateRange(event: EventSummary): string {
  if (!event.startDate || !event.endDate) return event.datesLabel;

  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(
    event.startDate,
  );
  const startDay = event.startDate.getDate();
  const endDay = event.endDate.getDate();
  const year = event.endDate.getFullYear();
  return `${month} ${startDay}–${endDay}, ${year}`;
}
