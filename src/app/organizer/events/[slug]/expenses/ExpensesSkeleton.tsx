const block = "rounded bg-[#e4ebe6]";

export default function ExpensesSkeleton() {
  return (
    <div role="status" aria-label="Loading expenses" className="w-full animate-pulse space-y-6">
      <div aria-hidden="true" className="space-y-3">
        <div className={`${block} h-4 w-28`} />
        <div className={`${block} h-8 w-40`} />
        <div className={`${block} h-4 w-64 max-w-full`} />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-5">
            <div className={`${block} h-3 w-24 max-w-full`} />
            <div className={`${block} h-6 w-28 max-w-full`} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="space-y-4 rounded-xl border border-[#e4ebe6] bg-white p-5">
        <div className={`${block} h-3 w-36`} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[0, 1, 2].map(index => (
            <div key={index} className="space-y-2 rounded-lg bg-[#f8faf8] p-4">
              <div className={`${block} h-3 w-16 max-w-full`} />
              <div className={`${block} h-5 w-20 max-w-full`} />
            </div>
          ))}
        </div>
        <div className={`${block} h-4 w-full`} />
      </div>
      <div aria-hidden="true" className="space-y-4 rounded-xl border border-[#e4ebe6] bg-white p-5">
        <div className={`${block} h-4 w-28`} />
        {[0, 1, 2].map(index => <div key={index} className={`${block} h-9 w-full`} />)}
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 rounded-xl bg-[#1B3A2D] p-6 md:grid-cols-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="space-y-3">
            <div className="h-3 w-20 max-w-full rounded bg-[#4a6b5b]" />
            <div className="h-5 w-24 max-w-full rounded bg-[#4a6b5b]" />
          </div>
        ))}
      </div>
    </div>
  );
}
