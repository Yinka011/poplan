export default function PageSkeleton({ label = "Loading page" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="mx-auto w-full max-w-[900px] animate-pulse space-y-6 p-6">
      <div aria-hidden="true" className="space-y-3">
        <div className="h-7 w-48 max-w-full rounded bg-[#e4ebe6]" />
        <div className="h-4 w-64 max-w-full rounded bg-[#e4ebe6]" />
      </div>
      <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="space-y-4 rounded-xl border border-[#e4ebe6] bg-white p-6">
            <div className="h-5 w-36 max-w-full rounded bg-[#e4ebe6]" />
            <div className="h-8 w-full rounded bg-[#e4ebe6]" />
            <div className="h-4 w-3/4 rounded bg-[#e4ebe6]" />
          </div>
        ))}
      </div>
    </div>
  );
}
