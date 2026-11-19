const block = "rounded bg-[#e4ebe6]";

export default function MessagesSkeleton() {
  return (
    <div role="status" aria-label="Loading messages" className="w-full animate-pulse overflow-hidden rounded-[14px] border border-[#e4ebe6] bg-white">
      <div aria-hidden="true" className="grid min-h-[520px] grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)]">
        <div className="max-h-64 space-y-4 overflow-hidden border-r border-[#e4ebe6] bg-[#f8faf8] p-4 sm:max-h-none">
          <div className={`${block} h-3 w-16`} />
          <div className={`${block} h-9 w-full`} />
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="space-y-2 border-b border-[#e4ebe6] pb-4">
              <div className={`${block} h-4 w-28 max-w-full`} />
              <div className={`${block} h-3 w-full`} />
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="border-b border-[#e4ebe6] p-4"><div className={`${block} h-4 w-40 max-w-full`} /></div>
          <div className="flex-1 space-y-5 p-4">
            {[0, 1, 2].map(index => <div key={index} className={`${block} h-12 w-2/3 ${index === 1 ? "ml-auto" : ""}`} />)}
          </div>
          <div className="flex gap-2 border-t border-[#e4ebe6] p-4">
            <div className={`${block} h-10 flex-1`} />
            <div className={`${block} h-10 w-16`} />
          </div>
        </div>
      </div>
    </div>
  );
}
