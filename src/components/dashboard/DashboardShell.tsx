"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type DashboardShellProps = {
  children: React.ReactNode;
  event?: {
    name: string;
    slug: string;
    city: string;
  };
};

export function DashboardShell({ children, event }: DashboardShellProps) {
  const pathname = usePathname();
  const slug = event?.slug || pathname.split("/")[5] || "atlanta";

  const navItems = [
    { label: "Overview", href: `/login/organizer/events/${slug}` },
    { label: "Expenses", href: `/login/organizer/events/${slug}/expenses` },
    { label: "Planning Hub", href: `/login/organizer/events/${slug}/planning` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", fontFamily: "Georgia, serif" }}>

      <div style={{ width: "220px", minHeight: "100vh", background: "#2c1810", display: "flex", flexDirection: "column" as const, flexShrink: 0, position: "fixed" as const, left: 0, top: 0, bottom: 0, zIndex: 10 }}>

        <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
          <Link href="/login/organizer/events" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: "1.3rem", letterSpacing: "0.15em", color: "#fff", fontFamily: "Georgia, serif" }}>POPLAN</div>
            <div style={{ width: "1.5rem", height: "1px", background: "#b87333", marginTop: "3px" }}></div>
          </Link>
        </div>

        {event && (
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "4px" }}>CURRENT EVENT</div>
            <div style={{ fontSize: "0.9rem", color: "#fff" }}>{event.name}</div>
            <div style={{ fontSize: "0.75rem", color: "#b87333", marginTop: "2px" }}>Sep 11–13, 2026</div>
          </div>
        )}

        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              
                key={item.label}
                href={item.href}
                style={{
                  display: "block",
                  padding: "10px 1.25rem",
                  fontSize: "0.85rem",
                  color: isActive ? "#fff" : "#c8b89a",
                  background: isActive ? "#3d2415" : "transparent",
                  textDecoration: "none",
                  borderLeft: isActive ? "2px solid #b87333" : "2px solid transparent",
                }}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #3d2415" }}>
          <div style={{ fontSize: "0.75rem", color: "#c8b89a", marginBottom: "8px" }}>AO Curates</div>
          <a href="/login/organizer/events" style={{ fontSize: "0.8rem", color: "#c8b89a", textDecoration: "none", display: "block", marginBottom: "6px" }}>All events</a>
          <a href="/" style={{ fontSize: "0.8rem", color: "#c8b89a66", textDecoration: "none" }}>Sign out</a>
        </div>

      </div>

      <div style={{ marginLeft: "220px", flex: 1, padding: "2rem 2.5rem" }}>
        {children}
      </div>

    </div>
  );
}