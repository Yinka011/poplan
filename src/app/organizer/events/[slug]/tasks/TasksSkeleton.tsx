const block = "rounded bg-[#e4ebe6]";

export default function TasksSkeleton() {
  return (
    <div role="status" aria-label="Loading brand tasks" className="w-full animate-pulse">
      <div aria-hidden="true" className="mb-6 space-y-3">
        <div className={`${block} h-4 w-28`} />
        <div className={`${block} h-8 w-64 max-w-full`} />
        <div className={`${block} h-4 w-80 max-w-full`} />
      </div>
      <div aria-hidden="true" className="mb-6 rounded-2xl border border-[#e4ebe6] bg-white p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className={`${block} h-5 w-20`} />
          <div className={`${block} h-8 w-24`} />
        </div>
        {[0, 1].map(group => (
          <div key={group} className="mb-5 space-y-2 last:mb-0">
            <div className={`${block} h-3 w-28`} />
            {[0, 1].map(row => (
              <div key={row} className="flex items-center justify-between gap-4 rounded-[10px] border border-[#f0f4f1] bg-[#f8faf8] p-3">
                <div className="flex-1 space-y-2">
                  <div className={`${block} h-4 w-48 max-w-full`} />
                  <div className={`${block} h-3 w-28`} />
                </div>
                <div className={`${block} h-6 w-12`} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="space-y-3 rounded-xl border border-[#e4ebe6] bg-[#fdf8f3] p-5">
        <div className={`${block} h-4 w-28`} />
        <div className={`${block} h-3 w-full`} />
        <div className={`${block} h-3 w-3/4`} />
      </div>
    </div>
  );
}
