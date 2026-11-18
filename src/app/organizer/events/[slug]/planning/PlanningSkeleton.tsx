const block = "rounded bg-[#e4ebe6]";

export default function PlanningSkeleton() {
  return (
    <div role="status" aria-label="Loading planning hub" className="w-full animate-pulse space-y-6">
      <div aria-hidden="true" className="space-y-3">
        <div className={`${block} h-4 w-28`} />
        <div className={`${block} h-8 w-48`} />
        <div className={`${block} h-4 w-72 max-w-full`} />
      </div>
      <div aria-hidden="true" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map(index => (
          <div key={index} className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-5">
            <div className={`${block} h-3 w-24 max-w-full`} />
            <div className={`${block} h-6 w-28 max-w-full`} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {[0, 1, 2].map(index => <div key={index} className={`${block} h-9 w-24 rounded-full`} />)}
        <div className={`${block} ml-auto h-9 w-16 rounded-full`} />
      </div>
      {[0, 1].map(group => (
        <div key={group} aria-hidden="true" className="space-y-3">
          <div className={`${block} h-3 w-24`} />
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map(index => (
              <div key={index} className="space-y-4 rounded-xl border border-[#e4ebe6] bg-white p-4">
                <div className={`${block} h-4 w-32 max-w-full`} />
                <div className={`${block} h-3 w-24 max-w-full`} />
                <div className={`${block} h-5 w-20 max-w-full`} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
