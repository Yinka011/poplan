const block = "rounded bg-[#e4ebe6]";

export default function AttendeesSkeleton() {
  return (
    <div role="status" aria-label="Loading attendees" className="w-full animate-pulse space-y-6">
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-5">
            <div className={`${block} mx-auto h-7 w-14`} />
            <div className={`${block} mx-auto h-3 w-24 max-w-full`} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        <div className={`${block} h-9 min-w-32 flex-1`} />
        <div className={`${block} h-9 w-28`} />
        <div className={`${block} h-9 w-28`} />
      </div>
      <div aria-hidden="true" className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-4">
        <div className={`${block} h-5 w-full`} />
        {[0, 1, 2, 3].map(index => <div key={index} className={`${block} h-10 w-full`} />)}
      </div>
    </div>
  );
}
