"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

type Event = {
  id: number;
  slug: string;
  name: string;
  city: string;
  dates_label: string;
  status: string;
  start_date: string;
  end_date: string;
  brandsCount?: number;
  feesCollected?: number;
  outstandingBalance?: number;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#4a7c5922", color: "#4a7c59" },
  Planning: { bg: "#b8733322", color: "#b87333" },
  Completed: { bg: "#8b735522", color: "#8b7355" },
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: "", city: "", dates_label: "", status: "Planning", start_date: "", end_date: "" });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data: eventsData } = await supabase.from("events").select("*").order("created_at");
    if (!eventsData) { setLoading(false); return; }

    const enriched = await Promise.all(eventsData.map(async (event) => {
      const [brandsRes, feesRes] = await Promise.all([
        supabase.from("brands").select("id").eq("event", event.city),
        supabase.from("brands").select("amount_paid, balance").eq("event", event.city),
      ]);
      const brandsCount = brandsRes.data?.length || 0;
      const feesCollected = feesRes.data?.reduce((s, b) => s + Number(b.amount_paid), 0) || 0;
      const outstandingBalance = feesRes.data?.reduce((s, b) => s + Number(b.balance), 0) || 0;
      return { ...event, brandsCount, feesCollected, outstandingBalance };
    }));

    setEvents(enriched);
    setLoading(false);
  };

  const addEvent = async () => {
    if (!newEvent.name.trim() || !newEvent.city.trim()) return;
    const slug = newEvent.city.toLowerCase().replace(/\s+/g, "-");
    const { data } = await supabase.from("events").insert({
      slug,
      name: newEvent.name,
      city: newEvent.city,
      dates_label: newEvent.dates_label || "TBD",
      status: newEvent.status,
      start_date: newEvent.start_date || null,
      end_date: newEvent.end_date || null,
    }).select().single();
    if (data) setEvents(prev => [...prev, { ...data, brandsCount: 0, feesCollected: 0, outstandingBalance: 0 }]);
    setNewEvent({ name: "", city: "", dates_label: "", status: "Planning", start_date: "", end_date: "" });
    setAdding(false);
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Remove this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateDates = async (event: Event, datesLabel: string) => {
    await supabase.from("events").update({ dates_label: datesLabel }).eq("id", event.id);
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, dates_label: datesLabel } : e));
  };

  const updateStatus = async (event: Event, status: string) => {
    await supabase.from("events").update({ status }).eq("id", event.id);
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e));
  };

  if (loading) return (
    <DashboardShell>
      <div style={{ fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading events...</div>
    </DashboardShell>
  );

  return (
    <DashboardShell>
      <div style={{ fontFamily: "Georgia, serif" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", margin: 0 }}>Welcome back, Yinka</h1>
            <p style={{ color: "#8b7355", fontSize: "0.9rem", marginTop: "4px" }}>Manage all your pop-up events in one place.</p>
          </div>
          <button onClick={() => setAdding(!adding)} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ New event</button>
        </div>

        {adding && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>New event</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <input placeholder="Event name e.g. Atlanta Pop-up" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="City e.g. Atlanta" value={newEvent.city} onChange={e => setNewEvent({...newEvent, city: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="Dates e.g. Sep 11–13, 2026" value={newEvent.dates_label} onChange={e => setNewEvent({...newEvent, dates_label: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <select value={newEvent.status} onChange={e => setNewEvent({...newEvent, status: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}>
                <option>Planning</option>
                <option>Active</option>
                <option>Completed</option>
              </select>
              <input type="date" placeholder="Start date" value={newEvent.start_date} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input type="date" placeholder="End date" value={newEvent.end_date} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addEvent} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save</button>
              <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {events.map(event => {
            const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.Planning;
            return (
              <div key={event.id} style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5", display: "flex", flexDirection: "column" as const, gap: "0", position: "relative" as const }}>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <Link href={`/login/organizer/events/${event.slug}`} style={{ textDecoration: "none" }}>
                    <div style={{ fontSize: "1.15rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>{event.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>{event.city}</div>
                  </Link>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <select value={event.status} onChange={e => updateStatus(event, e.target.value)} style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color, border: "none", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      <option>Planning</option>
                      <option>Active</option>
                      <option>Completed</option>
                    </select>
                    <button onClick={() => deleteEvent(event.id)} title="Remove event" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "12px", padding: "2px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                  </div>
                </div>

                <input
                  value={event.dates_label}
                  onChange={e => setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, dates_label: e.target.value } : ev))}
                  onBlur={e => updateDates(event, e.target.value)}
                  style={{ fontSize: "0.85rem", color: "#b87333", border: "none", background: "transparent", fontFamily: "Georgia, serif", padding: "4px 0", marginBottom: "1rem", outline: "none", width: "100%", cursor: "text" }}
                  placeholder="Add dates..."
                />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", borderTop: "1px solid #f0ebe4", paddingTop: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "2px" }}>BRANDS</div>
                    <div style={{ fontSize: "1.2rem", color: "#2c1810" }}>{event.brandsCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "2px" }}>COLLECTED</div>
                    <div style={{ fontSize: "1.2rem", color: "#4a7c59" }}>${Number(event.feesCollected).toFixed(2)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.65rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "2px" }}>OUTSTANDING</div>
                    <div style={{ fontSize: "1.2rem", color: "#c0392b" }}>${Number(event.outstandingBalance).toFixed(2)}</div>
                  </div>
                </div>

                <Link href={`/login/organizer/events/${event.slug}`} style={{ marginTop: "1rem", fontSize: "0.78rem", color: "#8b7355", textDecoration: "none", letterSpacing: "0.05em" }}>
                  View dashboard →
                </Link>

              </div>
            );
          })}
        </div>

      </div>
    </DashboardShell>
  );
}