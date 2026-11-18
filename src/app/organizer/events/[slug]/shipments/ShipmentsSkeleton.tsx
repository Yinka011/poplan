const block = "rounded bg-[#e4ebe6]";

export default function ShipmentsSkeleton() {
  return (
    <div role="status" aria-label="Loading shipments" className="w-full animate-pulse space-y-6">
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-5">
            <div className={`${block} mx-auto h-7 w-12`} />
            <div className={`${block} mx-auto h-3 w-16 max-w-full`} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="space-y-2">
        <div className={`${block} h-3 w-36`} />
        {[0, 1].map(index => (
          <div key={index} className="flex items-center justify-between gap-4 rounded-xl border border-[#e4ebe6] bg-white p-5">
            <div className="flex-1 space-y-2">
              <div className={`${block} h-4 w-36 max-w-full`} />
              <div className={`${block} h-3 w-24 max-w-full`} />
            </div>
            <div className={`${block} h-6 w-20`} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {[0, 1, 2, 3].map(index => <div key={index} className={`${block} h-8 w-20 rounded-full`} />)}
      </div>
      {[0, 1].map(index => (
        <div key={index} aria-hidden="true" className="flex items-center justify-between gap-4 rounded-xl border border-[#e4ebe6] bg-white p-5">
          <div className="flex-1 space-y-2">
            <div className={`${block} h-4 w-44 max-w-full`} />
            <div className={`${block} h-3 w-28 max-w-full`} />
          </div>
          <div className={`${block} h-7 w-24`} />
        </div>
      ))}
    </div>
  );
}
