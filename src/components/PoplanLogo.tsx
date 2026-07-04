export function PoplanLogo() {
  return (
    <div className="flex flex-col items-center">
      <h1
        className="font-[family-name:var(--font-display)] text-5xl font-semibold tracking-[0.35em] text-brown-800 sm:text-6xl"
        style={{ letterSpacing: "0.35em", marginRight: "-0.35em" }}
      >
        POPLAN
      </h1>
      <div className="mt-3 h-px w-16 bg-gradient-to-r from-transparent via-brown-500/50 to-transparent" />
    </div>
  );
}
