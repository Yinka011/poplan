const block = "rounded bg-[#e4ebe6]";

export default function EventsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading events"
      className="w-full animate-pulse space-y-8"
    >
      <div
        aria-hidden="true"
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div className="space-y-3">
          <div className={`${block} h-8 w-56`} />
          <div className={`${block} h-4 w-64`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className={`${block} h-9 w-20`} />
          <div className={`${block} h-9 w-28`} />
          <div className={`${block} h-9 w-36`} />
        </div>
      </div>

      <div aria-hidden="true" className="space-y-4">
        <div className={`${block} h-4 w-28`} />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="space-y-4 rounded-2xl border border-[#e4ebe6] bg-white p-6"
            >
              <div className="space-y-2">
                <div className={`${block} h-5 w-36`} />
                <div className={`${block} h-3 w-24`} />
                <div className={`${block} h-4 w-32`} />
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-[#f0f4f1] pt-4">
                {[0, 1, 2].map((column) => (
                  <div key={column} className="space-y-2">
                    <div className={`${block} h-3 w-16 max-w-full`} />
                    <div className={`${block} h-5 w-20 max-w-full`} />
                  </div>
                ))}
              </div>
              <div className={`${block} h-8 w-full`} />
            </div>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="space-y-4 w-[300px]">
        <div className={`${block} h-4 w-40`} />
        <div className="h-28 rounded-2xl border border-[#e4ebe6] bg-white p-6">
          <div className={`${block} h-4 w-48`} />
        </div>
      </div>
    </div>
  );
}
