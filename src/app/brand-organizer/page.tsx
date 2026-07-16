"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BrandEvent = {
  id: number;
  slug: string;
  name: string;
  city: string;
  dates_label: string;
  status: string;
  notes: string;
};

type Shipment = {
  id: number;
  event_slug: string;
  notes: string;
  shipped: boolean;
  shipped_at: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#4a7c5922", color: "#4a7c59" },
  Planning: { bg: "#b8733322", color: "#b87333" },
  Completed: { bg: "#8b735522", color: "#8b7355" },
};

export default function BrandOrganizerDashboard() {
  const [events, setEvents] = useState<BrandEvent[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newEvent, setNewEvent] = useState({ name: "", city: "", dates_label: "", status: "Planning" });
  const [addingShipment, setAddingShipment] = useState<string | null>(null);
  const [newShipment, setNewShipment] = useState({ notes: "" });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setUserEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).single();
    if (profile) setUserName(profile.name);

    const [eventsRes, shipmentsRes] = await Promise.all([
      supabase.from("events").select("*").eq("organizer_email", user.email).order("created_at"),
      supabase.from("shipments").select("*").eq("organizer_email", user.email),
    ]);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (shipmentsRes.data) setShipments(shipmentsRes.data);
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
      organizer_email: userEmail,
      mode: "own_brand",
    }).select().single();
    if (data) setEvents(prev => [...prev, data]);
    setNewEvent({ name: "", city: "", dates_label: "", status: "Planning" });
    setAdding(false);
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Remove this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const updateStatus = async (event: BrandEvent, status: string) => {
    await supabase.from("events").update({ status }).eq("id", event.id);
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status } : e));
  };

  const updateDates = async (event: BrandEvent, dates_label: string) => {
    await supabase.from("events").update({ dates_label }).eq("id", event.id);
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, dates_label } : e));
  };

  const addShipment = async (eventSlug: string) => {
    if (!newShipment.notes.trim()) return;
    const { data } = await supabase.from("shipments").insert({
      event_slug: eventSlug,
      organizer_email: userEmail,
      notes: newShipment.notes,
      shipped: false,
    }).select().single();
    if (data) setShipments(prev => [...prev, data]);
    setNewShipment({ notes: "" });
    setAddingShipment(null);
  };

  const toggleShipped = async (shipment: Shipment) => {
    const now = new Date().toISOString();
    await supabase.from("shipments").update({ shipped: !shipment.shipped, shipped_at: !shipment.shipped ? now : null }).eq("id", shipment.id);
    setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, shipped: !s.shipped, shipped_at: now } : s));
  };

  const deleteShipment = async (id: number) => {
    await supabase.from("shipments").delete().eq("id", id);
    setShipments(prev => prev.filter(s => s.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>

      <div style={{ background: "#2c1810", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.2rem", letterSpacing: "0.15em", color: "#fff" }}>POPLAN</div>
          <div style={{ width: "1.5rem", height: "1px", background: "#b87333", marginTop: "2px" }}></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#c8b89a" }}>{userName || userEmail}</span>
          <button onClick={handleLogout} style={{ fontSize: "0.8rem", padding: "5px 12px", background: "transparent", border: "1px solid #c8b89a44", borderRadius: "8px", cursor: "pointer", color: "#c8b89a", fontFamily: "Georgia, serif" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", margin: 0 }}>Welcome back{userName ? `, ${userName}` : ""}</h1>
            <p style={{ color: "#8b7355", fontSize: "0.9rem", marginTop: "4px" }}>Manage your pop-ups across all cities.</p>
          </div>
          <button onClick={() => setAdding(!adding)} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add city</button>
        </div>

        {adding && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>New city event</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <input placeholder="Event name e.g. Wanni Fuga Houston" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="City e.g. Houston" value={newEvent.city} onChange={e => setNewEvent({...newEvent, city: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="Dates e.g. Mar 5-7, 2027" value={newEvent.dates_label} onChange={e => setNewEvent({...newEvent, dates_label: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <select value={newEvent.status} onChange={e => setNewEvent({...newEvent, status: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}>
                <option>Planning</option>
                <option>Active</option>
                <option>Completed</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addEvent} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save</button>
              <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "3rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✈️</div>
            <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>No cities yet</div>
            <div style={{ fontSize: "0.85rem", color: "#8b7355" }}>Click + Add city to add your first pop-up location.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
            {events.map(event => {
              const eventShipments = shipments.filter(s => s.event_slug === event.slug);
              const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.Planning;
              return (
                <div key={event.id} style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div>
                      <div style={{ fontSize: "1.1rem", color: "#2c1810" }}>{event.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>{event.city}</div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <select value={event.status} onChange={e => updateStatus(event, e.target.value)} style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color, border: "none", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                        <option>Planning</option>
                        <option>Active</option>
                        <option>Completed</option>
                      </select>
                      <button onClick={() => deleteEvent(event.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "12px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                    </div>
                  </div>

                  <input value={event.dates_label} onChange={e => setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, dates_label: e.target.value } : ev))} onBlur={e => updateDates(event, e.target.value)} style={{ fontSize: "0.82rem", color: "#b87333", border: "none", background: "transparent", fontFamily: "Georgia, serif", padding: "4px 0", marginBottom: "1rem", outline: "none", width: "100%" }} placeholder="Add dates..." />

                  <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: "1rem" }}>
                    <div style={{ fontSize: "0.72rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "8px" }}>SHIPMENTS</div>

                    {eventShipments.map(shipment => (
                      <div key={shipment.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #f8f5f0" }}>
                        <div onClick={() => toggleShipped(shipment)} style={{ width: "16px", height: "16px", borderRadius: "50%", border: shipment.shipped ? "none" : "2px solid #d4c5b0", background: shipment.shipped ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                          {shipment.shipped && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, fontSize: "0.82rem", color: shipment.shipped ? "#b0a090" : "#2c1810", textDecoration: shipment.shipped ? "line-through" : "none" }}>{shipment.notes}</div>
                        <button onClick={() => deleteShipment(shipment.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                      </div>
                    ))}

                    {addingShipment === event.slug ? (
                      <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
                        <input placeholder="e.g. 12 dresses, 5 bags..." value={newShipment.notes} onChange={e => setNewShipment({ notes: e.target.value })} style={{ flex: 1, padding: "6px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} autoFocus />
                        <button onClick={() => addShipment(event.slug)} style={{ padding: "6px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Add</button>
                        <button onClick={() => setAddingShipment(null)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setAddingShipment(event.slug)} style={{ marginTop: "6px", fontSize: "11px", padding: "3px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", cursor: "pointer", color: "#8b7355" }}>+ Add shipment note</button>
                    )}
                  </div>

                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f0ebe4", display: "flex", gap: "8px" }}>
                    <a href={`/login/organizer/events/${event.slug}`} style={{ fontSize: "0.78rem", color: "#b87333", textDecoration: "none" }}>Planning Hub →</a>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
