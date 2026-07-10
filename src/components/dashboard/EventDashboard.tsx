"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Checklist from "@/components/dashboard/Checklist";
import { EventCountdown } from "@/components/dashboard/EventCountdown";
import { MarketingDeadlines } from "@/components/dashboard/MarketingDeadlines";
import PaymentTracker from "@/components/dashboard/PaymentTracker";
import { getEventDetail } from "@/lib/event-details";
import { type EventSummary, getDaysToEvent } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import AnnouncementManager from "@/components/dashboard/AnnouncementManager";

type EventDashboardProps = {
  event: EventSummary;
};

export function EventDashboard({ event }: EventDashboardProps) {
  const detail = getEventDetail(event.slug);
  const daysToEvent = event.startDate ? getDaysToEvent(event.startDate) : null;

  const [brandsCount, setBrandsCount] = useState(0);
  const [outstandingTasks, setOutstandingTasks] = useState(0);
  const [spotsToFill, setSpotsToFill] = useState(10);
  const [editingSpots, setEditingSpots] = useState(false);
  const [newSpots, setNewSpots] = useState("10");

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
      supabase.from("event_settings").select("spots_to_fill").eq("event", event.city).single(),
    ]);

    if (brandsRes.data) setBrandsCount(brandsRes.data.length);
    if (checklistRes.data) setOutstandingTasks(checklistRes.data.filter(i => !i.completed).length);
    if (settingsRes.data) {
      setSpotsToFill(settingsRes.data.spots_to_fill);
      setNewSpots(String(settingsRes.data.spots_to_fill));
    }
  };

  const saveSpots = async () => {
    await supabase.from("event_settings").update({ spots_to_fill: parseInt(newSpots) }).eq("event", event.city);
    setSpotsToFill(parseInt(newSpots));
    setEditingSpots(false);
  };

  const statCard = (label: string, value: string, hint?: string, editable?: boolean, onEdit?: () => void) => (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e8e0d5", position: "relative" as const }}>
      <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: "1.8rem", color: "#2c1810", fontFamily: "Georgia, serif", fontWeight: "normal" }}>{value}</div>
      {hint && <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "4px" }}>{hint}</div>}
      {editable && (
        <button onClick={onEdit} title="Edit" style={{ position: "absolute" as const, top: "10px", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", color: "#8b7355" }}>✏️</button>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/login/organizer/events" className="text-sm font-medium text-brown-600/70 transition-colors hover:text-brown-800">
            ← All events
          </Link>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium text-brown-800 sm:text-4xl">
            {event.name}
          </h1>
          <p className="mt-1 text-sm text-brown-600/70">
            {event.status === "Planning" ? `${event.city} is in early planning.` : `Here's how ${event.city} is shaping up.`}
          </p>
        </div>
      </div>

      <EventCountdown event={event} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e8e0d5", position: "relative" as const }}>
          <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>SPOTS TO FILL</div>
          {editingSpots ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input type="number" value={newSpots} onChange={e => setNewSpots(e.target.value)} style={{ width: "70px", padding: "4px 8px", border: "1px solid #b87333", borderRadius: "6px", fontSize: "1.4rem", fontFamily: "Georgia, serif" }} autoFocus />
              <button onClick={saveSpots} style={{ padding: "4px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>Save</button>
              <button onClick={() => setEditingSpots(false)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "1.8rem", color: "#2c1810", fontFamily: "Georgia, serif", fontWeight: "normal" }}>{spotsToFill}</div>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "4px" }}>{brandsCount} confirmed</div>
              <button onClick={() => setEditingSpots(true)} title="Edit spots" style={{ position: "absolute" as const, top: "10px", right: "10px", background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", color: "#8b7355" }}>✏️</button>
            </>
          )}
        </div>

        {statCard("Brands confirmed", String(brandsCount), `of ${spotsToFill} spots filled`)}

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>OUTSTANDING TASKS</div>
          <div style={{ fontSize: "1.8rem", color: outstandingTasks > 0 ? "#c0392b" : "#4a7c59", fontFamily: "Georgia, serif", fontWeight: "normal" }}>{outstandingTasks}</div>
          <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "4px" }}>tasks remaining on checklist</div>
        </div>

      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginBottom: "0.5rem" }}>
        <a href={`/login/organizer/events/${event.slug}/expenses`} style={{ padding: "8px 18px", background: "#2c1810", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>💰 Expenses</a>
        <a href={`/login/organizer/events/${event.slug}/uploads`} style={{ padding: "8px 18px", background: "#8b6ab0", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>📁 Brand Uploads</a>
        <a href={`/login/organizer/events/${event.slug}/planning`} style={{ padding: "8px 18px", background: "#5b7fa6", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>🎨 Planning Hub</a>
      </div>

      <PaymentTracker />

      <div className="grid gap-6 lg:grid-cols-2">
        <Checklist />
        <MarketingDeadlines city={event.city} items={detail.marketingDeadlines} />
        <AnnouncementManager event={event.city} />
      </div>
    </div>
  );
}