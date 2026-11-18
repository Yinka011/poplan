export default function GettingStartedSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading getting started progress"
      className="mb-8 w-full animate-pulse overflow-hidden rounded-2xl border border-[#e4ebe6] bg-white"
    >
      <div aria-hidden="true" className="flex items-center justify-between bg-[#1B3A2D] px-6 py-5">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-[#4a6b5b]" />
          <div className="h-4 w-40 rounded bg-[#4a6b5b]" />
        </div>
        <div className="h-7 w-14 rounded bg-[#4a6b5b]" />
      </div>
      <div aria-hidden="true" className="h-[3px] bg-[#e4ebe6]" />
      <div aria-hidden="true" className="px-6 pb-4 pt-2">
        {[0, 1, 2, 3, 4].map(index => (
          <div key={index} className="flex items-start gap-3 border-b border-[#f0f4f1] py-3 last:border-0">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#e4ebe6]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-44 max-w-full rounded bg-[#e4ebe6]" />
              <div className="h-3 w-3/4 rounded bg-[#e4ebe6]" />
            </div>
            <div className="h-3 w-6 rounded bg-[#e4ebe6]" />
          </div>
        ))}
      </div>
    </div>
  );
}
