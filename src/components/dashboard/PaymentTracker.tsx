import { PAYMENTS, formatCurrency } from "@/lib/organizer-data";

const STATUS_STYLES = {
  Paid: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  Partial: "bg-amber-50 text-amber-700 ring-amber-600/15",
  Pending: "bg-nude-100 text-brown-600 ring-brown-500/10",
} as const;

export function PaymentTracker() {
  return (
    <section className="rounded-2xl border border-nude-300/50 bg-white/70 shadow-sm backdrop-blur-sm">
      <div className="border-b border-nude-200/80 px-6 py-4">
        <h3 className="font-[family-name:var(--font-display)] text-xl font-medium text-brown-800">
          Payment tracker
        </h3>
        <p className="mt-0.5 text-sm text-brown-600/60">
          Brand fees for Atlanta pop-up
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-nude-200/80 text-xs uppercase tracking-wider text-brown-600/50">
              <th className="px-6 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Fee owed</th>
              <th className="px-4 py-3 font-medium">Amount paid</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nude-200/60">
            {PAYMENTS.map((row) => (
              <tr
                key={row.brand}
                className="transition-colors hover:bg-nude-50/80"
              >
                <td className="px-6 py-3.5 font-medium text-brown-800">
                  {row.brand}
                </td>
                <td className="px-4 py-3.5 text-brown-700">
                  {formatCurrency(row.feeOwed)}
                </td>
                <td className="px-4 py-3.5 text-brown-700">
                  {formatCurrency(row.amountPaid)}
                </td>
                <td className="px-4 py-3.5 text-brown-700">
                  {formatCurrency(row.balance)}
                </td>
                <td className="px-6 py-3.5">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
