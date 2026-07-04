type ChecklistItem = {
  id: number;
  label: string;
  done: boolean;
};

type ChecklistProps = {
  items: ChecklistItem[];
};

export function Checklist({ items }: ChecklistProps) {
  const completed = items.filter((item) => item.done).length;

  return (
    <section className="rounded-2xl border border-nude-300/50 bg-white/70 p-6 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-medium text-brown-800">
            Event checklist
          </h3>
          <p className="mt-0.5 text-sm text-brown-600/60">
            {completed} of {items.length} complete
          </p>
        </div>
        {items.length > 0 && (
          <div className="h-2 w-24 overflow-hidden rounded-full bg-nude-200">
            <div
              className="h-full rounded-full bg-brown-500 transition-all"
              style={{ width: `${(completed / items.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                item.done
                  ? "border-brown-500 bg-brown-500 text-white"
                  : "border-nude-300 bg-white"
              }`}
              aria-hidden
            >
              {item.done && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="h-3 w-3"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </span>
            <span
              className={`text-sm leading-relaxed ${
                item.done
                  ? "text-brown-600/50 line-through"
                  : "text-brown-800"
              }`}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
