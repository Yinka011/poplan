export const EVENT = {
  city: "Atlanta",
  date: new Date("2026-09-12T09:00:00"),
};

export const STATS = {
  brandsConfirmed: 8,
  feesCollected: 2261,
  outstandingBalance: 939,
};

export const PAYMENTS = [
  {
    brand: "Golden Hour Co.",
    feeOwed: 400,
    amountPaid: 400,
    balance: 0,
    status: "Paid" as const,
  },
  {
    brand: "Elm Street Bakery",
    feeOwed: 400,
    amountPaid: 400,
    balance: 0,
    status: "Paid" as const,
  },
  {
    brand: "Coastal Threads",
    feeOwed: 400,
    amountPaid: 261,
    balance: 139,
    status: "Partial" as const,
  },
  {
    brand: "Bloom & Co.",
    feeOwed: 400,
    amountPaid: 400,
    balance: 0,
    status: "Paid" as const,
  },
  {
    brand: "Terra Home",
    feeOwed: 400,
    amountPaid: 400,
    balance: 0,
    status: "Paid" as const,
  },
  {
    brand: "Lumière Skincare",
    feeOwed: 400,
    amountPaid: 400,
    balance: 0,
    status: "Paid" as const,
  },
  {
    brand: "Drift Coffee",
    feeOwed: 400,
    amountPaid: 0,
    balance: 400,
    status: "Pending" as const,
  },
  {
    brand: "Sage Studios",
    feeOwed: 400,
    amountPaid: 0,
    balance: 400,
    status: "Pending" as const,
  },
];

export const CHECKLIST = [
  { id: 1, label: "Confirm venue contract & insurance", done: true },
  { id: 2, label: "Send final vendor layout map", done: true },
  { id: 3, label: "Order signage and wayfinding", done: false },
  { id: 4, label: "Book security & first-aid staff", done: false },
  { id: 5, label: "Finalize load-in schedule", done: false },
  { id: 6, label: "Publish attendee FAQ page", done: false },
];

export const MARKETING_DEADLINES = [
  {
    id: 1,
    task: "Instagram launch campaign",
    due: new Date("2026-07-18"),
    channel: "Social",
  },
  {
    id: 2,
    task: "Influencer partnership posts",
    due: new Date("2026-08-01"),
    channel: "Social",
  },
  {
    id: 3,
    task: "Email blast — early bird reminder",
    due: new Date("2026-08-10"),
    channel: "Email",
  },
  {
    id: 4,
    task: "Press release to local media",
    due: new Date("2026-08-22"),
    channel: "PR",
  },
  {
    id: 5,
    task: "Final countdown stories & reels",
    due: new Date("2026-09-05"),
    channel: "Social",
  },
];

export function getDaysToEvent(from: Date = new Date()): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(
    EVENT.date.getFullYear(),
    EVENT.date.getMonth(),
    EVENT.date.getDate(),
  );
  return Math.max(
    0,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}
