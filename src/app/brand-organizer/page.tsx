"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingView from "@/components/LoadingView";
import PageSkeleton from "@/components/shared/PageSkeleton";

type BrandEvent = {
  id: number;
  slug: string;
  name: string;
  city: string;
  dates_label: string;
  status: string;
  venue_name?: string;
  venue_address?: string;
  end_date?: string;
  start_date?: string;
  organizer_email?: string;
};

type Shipment = {
  id: number;
  event_slug: string;
  notes: string;
  shipped: boolean;
};

type PlannerAssignment = {
  id: number;
  event_slug: string;
  planner_email: string;
  brand_email: string;
  brand_name: string;
  city?: string;
  dates_label?: string;
  start_date?: string;
  end_date?: string;
  venue_name?: string;
  venue_address?: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#4a7c5922", color: "#4a7c59" },
  Planning: { bg: "#E8C97A22", color: "#E8C97A" },
  Completed: { bg: "#4a7c5922", color: "#4a7c59" },
};

export default function BrandOrganizerDashboard() {
  const [events, setEvents] = useState<BrandEvent[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [plannerEvents, setPlannerEvents] = useState<PlannerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState("");
  const actionRef = useRef(false);
  const [adding, setAdding] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newEvent, setNewEvent] = useState({ city: "", start_date: "", end_date: "", status: "Planning", venue_name: "", venue_address: "" });
  const [addingShipment, setAddingShipment] = useState<string | null>(null);
  const [newShipment, setNewShipment] = useState({ notes: "" });

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
    setLoading(true);
    setLoadError("");
    try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && authError.name !== "AuthSessionMissingError") throw authError;
    if (!user) { window.location.href = "/login"; return; }

    const { data: profile, error: profileError } = await supabase.from("profiles").select("name").eq("email", user.email).maybeSingle();
    if (profileError) throw profileError;

    const [eventsRes, shipmentsRes, plannerRes] = await Promise.all([
      supabase.from("events").select("*").eq("organizer_email", user.email).order("created_at"),
      supabase.from("shipments").select("*").eq("organizer_email", user.email),
      supabase.from("event_planners").select("*").eq("brand_email", user.email),
    ]);

    if (eventsRes.error || shipmentsRes.error || plannerRes.error) throw eventsRes.error || shipmentsRes.error || plannerRes.error;
    if (!active) return;
    setUserEmail(user.email || "");
    setUserName(profile?.name || "");
    setEvents(eventsRes.data ?? []);
    setShipments(shipmentsRes.data ?? []);
    setPlannerEvents(plannerRes.data ?? []);
    } catch (error) {
      console.error("Could not load events:", error);
      if (active) setLoadError("Could not load events. Please try again.");
    } finally {
      if (active) setLoading(false);
    }
    };
    void fetchAll();
    return () => { active = false; };
  }, [retry]);

  const runAction = async (label: string, callback: () => Promise<void>) => {
    if (actionRef.current) return;
    actionRef.current = true;
    setAction(label);
    try { await callback(); }
    catch (error) {
      console.error(`${label} failed:`, error);
      alert(`Could not ${label.toLowerCase()}. Please try again.`);
    } finally {
      actionRef.current = false;
      setAction("");
    }
  };

  const addEvent = async () => {
    if (!newEvent.city.trim()) { alert("Enter a city."); return; }
    await runAction("Add event", async () => {
    const slug = newEvent.city.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const { data, error } = await supabase.from("events").insert({
      slug,
      name: newEvent.city,
      city: newEvent.city,
      start_date: newEvent.start_date || null,
      end_date: newEvent.end_date || null,
      dates_label: newEvent.start_date && newEvent.end_date ? `${new Date(newEvent.start_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(newEvent.end_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "TBD",
      status: newEvent.status,
      organizer_email: userEmail,
      mode: "own_brand",
      venue_name: newEvent.venue_name,
      venue_address: newEvent.venue_address,
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Saved event was not returned.");
    setEvents(prev => [...prev, data]);
    setNewEvent({ city: "", start_date: "", end_date: "", status: "Planning", venue_name: "", venue_address: "" });
    setAdding(false);
    });
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Remove this event?")) return;
    await runAction("Remove event", async () => {
    const { error } = await supabase.from("events").delete().eq("id", id).select("id").single();
    if (error) throw error;
    setEvents(prev => prev.filter(e => e.id !== id));
    });
  };

  const updateStatus = async (event: BrandEvent, status: string) => {
    await runAction("Update status", async () => {
    const { error } = await supabase.from("events").update({ status }).eq("id", event.id).select("id").single();
    if (error) throw error;
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e));
    });
  };

  const addShipment = async (eventSlug: string) => {
    if (!newShipment.notes.trim()) { alert("Enter shipment details."); return; }
    await runAction("Add shipment", async () => {
    const { data, error } = await supabase.from("shipments").insert({
      event_slug: eventSlug, organizer_email: userEmail,
      notes: newShipment.notes, shipped: false,
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Saved shipment was not returned.");
    setShipments(prev => [...prev, data]);
    setNewShipment({ notes: "" });
    setAddingShipment(null);
    });
  };

  const toggleShipped = async (shipment: Shipment) => {
    await runAction("Update shipment", async () => {
    const { error } = await supabase.from("shipments").update({ shipped: !shipment.shipped }).eq("id", shipment.id).select("id").single();
    if (error) throw error;
    setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, shipped: !s.shipped } : s));
    });
  };

  const deleteShipment = async (id: number) => {
    await runAction("Remove shipment", async () => {
    const { error } = await supabase.from("shipments").delete().eq("id", id).select("id").single();
    if (error) throw error;
    setShipments(prev => prev.filter(s => s.id !== id));
    });
  };

  const handleLogout = async () => {
    await runAction("Sign out", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.location.href = "/login";
    });
  };

  if (loading || loadError) return <LoadingView loading={loading} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<PageSkeleton label="Loading your events" />} page />;

  const allEvents = [
    ...events.map(e => ({ ...e, type: "own" as const })),
    ...plannerEvents.map(pe => ({ id: pe.id, slug: pe.event_slug, name: pe.brand_name + " — " + pe.city, city: pe.city || "", dates_label: pe.dates_label || "TBD", status: "Planning", end_date: pe.end_date || "", start_date: pe.start_date || "", venue_name: pe.venue_name, venue_address: pe.venue_address, type: "managed" as const, planner_email: pe.planner_email })),
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8" }}>
      {action && <div role="status" style={{ padding: "8px 1rem", color: "#1B3A2D" }}>{action} in progress...</div>}
      <fieldset disabled={!!action} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.2rem", letterSpacing: "0.15em", color: "#fff" }}>NALPOP</div>
          <div style={{ width: "1.5rem", height: "1px", background: "#E8C97A", marginTop: "2px" }}></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#d4c87a" }}>{userName || userEmail}</span>
          <button onClick={handleLogout} style={{ fontSize: "0.8rem", padding: "5px 12px", background: "transparent", border: "1px solid #d4c87a44", borderRadius: "8px", cursor: "pointer", color: "#d4c87a" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", color: "#1B3A2D", fontWeight: "normal", margin: 0 }}>Welcome back{userName ? `, ${userName}` : ""}</h1>
            <p style={{ color: "#4a5a52", fontSize: "0.9rem", marginTop: "4px" }}>Manage your pop-ups across all cities.</p>
          </div>
          <button onClick={() => setAdding(!adding)} style={{ padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>+ Add city</button>
        </div>

        {adding && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "1rem" }}>New city pop-up</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <input placeholder="City e.g. Houston" value={newEvent.city} onChange={e => setNewEvent({...newEvent, city: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "3px" }}>START DATE</div>
                  <input type="date" value={newEvent.start_date} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem",  boxSizing: "border-box" as const }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "3px" }}>END DATE</div>
                  <input type="date" value={newEvent.end_date} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem",  boxSizing: "border-box" as const }} />
                </div>
              </div>
              <select value={newEvent.status} onChange={e => setNewEvent({...newEvent, status: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem" }}>
                <option>Planning</option>
                <option>Active</option>
                <option>Completed</option>
              </select>
              <input placeholder="Venue name e.g. Lumen Room" value={newEvent.venue_name} onChange={e => setNewEvent({...newEvent, venue_name: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem" }} />
              <input placeholder="Venue address" value={newEvent.venue_address} onChange={e => setNewEvent({...newEvent, venue_address: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem" }} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addEvent} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Save</button>
              <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {allEvents.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "3rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✈️</div>
            <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No cities yet</div>
            <div style={{ fontSize: "0.85rem", color: "#4a5a52" }}>Click + Add city to add your first pop-up location.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {allEvents.map(event => {
              const eventShipments = shipments.filter(s => s.event_slug === event.slug);
              const isManaged = event.type === "managed";
              const isComplete = event.end_date ? new Date(event.end_date) < new Date() : false;
              const displayStatus = isComplete ? "Completed" : event.status;
              const statusStyle = STATUS_COLORS[displayStatus] || STATUS_COLORS.Planning;
              return (
                <div key={event.id} style={{ background: isComplete ? "#faf9f7" : "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6", borderTop: isComplete ? "3px solid #4a7c59" : isManaged ? "3px solid #E8C97A" : "3px solid #1B3A2D" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div>
                      <div style={{ fontSize: "1.1rem", color: "#1B3A2D" }}>{event.city || event.name}</div>
                      {isManaged && event.planner_email && <div style={{ fontSize: "0.72rem", color: "#4a5a52", marginTop: "2px" }}>Planner: {event.planner_email.split("@")[0]}</div>}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color }}>{displayStatus}</span>
                      {!isManaged && <button onClick={() => deleteEvent(event.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "12px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>}
                    </div>
                  </div>

                  {event.dates_label && event.dates_label !== "TBD" && <div style={{ fontSize: "0.82rem", color: "#6b5f54", marginBottom: "6px" }}>{event.dates_label}</div>}
                  {event.venue_name && <div style={{ fontSize: "0.78rem", color: "#4a5a52", marginBottom: "2px" }}>📍 {event.venue_name}</div>}
                  {event.venue_address && <div style={{ fontSize: "0.75rem", color: "#aaa", marginBottom: "8px" }}>{event.venue_address}</div>}

                  {!isManaged && (
                    <div style={{ borderTop: "1px solid #f0f4f1", paddingTop: "1rem", marginTop: "0.5rem" }}>
                      <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "6px" }}>SHIPMENTS</div>
                      {eventShipments.map(shipment => (
                        <div key={shipment.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", borderBottom: "1px solid #f8f5f0", fontSize: "0.8rem" }}>
                          <div onClick={() => toggleShipped(shipment)} style={{ width: "16px", height: "16px", borderRadius: "50%", border: shipment.shipped ? "none" : "2px solid #d4c5b0", background: shipment.shipped ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                            {shipment.shipped && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                          </div>
                          <div style={{ flex: 1, color: shipment.shipped ? "#b0a090" : "#1B3A2D", textDecoration: shipment.shipped ? "line-through" : "none" }}>{shipment.notes}</div>
                          <button onClick={() => deleteShipment(shipment.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                        </div>
                      ))}
                      {addingShipment === event.slug ? (
                        <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                          <input placeholder="e.g. 12 dresses, 5 bags..." value={newShipment.notes} onChange={e => setNewShipment({ notes: e.target.value })} style={{ flex: 1, padding: "6px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem" }} autoFocus />
                          <button onClick={() => addShipment(event.slug)} style={{ padding: "6px 10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Add</button>
                          <button onClick={() => setAddingShipment(null)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setAddingShipment(event.slug)} style={{ marginTop: "6px", fontSize: "11px", padding: "3px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52" }}>+ Add shipment note</button>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f0f4f1" }}>
                    <a href={`/brand-organizer/${event.slug}`} style={{ fontSize: "0.78rem", color: "#E8C97A", textDecoration: "none" }}>Open dashboard →</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </fieldset>
    </div>
  );
}
