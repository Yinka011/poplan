"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useOrganizer } from "@/context/OrganizerContext";
import { DEFAULT_FEATURES, resolveProfileFeatures } from "@/lib/features";
import LoadingView from "@/components/LoadingView";

type DashboardShellProps = {
  children: React.ReactNode;
  event?: {
    name: string;
    slug: string;
    city: string;
  };
  hideSideNav?: boolean;
};

export function DashboardShell({
  children,
  event,
  hideSideNav = false,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { organizerEmail, organizerName } = useOrganizer();
  const slug = event?.slug || pathname.split("/")[3] || "";
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const signingOutRef = useRef(false);

  const [features, setFeatures] = useState(DEFAULT_FEATURES);
  const [featuresLoading, setFeaturesLoading] = useState(!hideSideNav);
  const [featuresError, setFeaturesError] = useState("");
  const [featuresRetry, setFeaturesRetry] = useState(0);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(Boolean(session));
      if (!session && !signingOutRef.current) router.replace("/login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/login";
    } catch (error) {
      console.error("Failed to sign out:", error);
      alert("Could not sign out. Please try again.");
      signingOutRef.current = false;
      setSigningOut(false);
    }
  };

  useEffect(() => {
    if (hideSideNav) return;
    let active = true;
    const fetchFeatures = async () => {
      setFeaturesLoading(true);
      setFeaturesError("");
      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!session?.user)
          throw new Error("Please sign in to view dashboard features.");
        const { data, error } = await supabase
          .from("profiles")
          .select("default_features")
          .eq("id", session.user.id)
          .maybeSingle();
        if (error) throw error;
        const resolved = resolveProfileFeatures(data?.default_features);
        if (active) setFeatures(resolved);
      } catch (error) {
        console.error("Could not load dashboard features:", error);
        if (active)
          setFeaturesError(
            "Could not load dashboard features. Please try again.",
          );
      } finally {
        if (active) setFeaturesLoading(false);
      }
    };
    void fetchFeatures();
    return () => {
      active = false;
    };
  }, [slug, hideSideNav, featuresRetry]);

  const isEnabled = (key: string) => features[key] !== false;

  const navItems = [
    { label: "Overview", href: `/organizer/events/${slug}` },
    ...(isEnabled("brands")
      ? [
          {
            label: "Brand Tasks",
            href: `/organizer/events/${slug}/tasks`,
          },
        ]
      : []),
    { label: "Expenses", href: `/organizer/events/${slug}/expenses` },
    ...(isEnabled("planning")
      ? [
          {
            label: "Planning Hub",
            href: `/organizer/events/${slug}/planning`,
          },
        ]
      : []),
    ...(isEnabled("inventory")
      ? [
          {
            label: "Inventory",
            href: `/organizer/events/${slug}/inventory`,
          },
        ]
      : []),
    ...(isEnabled("shipments")
      ? [
          {
            label: "Shipments",
            href: `/organizer/events/${slug}/shipments`,
          },
        ]
      : []),
    ...(isEnabled("messages")
      ? [
          {
            label: "Messages",
            href: `/organizer/events/${slug}/messages`,
          },
        ]
      : []),
    ...(isEnabled("sales")
      ? [
          {
            label: "Sales & Payouts",
            href: `/organizer/events/${slug}/sales`,
          },
        ]
      : []),
    ...(isEnabled("payment_tracker")
      ? [
          {
            label: "Payments",
            href: `/organizer/events/${slug}/payments`,
          },
        ]
      : []),
    ...(isEnabled("attendees")
      ? [
          {
            label: "Attendees",
            href: `/organizer/events/${slug}/attendees`,
          },
        ]
      : []),
    {
      label: "Applications",
      href: `/organizer/events/${slug}/applications`,
    },
    { label: "⚙ Settings", href: `/organizer/events/${slug}/settings` },
  ];

  if (!authenticated) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center bg-[#f8faf8] text-[#4a5a52]"
      >
        Loading...
      </div>
    );
  }

  if (!hideSideNav && (featuresLoading || featuresError)) {
    return (
      <LoadingView
        screen
        loading={featuresLoading}
        error={featuresError}
        onRetry={() => setFeaturesRetry((value) => value + 1)}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8faf8",
      }}
    >
      <div
        style={{
          background: "#1B3A2D",
          padding: "0.85rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        {!hideSideNav && (
          <button
            onClick={() => setOpen(!open)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            <span
              style={{
                display: "block",
                width: "20px",
                height: "1.5px",
                background: open ? "#E8C97A" : "#d4c87a",
                transition: "all 0.2s",
                transform: open
                  ? "rotate(45deg) translate(4.5px, 4.5px)"
                  : "none",
              }}
            />
            <span
              style={{
                display: "block",
                width: "20px",
                height: "1.5px",
                background: open ? "transparent" : "#d4c87a",
                transition: "all 0.2s",
              }}
            />
            <span
              style={{
                display: "block",
                width: "20px",
                height: "1.5px",
                background: open ? "#E8C97A" : "#d4c87a",
                transition: "all 0.2s",
                transform: open
                  ? "rotate(-45deg) translate(4.5px, -4.5px)"
                  : "none",
              }}
            />
          </button>
        )}

        <Link href="/organizer/events" style={{ textDecoration: "none" }}>
          <div
            style={{
              fontSize: "1.1rem",
              letterSpacing: "0.15em",
              color: "#fff",
            }}
          >
            NALPOP
          </div>
        </Link>
        {event && (
          <div
            style={{
              marginLeft: "auto",
              minWidth: 0,
              overflowWrap: "anywhere",
              fontSize: "0.8rem",
              color: "#d4c87a",
            }}
          >
            {event.name}
          </div>
        )}
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000044",
            zIndex: 15,
          }}
        />
      )}

      {!hideSideNav && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: "220px",
            background: "#1B3A2D",
            zIndex: 16,
            transform: open ? "translateX(0)" : "translateX(-100%)",
            transition: "transform 0.25s ease",
            display: "flex",
            flexDirection: "column",
            paddingTop: "60px",
          }}
        >
          {event && (
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid #2a4d3e",
              }}
            >
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#d4c87a",
                  letterSpacing: "0.1em",
                  marginBottom: "4px",
                }}
              >
                CURRENT EVENT
              </div>
              <div style={{ fontSize: "0.9rem", color: "#fff" }}>
                {event.name}
              </div>
            </div>
          )}
          <nav style={{ flex: 1, padding: "1rem 0" }}>
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  padding: "10px 1.25rem",
                  fontSize: "0.85rem",
                  color: pathname === item.href ? "#fff" : "#d4c87a",
                  background:
                    pathname === item.href ? "#2a4d3e" : "transparent",
                  textDecoration: "none",
                  borderLeft:
                    pathname === item.href
                      ? "2px solid #E8C97A"
                      : "2px solid transparent",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div
            style={{ padding: "1rem 1.25rem", borderTop: "1px solid #2a4d3e" }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#d4c87a",
                marginBottom: "8px",
              }}
            >
              {organizerName || organizerEmail}
            </div>
            <Link
              href="/organizer/events"
              style={{
                fontSize: "0.8rem",
                color: "#d4c87a",
                textDecoration: "none",
                display: "block",
                marginBottom: "6px",
              }}
              onClick={() => setOpen(false)}
            >
              All events
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                fontSize: "0.8rem",
                color: "#d4c87a66",
                background: "transparent",
                border: 0,
                padding: 0,
                cursor: signingOut ? "wait" : "pointer",
              }}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "2rem 1.5rem" }}>{children}</div>
    </div>
  );
}
