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
  organizer_email: string;
  event_type?: string;
  brand_name?: string;
  brandsCount?: number;
  feesCollected?: number;
  outstandingBalance?: number;
};

type PlannerEvent = {
  id: number;
  event_slug: string;
  brand_email: string;
  brand_name: string;
  event?: Event;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#4a7c5922", color: "#4a7c59" },
  Planning: { bg: "#b8733322", color: "#b87333" },
  Completed: { bg: "#8b735522", color: "#8b7355" },
};

export default function EventsPage() {
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addingType, setAddingType] = useState<"my_event" | "planner_event">("my_event");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newEvent, setNewEvent] = useState({ name: "", city: "", dates_label: "", status: "Planning", start_date: "", end_date: "" });
  const [newPlannerEvent, setNewPlannerEvent] = useState({ event_slug: "", brand_name: "", brand_email: "", city: "", dates_label: "", start_date: "" });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).single();
    if (profile?.name) setUserName(profile.name);

    const [eventsRes, plannerRes] = await Promise.all([
      supabase.from("events").select("*").eq("organizer_email", user.email).order("created_at"),
      supabase.from("event_planners").select("*").eq("planner_email", user.email),
    ]);

    if (eventsRes.data) {
      const enriched = await Promise.all(eventsRes.data.map(async (event) => {
        const [brandsRes, feesRes] = await Promise.all([
          supabase.from("brands").select("id").eq("event", event.city),
          supabase.from("brands").select("amount_paid, balance").eq("event", event.city),
        ]);
        return {
          ...event,
          brandsCount: brandsRes.data?.length || 0,
          feesCollected: feesRes.data?.reduce((s, b) => s + Number(b.amount_paid), 0) || 0,
          outstandingBalance: feesRes.data?.reduce((s, b) => s + Number(b.balance), 0) || 0,
        };
      }));
      setMyEvents(enriched);
    }

    if (plannerRes.data) {
      const enrichedPlanner = await Promise.all(plannerRes.data.map(async (pe) => {
        const { data: eventData } = await supabase.from("events").select("*").eq("slug", pe.event_slug).single();
        return { ...pe, event: eventData };
      }));
      setPlannerEvents(enrichedPlanner);
    }

    setLoading(false);
  };

  const addEvent = async () => {
    if (!newEvent.name.trim() || !newEvent.city.trim()) return;
    const slug = newEvent.city.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const { data } = await supabase.from("events").insert({
      slug,
      name: newEvent.name,
      city: newEvent.city,
      dates_label: newEvent.dates_label || "TBD",
      status: newEvent.status,
      start_date: newEvent.start_date || null,
      end_date: newEvent.end_date || null,
      organizer_email: userEmail,
      mode: "multi_brand",
    }).select().single();
    if (data) setMyEvents(prev => [...prev, { ...data, brandsCount: 0, feesCollected: 0, outstandingBalance: 0 }]);
    setNewEvent({ name: "", city: "", dates_label: "", status: "Planning", start_date: "", end_date: "" });
    setAdding(false);
  };

  const addPlannerEvent = async () => {
    if (!newPlannerEvent.event_slug.trim() || !newPlannerEvent.brand_name.trim()) return;
    const { data } = await supabase.from("event_planners").insert({
      event_slug: newPlannerEvent.event_slug,
      planner_email: userEmail,
      brand_email: newPlannerEvent.brand_email,
      brand_name: newPlannerEvent.brand_name,
      city: newPlannerEvent.city,
      dates_label: newPlannerEvent.dates_label,
      start_date: newPlannerEvent.start_date,
    }).select().single();
    if (data) setPlannerEvents(prev => [...prev, data]);
    setNewPlannerEvent({ event_slug: "", brand_name: "", brand_email: "", city: "", dates_label: "", start_date: "" });
    setAdding(false);
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Remove this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    setMyEvents(prev => prev.filter(e => e.id !== id));
  };

  const deletePlannerEvent = async (id: number) => {
    if (!confirm("Remove this planning assignment?")) return;
    await supabase.from("event_planners").delete().eq("id", id);
    setPlannerEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateDates = async (event: Event, dates_label: string) => {
    await supabase.from("events").update({ dates_label }).eq("id", event.id);
    setMyEvents(prev => prev.map(e => e.id === event.id ? { ...e, dates_label } : e));
  };

  const updateStatus = async (event: Event, status: string) => {
    await supabase.from("events").update({ status }).eq("id", event.id);
    setMyEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e));
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
            <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", margin: 0 }}>Welcome back{userName ? `, ${userName}` : ""}</h1>
            <p style={{ color: "#8b7355", fontSize: "0.9rem", marginTop: "4px" }}>Manage all your pop-up events in one place.</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => { setAdding(!adding); setAddingType("my_event"); }} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ My event</button>
            <button onClick={() => { setAdding(!adding); setAddingType("planner_event"); }} style={{ padding: "8px 16px", background: "transparent", color: "#2c1810", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Planning for a brand</button>
          </div>
        </div>

        {adding && addingType === "my_event" && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>New event I am organizing</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <input placeholder="Event name e.g. Atlanta Pop-up" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="City e.g. Atlanta" value={newEvent.city} onChange={e => setNewEvent({...newEvent, city: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="Dates e.g. Sep 11-13, 2026" value={newEvent.dates_label} onChange={e => setNewEvent({...newEvent, dates_label: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <select value={newEvent.status} onChange={e => setNewEvent({...newEvent, status: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}>
                <option>Planning</option>
                <option>Active</option>
                <option>Completed</option>
              </select>
              <input type="date" value={newEvent.start_date} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input type="date" value={newEvent.end_date} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addEvent} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save</button>
              <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {adding && addingType === "planner_event" && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "0.5rem" }}>Event I am planning for a brand</div>
            <div style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1rem" }}>Enter the event details and the brand you are planning for.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <input placeholder="Brand name e.g. Wanni Fuga" value={newPlannerEvent.brand_name} onChange={e => setNewPlannerEvent({...newPlannerEvent, brand_name: e.target.value, event_slug: e.target.value.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now()})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="City e.g. Houston" value={newPlannerEvent.city} onChange={e => setNewPlannerEvent({...newPlannerEvent, city: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="Dates e.g. Mar 5-7, 2027" value={newPlannerEvent.dates_label} onChange={e => setNewPlannerEvent({...newPlannerEvent, dates_label: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="Brand email (optional)" value={newPlannerEvent.brand_email} onChange={e => setNewPlannerEvent({...newPlannerEvent, brand_email: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input type="date" value={newPlannerEvent.start_date} onChange={e => setNewPlannerEvent({...newPlannerEvent, start_date: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addPlannerEvent} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save</button>
              <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* My Events */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.1em", marginBottom: "1rem" }}>MY EVENTS</div>
          {myEvents.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "2rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
              <p style={{ color: "#8b7355", fontSize: "0.85rem" }}>No events yet. Click + My event to add one.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {myEvents.map(event => {
                const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.Planning;
                return (
                  <div key={event.id} style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5", position: "relative" as const }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <Link href={`/login/organizer/events/${event.slug}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontSize: "1.15rem", color: "#2c1810" }}>{event.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>{event.city}</div>
                      </Link>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <select value={event.status} onChange={e => updateStatus(event, e.target.value)} style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color, border: "none", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                          <option>Planning</option>
                          <option>Active</option>
                          <option>Completed</option>
                        </select>
                        <button onClick={() => deleteEvent(event.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "12px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                      </div>
                    </div>
                    <input value={event.dates_label} onChange={e => setMyEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, dates_label: e.target.value } : ev))} onBlur={e => updateDates(event, e.target.value)} style={{ fontSize: "0.85rem", color: "#b87333", border: "none", background: "transparent", fontFamily: "Georgia, serif", padding: "4px 0", marginBottom: "1rem", outline: "none", width: "100%" }} placeholder="Add dates..." />
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
                    <Link href={`/login/organizer/events/${event.slug}`} style={{ marginTop: "1rem", fontSize: "0.78rem", color: "#8b7355", textDecoration: "none", display: "block" }}>View dashboard →</Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Events I am Planning for Others */}
        <div>
          <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.1em", marginBottom: "1rem" }}>EVENTS I AM PLANNING FOR OTHERS</div>
          {plannerEvents.length === 0 ? (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "2rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
              <p style={{ color: "#8b7355", fontSize: "0.85rem" }}>No planning assignments yet. Click + Planning for a brand to add one.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
              {plannerEvents.map(pe => (
                <div key={pe.id} style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5", borderLeft: "3px solid #b87333" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <div>
                      <div style={{ fontSize: "0.65rem", color: "#b87333", letterSpacing: "0.08em", marginBottom: "4px" }}>PLANNING FOR</div>
                      <div style={{ fontSize: "1.1rem", color: "#2c1810" }}>{pe.brand_name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>{pe.city || pe.event_slug}</div>
                      {pe.dates_label && <div style={{ fontSize: "0.78rem", color: "#b87333", marginTop: "2px" }}>{pe.dates_label}</div>}
                    </div>
                    <button onClick={() => deletePlannerEvent(pe.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "12px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                  </div>
                  <Link href={`/login/organizer/planner/${pe.event_slug}`} style={{ fontSize: "0.78rem", color: "#b87333", textDecoration: "none" }}>Open planning dashboard →</Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
