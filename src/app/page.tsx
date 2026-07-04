import { LoginCard } from "@/components/LoginCard";
import { PoplanLogo } from "@/components/PoplanLogo";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-nude-100 via-nude-50 to-nude-200"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full bg-brown-500/8 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full bg-nude-300/40 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <PoplanLogo />

        <p className="mt-4 text-center text-sm font-medium tracking-wide text-brown-600/80">
          Pop-up planning, beautifully simple
        </p>

        <h2 className="mt-12 text-center font-[family-name:var(--font-display)] text-xl font-medium text-brown-700">
          Welcome back
        </h2>
        <p className="mt-1 text-center text-sm text-brown-600/70">
          Choose how you&apos;d like to sign in
        </p>

        <div className="mt-8 w-full space-y-4">
          <LoginCard
            href="/login/organizer"
            title="Login as Pop-up Organizer"
            description="Create and manage your pop-up events, vendors, and schedules."
            icon="organizer"
          />
          <LoginCard
            href="/login/brand"
            title="Login as Brand"
            description="Manage multiple pop-up locations, teams, and brand presence."
            icon="brand"
          />
        </div>

        <p className="mt-10 text-center text-xs text-brown-600/60">
          New to POPLAN?{" "}
          <a
            href="#"
            className="font-medium text-brown-600 underline-offset-4 transition-colors hover:text-brown-700 hover:underline"
          >
            Request access
          </a>
        </p>
      </div>
    </main>
  );
}
