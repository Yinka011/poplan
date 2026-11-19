"use client";

type Props = {
  section: "overview" | "brands" | "checklist" | "marketing" | "announcements";
};

const block = "rounded bg-[#e4ebe6]";

export default function DashboardSkeleton({ section }: Props) {
  const isBrands = section === "brands";
  const isAnnouncements = section === "announcements";

  if (section === "overview") {
    return (
      <div role="status" aria-label="Loading event overview" className="w-full animate-pulse space-y-8">
        <div aria-hidden="true" className="space-y-3">
          <div className={`${block} h-4 w-24`} />
          <div className={`${block} h-9 w-56`} />
          <div className={`${block} h-4 w-32`} />
        </div>
        <div aria-hidden="true" className="grid grid-cols-2 gap-6 rounded-2xl bg-[#1B3A2D] p-7 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-3">
              <div className="h-3 w-24 max-w-full rounded bg-[#4a6b5b]" />
              <div className="h-8 w-12 max-w-full rounded bg-[#4a6b5b]" />
              <div className="h-3 w-20 max-w-full rounded bg-[#4a6b5b]" />
            </div>
          ))}
        </div>
        <div aria-hidden="true" className="space-y-3 rounded-xl border border-[#e4ebe6] bg-white p-5">
          <div className={`${block} h-3 w-28`} />
          <div className={`${block} h-4 w-48`} />
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={`Loading ${section}`}
      className="w-full animate-pulse rounded-2xl border border-[#e4ebe6] bg-white p-6"
    >
      <div aria-hidden="true">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className={`${block} h-4 w-32`} />
            {isAnnouncements && <div className={`${block} h-3 w-48`} />}
          </div>
          <div className={`${block} h-8 w-20`} />
        </div>

        {!isBrands && !isAnnouncements && (
          <div className="mb-5 space-y-3">
            <div className={`${block} h-3 w-24`} />
            <div className={`${block} h-1 w-full`} />
            {section === "checklist" && <div className={`${block} h-6 w-40`} />}
          </div>
        )}

        <div className="space-y-3">
          {Array.from({ length: isBrands ? 4 : 3 }, (_, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 ${isAnnouncements ? "rounded-xl border border-[#e4ebe6] p-4" : "border-b border-[#f0f4f1] pb-3"}`}
            >
              {!isBrands && !isAnnouncements && <div className={`${block} h-4 w-4 shrink-0`} />}
              <div className="flex-1 space-y-2">
                <div className={`${block} h-3 ${isBrands ? "w-2/5" : "w-3/4"}`} />
                {isAnnouncements && <div className={`${block} h-3 w-1/2`} />}
              </div>
              {isBrands && <div className={`${block} h-5 w-16`} />}
              {isBrands && <div className={`${block} hidden h-4 w-16 sm:block`} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
