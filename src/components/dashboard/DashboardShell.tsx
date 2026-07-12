"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  const [open, setOpen] = useState(false);

  const navItems = [
    { label: "Overview", href: `/login/organizer/events/${slug}` },
    { label: "Brand Tasks", href: `/login/organizer/events/${slug}/tasks` },
    { label: "Expenses", href: `/login/organizer/events/${slug}/expenses` },
    { label: "Planning Hub", href: `/login/organizer/events/${slug}/planning` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>

      {/* Top bar */}
      <div style={{ background: "#2c1810", padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky" as const, top: 0, zIndex: 20 }}>
        <button
          onClick={() => setOpen(!open)}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column" as const, gap: "5px" }}
        >
          <span style={{ display: "block", width: "20px", height: "1.5px", background: open ? "#b87333" : "#c8b89a", transition: "all 0.2s", transform: open ? "rotate(45deg) translate(4.5px, 4.5px)" : "none" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: open ? "transparent" : "#c8b89a", transition: "all 0.2s" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: open ? "#b87333" : "#c8b89a", transition: "all 0.2s", transform: open ? "rotate(-45deg) translate(4.5px, -4.5px)" : "none" }} />
        </button>
        <Link href="/login/organizer/events" style={{ textDecoration: "none" }}>
          <div style={{ fontSize: "1.1rem", letterSpacing: "0.15em", color: "#fff", fontFamily: "Georgia, serif" }}>POPLAN</div>
        </Link>
        {event && (
          <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#c8b89a" }}>{event.name}</div>
        )}
      </div>

      {/* Sidebar overlay */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed" as const, inset: 0, background: "#00000044", zIndex: 15 }}
        />
      )}

      {/* Sidebar drawer */}
      <div style={{
        position: "fixed" as const,
        top: 0,
        left: 0,
        bottom: 0,
        width: "220px",
        background: "#2c1810",
        zIndex: 16,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        display: "flex",
        flexDirection: "column" as const,
        paddingTop: "60px",
      }}>
        {event && (
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "4px" }}>CURRENT EVENT</div>
            <div style={{ fontSize: "0.9rem", color: "#fff" }}>{event.name}</div>
          </div>
        )}

        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {navItems.map(item => {
            const isActive = pathname === item.href;
            return (
              
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
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
          <Link href="/login/organizer/events" style={{ fontSize: "0.8rem", color: "#c8b89a", textDecoration: "none", display: "block", marginBottom: "6px" }} onClick={() => setOpen(false)}>All events</Link>
          <Link href="/" style={{ fontSize: "0.8rem", color: "#c8b89a66", textDecoration: "none" }} onClick={() => setOpen(false)}>Sign out</Link>
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: "2rem 2.5rem" }}>
        {children}
      </div>

    </div>
  );
}