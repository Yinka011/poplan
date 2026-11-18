const block = "rounded bg-[#e4ebe6]";

export default function PaymentTrackerSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading payment tracker"
      className="w-full animate-pulse rounded-2xl border border-[#e4ebe6] bg-white p-6"
    >
      <div aria-hidden="true">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className={`${block} h-5 w-36`} />
            <div className={`${block} h-3 w-44`} />
          </div>
          <div className={`${block} h-8 w-24`} />
        </div>
        <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {[0, 1, 2].map(index => (
            <div key={index} className="space-y-2 rounded-[10px] border border-[#f0f4f1] bg-[#f8faf8] p-3">
              <div className={`${block} h-3 w-20 max-w-full`} />
              <div className={`${block} h-5 w-24 max-w-full`} />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3 border-b border-[#e4ebe6] pb-3 sm:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map(index => (
              <div key={index} className={`${block} h-3 w-full ${index > 3 ? "hidden sm:block" : ""}`} />
            ))}
          </div>
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="grid grid-cols-4 gap-3 border-b border-[#f0f4f1] pb-3 sm:grid-cols-6">
              {[0, 1, 2, 3, 4, 5].map(column => (
                <div key={column} className={`${block} h-4 w-full ${column > 3 ? "hidden sm:block" : ""}`} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
