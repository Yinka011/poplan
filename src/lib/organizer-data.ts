export type PaymentStatus = "Paid" | "Partial" | "Pending" | "N/A";
export const organizerData = {
    name: "Yinka",
    event: "Atlanta",
    eventDate: "September 12-13, 2026",
    brandsConfirmed: 8,
    feesCollected: 2261.46,
    outstandingBalance: 939.54,
    brands: [
      { name: "Isaleekofromderin", feeOwed: 400, amountPaid: 200, balance: 200, status: "Partial" },
      { name: "Ciscacecil", feeOwed: 400, amountPaid: 400, balance: 0, status: "Paid" },
      { name: "Spice of Lagos", feeOwed: 400, amountPaid: 0, balance: 400, status: "Unpaid" },
      { name: "Jayda Woman", feeOwed: 400, amountPaid: 200.87, balance: 199.13, status: "Partial" },
      { name: "Ara Lagos", feeOwed: 400, amountPaid: 400, balance: 0, status: "Paid" },
      { name: "FSS", feeOwed: 400, amountPaid: 286.53, balance: 113.47, status: "Partial" },
      { name: "Ayabawoman", feeOwed: 400, amountPaid: 191.02, balance: 208.98, status: "Partial" },
      { name: "Cladini", feeOwed: 400, amountPaid: 382.04, balance: 17.96, status: "Partial" },
    ]
  };