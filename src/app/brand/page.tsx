"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BrandEvent = {
  id: number;
  event: string;
  name: string;
  event_name?: string;
  dates_label?: string;
  organizer_name?: string;
  status: string;
  collect_payments?: boolean;
};

type Role = "brand" | "organizer" | "both";

export default function BrandHome() {
  const [events, setEvents] = useState<BrandEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAlsoOrganizer, setIsAlsoOrganizer] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError && authError.name !== "AuthSessionMissingError") {
        window.location.href = "/login";
        return;
      }
      if (!user) { window.location.href = "/login"; return; }

      // Get all brand rows for this email (one per event)
      const { data: brandRows, error: brandError } = await supabase
        .from("brands")
        .select("id, event, name, status, organizer_email")
        .eq("email", user.email)
        .order("id", { ascending: false });

      if (brandError) { setError("Could not load your events."); setLoading(false); return; }

      if (!brandRows || brandRows.length === 0) {
        // Check brand_members
        const { data: memberRes } = await supabase
          .from("brand_members")
          .select("brand_email, event")
          .eq("member_email", user.email)
          .limit(1)
          .maybeSingle();
        if (memberRes?.brand_email) {
          const { data: memberBrand, error: memberBrandError } = await supabase
            .from("brands")
            .select("id")
            .eq("email", memberRes.brand_email)
            .eq("event", memberRes.event)
            .order("id", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (memberBrandError) {
            setError("Could not load your events.");
            setLoading(false);
            return;
          }
          if (memberBrand?.id) {
            window.location.href = `/brand/portal?brand=${encodeURIComponent(String(memberBrand.id))}`;
          } else {
            window.location.href = `/brand/portal?event=${encodeURIComponent(memberRes.event)}`;
          }
        } else {
          setError("No brand found for " + user.email + ". Please contact your organizer.");
          setLoading(false);
        }
        return;
      }

      // If only one event, go straight to portal
      if (brandRows.length === 1) {
        window.location.href = `/brand/portal?brand=${encodeURIComponent(String(brandRows[0].id))}`;
        return;
      }

      // Fetch all events + profile per organizer upfront
      const uniqueOrgs = [...new Set(brandRows.map((r) => r.organizer_email).filter(Boolean))];
      const orgDataMap: Record<string, { events: {name:string;slug:string;start_date:string;dates_label:string;collect_payments?: boolean}[]; orgName: string }> = {};
      await Promise.all(uniqueOrgs.map(async (orgEmail) => {
        const [{ data: evts }, { data: prof }] = await Promise.all([
          supabase.from("events").select("name, slug, start_date, dates_label, collect_payments").eq("organizer_email", orgEmail).order("start_date", { ascending: true }),
          supabase.from("profiles").select("name").eq("email", orgEmail).maybeSingle(),
        ]);
        orgDataMap[orgEmail] = {
          events: evts || [],
          orgName: prof?.name || orgEmail?.split("@")[0] || "",
        };
      }));

      const enriched = brandRows.map((row) => {
        const { events: orgEvents, orgName } = orgDataMap[row.organizer_email] || { events: [], orgName: "" };

        // Try exact slug match (case-insensitive), then partial
        const rowEvent = (row.event || "").trim().toLowerCase();
        const eventData = orgEvents.find((e) => (e.slug || "").trim().toLowerCase() === rowEvent)
          || orgEvents.find((e) => rowEvent.includes((e.slug || "").trim().toLowerCase()) || (e.slug || "").trim().toLowerCase().includes(rowEvent))
          || null;

        // Format date
        let dateDisplay = eventData?.dates_label || "";
        if (!dateDisplay && eventData?.start_date) {
          const d = new Date(eventData.start_date + "T12:00:00");
          dateDisplay = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        }

        const cleanSlug = row.event.replace(/-\d+$/, "").replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

        return {
          ...row,
          event_name: eventData?.name || cleanSlug,
          dates_label: dateDisplay,
          organizer_name: orgName,
          collect_payments: eventData ? eventData.collect_payments !== false : true,
        };
      });

      // Check if user is also an organizer
      const { data: orgEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_email", user.email)
        .limit(1);
      if (orgEvents && orgEvents.length > 0) setIsAlsoOrganizer(true);

      setEvents(enriched);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a5a52", fontSize: "0.9rem" }}>
      Loading your events...
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#1B3A2D", marginBottom: "1rem" }}>NALPOP</div>
        <p style={{ color: "#4a5a52", fontSize: "0.9rem" }}>{error}</p>
        <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = "/login"; })} style={{ marginTop: "1rem", padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem" }}>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8" }}>
      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e4ebe6", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#1B3A2D" }}>NALPOP</div>
          <div style={{ width: "2rem", height: "1px", background: "#E8C97A", marginTop: "2px" }} />
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => { window.location.href = "/login"; })} style={{ fontSize: "0.8rem", padding: "5px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", cursor: "pointer", color: "#4a5a52" }}>
          Sign out
        </button>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {isAlsoOrganizer && (
          <div style={{ background: "#1B3A2D", borderRadius: "12px", padding: "12px 16px", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "0.82rem", color: "#E8C97A" }}>You're also an organizer</div>
            <a href="/organizer" style={{ fontSize: "0.78rem", color: "#fff", textDecoration: "none", background: "#ffffff22", padding: "5px 12px", borderRadius: "8px" }}>
              Go to organizer dashboard →
            </a>
          </div>
        )}
        <h1 style={{ fontSize: "1.5rem", color: "#1B3A2D", fontWeight: "normal", marginBottom: "0.5rem" }}>
          Your events
        </h1>
        <p style={{ fontSize: "0.88rem", color: "#4a5a52", marginBottom: "2rem" }}>
          Select an event to open your brand portal.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {events.map((ev) => (
            <button
              key={ev.id}
              onClick={() => { window.location.href = `/brand/portal?brand=${encodeURIComponent(String(ev.id))}`; }}
              style={{ background: "#fff", border: "1px solid #e4ebe6", borderRadius: "16px", padding: "1.5rem 2rem", textAlign: "left", cursor: "pointer", transition: "box-shadow 0.15s", width: "100%" }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)")}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ fontSize: "0.68rem", letterSpacing: "0.15em", color: "#E8C97A", marginBottom: "4px" }}>
                {ev.organizer_name?.toUpperCase()}
              </div>
              <div style={{ fontSize: "1.1rem", color: "#1B3A2D", marginBottom: "4px" }}>
                {ev.event_name}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "8px" }}>
                {ev.dates_label || "Date TBD"}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {ev.collect_payments !== false && (
                  <span style={{
                    fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px",
                    background: ev.status === "confirmed" ? "#4a7c5922" : "#E8C97A22",
                    color: ev.status === "confirmed" ? "#4a7c59" : "#b87333",
                  }}>
                    {ev.status || "pending"}
                  </span>
                )}
                <span style={{ fontSize: "0.78rem", color: "#E8C97A", marginLeft: "auto" }}>
                  Open portal →
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
