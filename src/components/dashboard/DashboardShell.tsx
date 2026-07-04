import Link from "next/link";
import { PoplanLogo } from "@/components/PoplanLogo";

type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-nude-50">
      <header className="border-b border-nude-200/80 bg-white/60 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/login/organizer" className="scale-75 origin-left">
            <PoplanLogo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-brown-600/70 sm:inline">
              Organizer
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brown-500/15 text-sm font-semibold text-brown-700">
              Y
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
