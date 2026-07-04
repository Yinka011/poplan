"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [{ href: "/login/organizer/events", label: "Events" }];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-nude-200/80 text-brown-800"
                : "text-brown-600/70 hover:bg-nude-100 hover:text-brown-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
