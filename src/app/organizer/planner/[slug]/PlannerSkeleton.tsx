const block = "rounded bg-[#e4ebe6]";

export default function PlannerSkeleton() {
  return (
    <div role="status" aria-label="Loading planner dashboard" className="w-full animate-pulse space-y-6">
      <div aria-hidden="true" className="grid grid-cols-1 gap-6 rounded-2xl bg-[#1B3A2D] p-8 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="space-y-3">
            <div className="h-3 w-20 max-w-full rounded bg-[#4a6b5b]" />
            <div className="h-7 w-24 max-w-full rounded bg-[#4a6b5b]" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
        {[0, 1].map(index => (
          <div key={index} className="space-y-4 rounded-xl border border-[#e4ebe6] bg-white p-6">
            <div className={`${block} h-4 w-36`} />
            {[0, 1, 2].map(row => <div key={row} className={`${block} h-8 w-full`} />)}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="space-y-4 rounded-xl border border-[#e4ebe6] bg-white p-6">
        <div className={`${block} h-4 w-36`} />
        {[0, 1, 2].map(row => <div key={row} className={`${block} h-10 w-full`} />)}
      </div>
    </div>
  );
}
