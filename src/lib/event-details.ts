import type { PaymentStatus } from "@/lib/organizer-data";

export type EventDetail = {
  payments: {
    brand: string;
    feeOwed: number;
    amountPaid: number;
    balance: number;
    status: PaymentStatus;
  }[];
  checklist: { id: number; label: string; done: boolean }[];
  marketingDeadlines: {
    id: number;
    task: string;
    due: Date;
    channel: string;
  }[];
};

export const ATLANTA_DETAIL: EventDetail = {
  payments: [
    {
      brand: "Isaleekofromderin",
      feeOwed: 400,
      amountPaid: 200,
      balance: 200,
      status: "Partial",
    },
    {
      brand: "Ciscacecil",
      feeOwed: 400,
      amountPaid: 400,
      balance: 0,
      status: "Paid",
    },
    {
      brand: "Spice of Lagos",
      feeOwed: 0,
      amountPaid: 0,
      balance: 0,
      status: "N/A",
    },
    {
      brand: "Jayda Woman",
      feeOwed: 400,
      amountPaid: 200.87,
      balance: 199.13,
      status: "Partial",
    },
    {
      brand: "Ara Lagos",
      feeOwed: 400,
      amountPaid: 400,
      balance: 0,
      status: "Paid",
    },
    {
      brand: "FSS",
      feeOwed: 400,
      amountPaid: 286.53,
      balance: 113.47,
      status: "Partial",
    },
    {
      brand: "Ayabawoman",
      feeOwed: 400,
      amountPaid: 191.02,
      balance: 208.98,
      status: "Partial",
    },
    {
      brand: "Cladini",
      feeOwed: 400,
      amountPaid: 382.04,
      balance: 17.96,
      status: "Partial",
    },
    {
      brand: "Lola Signatures",
      feeOwed: 300,
      amountPaid: 291.03,
      balance: 8.97,
      status: "Partial",
    },
  ],
  checklist: [
    { id: 1, label: "Confirm venue contract & insurance", done: true },
    { id: 2, label: "Send final vendor layout map", done: true },
    { id: 3, label: "Order signage and wayfinding", done: false },
    { id: 4, label: "Book security & first-aid staff", done: false },
    { id: 5, label: "Finalize load-in schedule", done: false },
    { id: 6, label: "Publish attendee FAQ page", done: false },
  ],
  marketingDeadlines: [
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
  ],
};

export const PLANNING_DETAIL: EventDetail = {
  payments: [],
  checklist: [
    { id: 1, label: "Secure venue location", done: false },
    { id: 2, label: "Set event dates", done: false },
    { id: 3, label: "Open brand applications", done: false },
    { id: 4, label: "Draft marketing plan", done: false },
  ],
  marketingDeadlines: [],
};

export function getEventDetail(slug: string): EventDetail {
  if (slug === "atlanta") return ATLANTA_DETAIL;
  return PLANNING_DETAIL;
}
