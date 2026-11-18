const block = "rounded bg-[#e4ebe6]";

export default function InventorySkeleton() {
  return (
    <div role="status" aria-label="Loading inventory" className="w-full animate-pulse space-y-6">
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-5">
            <div className={`${block} h-7 w-24 max-w-full`} />
            <div className={`${block} h-3 w-20 max-w-full`} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        <div className={`${block} h-9 w-64 max-w-full`} />
        <div className={`${block} h-9 w-32`} />
        <div className={`${block} h-9 w-32`} />
      </div>
      <div aria-hidden="true" className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-4">
            <div className={`${block} h-4 w-28`} />
            <div className={`${block} h-3 w-full`} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-4">
        <div className={`${block} h-5 w-full`} />
        {[0, 1, 2, 3].map((index) => <div key={index} className={`${block} h-10 w-full`} />)}
      </div>
    </div>
  );
}
