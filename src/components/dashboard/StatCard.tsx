type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-nude-300/50 bg-white/70 p-5 shadow-sm backdrop-blur-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-brown-600/60">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium text-brown-800">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-brown-600/50">{hint}</p>
      )}
    </div>
  );
}
