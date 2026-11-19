const block = "rounded bg-[#e4ebe6]";

export default function SalesSkeleton() {
  return (
    <div role="status" aria-label="Loading sales and payouts" className="w-full animate-pulse space-y-6">
      <div aria-hidden="true" className="space-y-4 rounded-[14px] border border-[#e4ebe6] bg-white p-6">
        <div className={`${block} h-3 w-44`} />
        <div className="flex flex-wrap items-end gap-3">
          {[0, 1].map(index => (
            <div key={index} className="space-y-2">
              <div className={`${block} h-3 w-10`} />
              <div className={`${block} h-9 w-36`} />
            </div>
          ))}
          <div className={`${block} h-9 w-40`} />
        </div>
      </div>

      <div aria-hidden="true" className="grid grid-cols-2 gap-6 rounded-[14px] bg-[#1B3A2D] px-8 py-6 sm:grid-cols-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="space-y-3">
            <div className="h-3 w-24 max-w-full rounded bg-[#4a6b5b]" />
            <div className="h-7 w-20 max-w-full rounded bg-[#4a6b5b]" />
          </div>
        ))}
      </div>

      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[14px] border border-[#e4ebe6] bg-white p-6">
          <div className={`${block} h-3 w-36`} />
          <div className="mx-auto my-6 h-40 w-40 rounded-full border-[28px] border-[#e4ebe6]" />
        </div>
        <div className="rounded-[14px] border border-[#e4ebe6] bg-white p-6">
          <div className={`${block} mb-8 h-3 w-36`} />
          <div className="space-y-5">
            {["w-3/4", "w-2/3", "w-1/2", "w-1/3"].map(width => (
              <div key={width} className={`${block} h-5 ${width}`} />
            ))}
          </div>
        </div>
      </div>

      {[0, 1].map(index => (
        <div key={index} aria-hidden="true" className="space-y-4 rounded-[14px] border border-[#e4ebe6] bg-white p-5">
          <div className={`${block} h-4 w-32`} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[0, 1, 2].map(column => (
              <div key={column} className="space-y-2">
                <div className={`${block} h-3 w-20`} />
                <div className={`${block} h-5 w-16`} />
              </div>
            ))}
          </div>
          <div className={`${block} h-8 w-full`} />
        </div>
      ))}
    </div>
  );
}
