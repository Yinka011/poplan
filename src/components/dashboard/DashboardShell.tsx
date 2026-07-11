"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PoplanLogo } from "@/components/PoplanLogo";

type DashboardShellProps = {
  children: React.ReactNode;
  event?: {
    name: string;
    slug: string;
    city: string;
  };
};

const navItems = (slug: string) => [
  { label: "Overview", href: `/login/organizer/events/${slug}`, icon: "▤" },
  { label: "Payment tracker", href: `/login/organizer/events/${slug}#payment`, icon: "◈" },
  { label: "Checklist", href: `/login/organizer/events/${slug}#checklist`, icon: "◻" },
  { label: "Marketing", href: `/login/organizer/events/${slug}#marketing`, icon: "◇" },
  { label: "Announcements", href: `/login/organizer/events/${slug}#announcements`, icon: "◉" },
  { label: "Expenses", href: `/login/organizer/events/${slug}/expenses`, icon: "◈" },
  { label: "Planning Hub", href: `/login/organizer/events/${slug}/planning`, icon: "◫" },
];

export function DashboardShell({ children, event }: DashboardShellProps) {
  const pathname = usePathname();
  const slug = event?.slug || pathname.split("/")[5] || "atlanta";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", fontFamily: "Georgia, serif" }}>

      {/* Sidebar */}
      <div style={{ width: "220px", minHeight: "100vh", background: "#2c1810", display: "flex", flexDirection: "column" as const, flexShrink: 0, position: "fixed" as const, left: 0, top: 0, bottom: 0, zIndex: 10 }}>

        {/* Logo */}
        <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
          <Link href="/login/organizer/events" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: "1.3rem", letterSpacing: "0.15em", color: "#fff", fontFamily: "Georgia, serif" }}>POPLAN</div>
            <div style={{ width: "1.5rem", height: "1px", background: "#b87333", marginTop: "3px" }}></div>
          </Link>
        </div>

        {/* Event info */}
        {event && (
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "4px" }}>CURRENT EVENT</div>
            <div style={{ fontSize: "0.9rem", color: "#fff" }}>{event.name}</div>
            <div style={{ fontSize: "0.75rem", color: "#b87333", marginTop: "2px" }}>Sep 11–13, 2026</div>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {navItems(slug).map(item => {
            const isActive = pathname === item.href;
            return (
              
                key={item.label}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 1.25rem",
                  fontSize: "0.85rem",
                  color: isActive ? "#fff" : "#c8b89a",
                  background: isActive ? "#3d2415" : "transparent",
                  textDecoration: "none",
                  borderLeft: isActive ? "2px solid #b87333" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "#3d241566";
                    e.currentTarget.style.color = "#fff";
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#c8b89a";
                  }
                }}
              >
                <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>{item.icon}</span>
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #3d2415" }}>
          <div style={{ fontSize: "0.75rem", color: "#c8b89a", marginBottom: "8px" }}>AO Curates</div>
          <a href="/login/organizer/events" style={{ fontSize: "0.8rem", color: "#c8b89a", textDecoration: "none", display: "block", marginBottom: "6px" }}>← All events</a>
          <a href="/" style={{ fontSize: "0.8rem", color: "#c8b89a66", textDecoration: "none" }}>Sign out</a>
        </div>

      </div>

      {/* Main content */}
      <div style={{ marginLeft: "220px", flex: 1, padding: "2rem 2.5rem", maxWidth: "calc(100% - 220px)" }}>
        {children}
      </div>

    </div>
  );
}