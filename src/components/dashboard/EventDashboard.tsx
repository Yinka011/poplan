"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Checklist from "@/components/dashboard/Checklist";
import { MarketingDeadlines } from "@/components/dashboard/MarketingDeadlines";
import PaymentTracker from "@/components/dashboard/PaymentTracker";
import AnnouncementManager from "@/components/dashboard/AnnouncementManager";
import { type EventSummary } from "@/lib/events";
import { supabase } from "@/lib/supabase";

type EventDashboardProps = {
  event: EventSummary;
};

const PencilIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

export function EventDashboard({ event }: EventDashboardProps) {
  const [brandsCount, setBrandsCount] = useState(0);
  const [outstandingTasks, setOutstandingTasks] = useState(0);
  const [spotsToFill, setSpotsToFill] = useState(10);
  const [editingSpots, setEditingSpots] = useState(false);
  const [newSpots, setNewSpots] = useState("10");
  const [venueAddress, setVenueAddress] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState("");

  const eventDate = new Date("2026-09-12");
  const today = new Date();
  const daysToEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  useEffect(() => {
    fetchData();

    const brandsChannel = supabase
      .channel("brands-stat")
      .on("postgres_changes", { event: "*", schema: "public", table: "brands" }, fetchData)
      .subscribe();

    const checklistChannel = supabase
      .channel("checklist-stat")
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist" }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(brandsChannel);
      supabase.removeChannel(checklistChannel);
    };
  }, []);

  const fetchData = async () => {
    const [brandsRes, checklistRes, settingsRes] = await Promise.all([
      supabase.from("brands").select("id").eq("event", event.city),
      supabase.from("checklist").select("completed").eq("event", event.city),
      supabase.from("event_settings").select("spots_to_fill, venue_address").eq("event", event.city).single(),
    ]);

    if (brandsRes.data) setBrandsCount(brandsRes.data.length);
    if (checklistRes.data) setOutstandingTasks(checklistRes.data.filter(i => !i.completed).length);
    if (settingsRes.data) {
      setSpotsToFill(settingsRes.data.spots_to_fill);
      setNewSpots(String(settingsRes.data.spots_to_fill));
      setVenueAddress(settingsRes.data.venue_address || "");
      setNewAddress(settingsRes.data.venue_address || "");
    }
  };

  const saveSpots = async () => {
    await supabase.from("event_settings").update({ spots_to_fill: parseInt(newSpots) }).eq("event", event.city);
    setSpotsToFill(parseInt(newSpots));
    setEditingSpots(false);
  };

  const saveAddress = async () => {
    await supabase.from("event_settings").update({ venue_address: newAddress }).eq("event", event.city);
    setVenueAddress(newAddress);
    setEditingAddress(false);
  };

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <Link href="/login/organizer/events" className="text-sm font-medium text-brown-600/70 transition-colors hover:text-brown-800">
          ← All events
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium text-brown-800 sm:text-4xl">
          {event.name}
        </h1>
        <p className="mt-1 text-sm text-brown-600/70">Sep 11–13, 2026</p>
      </div>

      {/* Dark brown stats box */}
      <div style={{ background: "#2c1810", borderRadius: "16px", padding: "1.75rem 2rem", color: "#fff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Spots to fill */}
          <div>
            <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>SPOTS TO FILL</div>
            {editingSpots ? (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                <input type="number" value={newSpots} onChange={e => setNewSpots(e.target.value)} style={{ width: "60px", padding: "4px 6px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "1.2rem", fontFamily: "Georgia, serif", background: "#3d2415", color: "#fff" }} autoFocus />
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={saveSpots} style={{ padding: "3px 8px", background: "#b87333", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditingSpots(false)} style={{ padding: "3px 8px", background: "transparent", border: "1px solid #c8b89a44", color: "#c8b89a", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ fontSize: "2rem", fontFamily: "Georgia, serif", fontWeight: "normal" }}>{spotsToFill}</div>
                <button onClick={() => setEditingSpots(true)} title="Edit" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#c8b89a", padding: "2px", opacity: 0.7 }} onMouseEnter={e => (e.currentTarget.style.opacity = "1")} onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}>
                  <PencilIcon />
                </button>
              </div>
            )}
            <div style={{ fontSize: "0.72rem", color: "#c8b89a", marginTop: "4px" }}>{brandsCount} confirmed</div>
          </div>

          {/* Brands confirmed */}
          <div>
            <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>BRANDS CONFIRMED</div>
            <div style={{ fontSize: "2rem", fontFamily: "Georgia, serif", fontWeight: "normal" }}>{brandsCount}</div>
            <div style={{ fontSize: "0.72rem", color: "#c8b89a", marginTop: "4px" }}>of {spotsToFill} spots</div>
          </div>

          {/* Outstanding tasks */}
          <div>
            <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>OUTSTANDING TASKS</div>
            <div style={{ fontSize: "2rem", fontFamily: "Georgia, serif", fontWeight: "normal", color: outstandingTasks > 0 ? "#e8c97a" : "#90c9a0" }}>{outstandingTasks}</div>
            <div style={{ fontSize: "0.72rem", color: "#c8b89a", marginTop: "4px" }}>tasks remaining</div>
          </div>

          {/* Countdown */}
          <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", color: "#2c1810", fontFamily: "Georgia, serif", fontWeight: "normal", lineHeight: 1 }}>{daysToEvent}</div>
            <div style={{ fontSize: "0.7rem", color: "#8b7355", marginTop: "6px", letterSpacing: "0.05em" }}>DAYS TO EVENT</div>
            <div style={{ fontSize: "0.7rem", color: "#b87333", marginTop: "2px" }}>Sep 11–13, 2026</div>
          </div>

        </div>
      </div>

      {/* Venue address */}
      <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e8e0d5", position: "relative" as const }}>
        <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>VENUE ADDRESS</div>
        {editingAddress ? (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input type="text" value={newAddress} onChange={e => setNewAddress(e.target.value)} style={{ flex: 1, padding: "6px 10px", border: "1px solid #b87333", borderRadius: "6px", fontSize: "0.9rem", fontFamily: "Georgia, serif" }} autoFocus />
            <button onClick={saveAddress} style={{ padding: "6px 12px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>Save</button>
            <button onClick={() => setEditingAddress(false)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "0.95rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>{venueAddress || "No address set yet"}</div>
            <button onClick={() => setEditingAddress(true)} title="Edit address" style={{ position: "absolute" as const, top: "10px", right: "10px", background: "transparent", border: "none", cursor: "pointer", color: "#b87333" }}>
              <PencilIcon />
            </button>
          </>
        )}
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
        <a href={`/login/organizer/events/${event.slug}/expenses`} style={{ padding: "8px 18px", background: "#fff", color: "#2c1810", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>Expenses</a>
        <a href={`/login/organizer/events/${event.slug}/planning`} style={{ padding: "8px 18px", background: "#fff", color: "#2c1810", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>Planning Hub</a>
      </div>

      <PaymentTracker />

      <div className="grid gap-6 lg:grid-cols-2">
        <Checklist />
        <MarketingDeadlines city={event.city} />
      </div>

      <AnnouncementManager event={event.city} />

    </div>
  );
}