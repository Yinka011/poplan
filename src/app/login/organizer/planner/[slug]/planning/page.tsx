/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type DecorItem = { id: number; category: string; item: string; decision: string; vendor: string; cost: number; quantity: number; status: string; notes: string; };
type RefreshItem = { id: number; item: string; vendor: string; quantity: string; quantity_num: number; cost: number; notes: string; };
type StaffItem = { id: number; name: string; role: string; hours: string; pay_rate: number; phone: string; email: string; instagram: string; notes: string; shifts?: StaffShift[]; };
type StaffShift = { id: number; staff_id: number; shift_date: string; start_time: string; end_time: string; hours: number; };

const DECOR_CATEGORIES = ["Theme", "Furniture", "Florals", "Lighting", "Signage", "Props"];
const STAFF_ROLES = ["Cashier", "Stylist", "Runner", "Check-in", "Security", "Inventory", "Brand liaison", "Photographer"];
const STATUSES = ["Pending", "In Progress", "Confirmed", "Cancelled"];
const EVENT_DAYS = ["Fri Sep 11", "Sat Sep 12", "Sun Sep 13"];

const statusColors: Record<string, { bg: string; color: string }> = {
  Confirmed: { bg: "#4a7c5922", color: "#4a7c59" },
  "In Progress": { bg: "#b8733322", color: "#b87333" },
  Pending: { bg: "#8b735522", color: "#8b7355" },
  Cancelled: { bg: "#c0392b22", color: "#c0392b" },
};

const roleColors: Record<string, string> = {
  Cashier: "#b87333", Stylist: "#4a7c59", Runner: "#5b7fa6",
  "Check-in": "#8b6ab0", Security: "#c0392b", Inventory: "#2c7873",
  "Brand liaison": "#a0522d", Photographer: "#6b8e23",
};

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const toMins = (t: string) => {
    const match = t.match(/^(\d+)(?::(\d+))?\s*(am|pm)$/i);
    if (!match) return 0;
    let h = parseInt(match[1]);
    const m = parseInt(match[2] || "0");
    const period = match[3].toLowerCase();
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    return h * 60 + m;
  };
  const diff = (toMins(end) - toMins(start)) / 60;
  return diff > 0 ? Math.round(diff * 10) / 10 : 0;
}

export default function PlanningHub({ params }: { params: Promise<{ slug: string }> }) {
  const [eventSlug, setEventSlug] = useState("");

  useEffect(() => {
    params.then(p => setEventSlug(p.slug));
  }, [params]);
  const [tab, setTab] = useState<"decor" | "refreshments" | "staff">("decor");
  const [decor, setDecor] = useState<DecorItem[]>([]);
  const [refresh, setRefresh] = useState<RefreshItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [addingShift, setAddingShift] = useState<number | null>(null);
  const [newShift, setNewShift] = useState({ shift_date: "Fri Sep 11", start_time: "", end_time: "" });
  const [newDecor, setNewDecor] = useState({ category: "Theme", item: "", decision: "", vendor: "", cost: "", quantity: "", status: "Pending", notes: "" });
  const [newRefresh, setNewRefresh] = useState({ item: "", vendor: "", quantity: "", quantity_num: "", cost: "", notes: "" });
  const [newStaff, setNewStaff] = useState({ name: "", role: "Cashier", pay_rate: "", phone: "", email: "", instagram: "", notes: "" });

  useEffect(() => { if (eventSlug) fetchAll(); }, [eventSlug]);

  const fetchAll = async () => {
    const [d, r, s, sh] = await Promise.all([
      supabase.from("planning_decor").select("*").eq("event", eventSlug).order("category"),
      supabase.from("planning_refreshments").select("*").eq("event", eventSlug),
      supabase.from("planning_staff").select("*").eq("event", eventSlug),
      supabase.from("planning_staff_shifts").select("*").eq("event", eventSlug),
    ]);
    if (d.data) setDecor(d.data);
    if (r.data) setRefresh(r.data);
    if (s.data && sh.data) {
      const staffWithShifts = s.data.map(member => ({
        ...member,
        shifts: sh.data.filter((shift: StaffShift) => shift.staff_id === member.id)
      }));
      setStaff(staffWithShifts);
    }
  };

  const addDecor = async () => {
    if (!newDecor.item.trim()) return;
    const qty = parseFloat(newDecor.quantity) || 0;
    const unitCost = parseFloat(newDecor.cost) || 0;
    const totalCost = qty > 0 ? qty * unitCost : unitCost;
    const { data } = await supabase.from("planning_decor").insert({
      ...newDecor, cost: totalCost, quantity: qty, event: eventSlug
    }).select().single();
    if (data) setDecor(prev => [...prev, data]);
    setNewDecor({ category: "Theme", item: "", decision: "", vendor: "", cost: "", quantity: "", status: "Pending", notes: "" });
    setAdding(false);
  };

  const addRefresh = async () => {
    if (!newRefresh.item.trim()) return;
    const qty = parseFloat(newRefresh.quantity_num) || 0;
    const unitCost = parseFloat(newRefresh.cost) || 0;
    const totalCost = qty > 0 ? qty * unitCost : unitCost;
    const { data } = await supabase.from("planning_refreshments").insert({
      item: newRefresh.item,
      vendor: newRefresh.vendor,
      quantity: newRefresh.quantity,
      quantity_num: qty,
      cost: totalCost,
      notes: newRefresh.notes,
      event: eventSlug
    }).select().single();
    if (data) setRefresh(prev => [...prev, data]);
    setNewRefresh({ item: "", vendor: "", quantity: "", quantity_num: "", cost: "", notes: "" });
    setAdding(false);
  };

  const addStaff = async () => {
    if (!newStaff.name.trim()) return;
    const { data } = await supabase.from("planning_staff").insert({
      name: newStaff.name,
      role: newStaff.role,
      pay_rate: parseFloat(newStaff.pay_rate) || 0,
      phone: newStaff.phone,
      email: newStaff.email,
      instagram: newStaff.instagram,
      notes: newStaff.notes,
      event: eventSlug
    }).select().single();
    if (data) setStaff(prev => [...prev, { ...data, shifts: [] }]);
    setNewStaff({ name: "", role: "Cashier", pay_rate: "", phone: "", email: "", instagram: "", notes: "" });
    setAdding(false);
  };

  const addShift = async (staffId: number) => {
    if (!newShift.start_time || !newShift.end_time) return;
    const hours = calcHours(newShift.start_time, newShift.end_time);
    const { data } = await supabase.from("planning_staff_shifts").insert({
      staff_id: staffId,
      event: eventSlug,
      shift_date: newShift.shift_date,
      start_time: newShift.start_time,
      end_time: newShift.end_time,
      hours,
    }).select().single();
    if (data) {
      setStaff(prev => prev.map(m => m.id === staffId ? { ...m, shifts: [...(m.shifts || []), data] } : m));
    }
    setNewShift({ shift_date: "Fri Sep 11", start_time: "", end_time: "" });
    setAddingShift(null);
  };

  const deleteShift = async (staffId: number, shiftId: number) => {
    await supabase.from("planning_staff_shifts").delete().eq("id", shiftId);
    setStaff(prev => prev.map(m => m.id === staffId ? { ...m, shifts: (m.shifts || []).filter(s => s.id !== shiftId) } : m));
  };

  const saveEdit = async (table: string, id: number) => {
    const saveId = editData.id;
    if (table === "planning_decor") {
      const qty = parseFloat(editData.quantity) || 0;
      const unitCost = parseFloat(editData.unit_cost) || parseFloat(editData.cost) || 0;
      const totalCost = qty > 0 ? qty * unitCost : parseFloat(editData.cost) || 0;
      await supabase.from(table).update({ item: editData.item, decision: editData.decision, vendor: editData.vendor, cost: totalCost, quantity: qty, status: editData.status, notes: editData.notes }).eq("id", saveId);
      setDecor(prev => prev.map(i => i.id === saveId ? { ...i, ...editData, cost: totalCost } : i));
    } else if (table === "planning_refreshments") {
      const qty = parseFloat(editData.quantity_num) || 0;
      const unitCost = parseFloat(editData.unit_cost) || parseFloat(editData.cost) || 0;
      const totalCost = qty > 0 ? qty * unitCost : parseFloat(editData.cost) || 0;
      await supabase.from(table).update({ item: editData.item, vendor: editData.vendor, quantity: editData.quantity, quantity_num: qty, cost: totalCost, notes: editData.notes }).eq("id", saveId);
      setRefresh(prev => prev.map(i => i.id === saveId ? { ...i, ...editData, cost: totalCost } : i));
    } else if (table === "planning_staff") {
      await supabase.from(table).update({ name: editData.name, role: editData.role, pay_rate: parseFloat(editData.pay_rate) || 0, phone: editData.phone, email: editData.email, instagram: editData.instagram, notes: editData.notes }).eq("id", saveId);
      setStaff(prev => prev.map(i => i.id === saveId ? { ...i, ...editData } : i));
    }
    setEditing(null);
  };

  const deleteItem = async (table: string, id: number) => {
    if (!confirm("Remove this item?")) return;
    await supabase.from(table).delete().eq("id", id);
    if (table === "planning_decor") setDecor(prev => prev.filter(i => i.id !== id));
    if (table === "planning_refreshments") setRefresh(prev => prev.filter(i => i.id !== id));
    if (table === "planning_staff") setStaff(prev => prev.filter(i => i.id !== id));
  };

  const inp = (style?: any) => ({ padding: "7px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif", ...style });
  const editInp = (style?: any) => ({ padding: "4px 7px", border: "1px solid #b87333", borderRadius: "6px", fontSize: "12px", ...style });

  const totalStaffCost = staff.reduce((s, m) => {
    const totalHours = (m.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0);
    return s + (totalHours * Number(m.pay_rate));
  }, 0);
  const totalRefreshCost = refresh.reduce((s, x) => s + Number(x.cost), 0);
  const totalDecorCost = decor.reduce((s, x) => s + Number(x.cost), 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/login/organizer/planner/${eventSlug}`} style={{ fontSize: "0.85rem", color: "#8b7355", textDecoration: "none" }}>← Back to planner</Link>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", marginTop: "0.5rem" }}>Planning Hub</h1>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Decor, refreshments and staffing for this event</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "1.5rem" }}>
          {[
            { label: "DECOR BUDGET", value: `$${totalDecorCost.toFixed(2)}`, color: "#b87333" },
            { label: "REFRESHMENTS", value: `$${totalRefreshCost.toFixed(2)}`, color: "#4a7c59" },
            { label: "STAFFING COST", value: `$${totalStaffCost.toFixed(2)}`, color: "#5b7fa6" },
          ].map((c, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.7rem", color: "#8b7355", marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontSize: "1.3rem", color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
          {(["decor", "refreshments", "staff"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setAdding(false); setEditing(null); }} style={{ padding: "8px 20px", background: tab === t ? "#2c1810" : "#fff", color: tab === t ? "#fff" : "#8b7355", border: "1px solid " + (tab === t ? "#2c1810" : "#e8e0d5"), borderRadius: "20px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif", textTransform: "capitalize" as const }}>{t}</button>
          ))}
          <button onClick={() => setAdding(!adding)} style={{ marginLeft: "auto", padding: "8px 16px", background: "#b87333", color: "#fff", border: "none", borderRadius: "20px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add</button>
        </div>

        {tab === "decor" && (
          <div>
            {adding && (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <select value={newDecor.category} onChange={e => setNewDecor({...newDecor, category: e.target.value})} style={inp()}>
                    {DECOR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input placeholder="Item" value={newDecor.item} onChange={e => setNewDecor({...newDecor, item: e.target.value})} style={inp()} />
                  <input placeholder="Qty" value={newDecor.quantity} onChange={e => setNewDecor({...newDecor, quantity: e.target.value})} style={inp()} />
                  <input placeholder="Unit cost $" value={newDecor.cost} onChange={e => setNewDecor({...newDecor, cost: e.target.value})} style={inp()} />
                  <div style={{ display: "flex", alignItems: "center", padding: "7px 10px", background: "#faf8f5", borderRadius: "8px", fontSize: "0.82rem", color: "#b87333", border: "1px solid #e8e0d5" }}>
                    = ${((parseFloat(newDecor.quantity) || 0) * (parseFloat(newDecor.cost) || 0)).toFixed(2)}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr", gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Vendor" value={newDecor.vendor} onChange={e => setNewDecor({...newDecor, vendor: e.target.value})} style={inp()} />
                  <select value={newDecor.status} onChange={e => setNewDecor({...newDecor, status: e.target.value})} style={inp()}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input placeholder="Notes" value={newDecor.notes} onChange={e => setNewDecor({...newDecor, notes: e.target.value})} style={inp()} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addDecor} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
            {DECOR_CATEGORIES.map(cat => {
              const items = decor.filter(d => d.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "8px" }}>{cat.toUpperCase()}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                    {items.map(item => (
                      <div key={item.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e8e0d5" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                          <div style={{ fontSize: "0.9rem", color: "#2c1810", fontWeight: 500 }}>
                            {editing === item.id ? <input value={editData.item || ""} onChange={e => setEditData({...editData, item: e.target.value})} style={editInp({ width: "120px" })} /> : item.item}
                          </div>
                          {editing === item.id ? (
                            <select value={editData.status || ""} onChange={e => setEditData({...editData, status: e.target.value})} style={editInp()}>
                              {STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: statusColors[item.status]?.bg, color: statusColors[item.status]?.color }}>{item.status}</span>
                          )}
                        </div>
                        {editing === item.id ? (
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
                              <input placeholder="Qty" value={editData.quantity || ""} onChange={e => setEditData({...editData, quantity: e.target.value})} style={editInp()} />
                              <input placeholder="Unit cost" value={editData.unit_cost || ""} onChange={e => setEditData({...editData, unit_cost: e.target.value})} style={editInp()} />
                              <div style={{ padding: "4px 7px", background: "#faf8f5", borderRadius: "6px", fontSize: "12px", color: "#b87333" }}>
                                = ${((parseFloat(editData.quantity) || 0) * (parseFloat(editData.unit_cost) || 0)).toFixed(2)}
                              </div>
                            </div>
                            <input placeholder="Decision" value={editData.decision || ""} onChange={e => setEditData({...editData, decision: e.target.value})} style={editInp({ width: "100%" })} />
                            <input placeholder="Vendor" value={editData.vendor || ""} onChange={e => setEditData({...editData, vendor: e.target.value})} style={editInp({ width: "100%" })} />
                            <input placeholder="Notes" value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} style={editInp({ width: "100%" })} />
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => saveEdit("planning_decor", item.id)} style={{ padding: "4px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Save</button>
                              <button onClick={() => setEditing(null)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {item.quantity > 0 && <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>Qty: {item.quantity}</div>}
                            {item.decision && item.decision !== "TBD" && <div style={{ fontSize: "0.8rem", color: "#2c1810", marginBottom: "4px" }}>→ {item.decision}</div>}
                            {item.vendor && <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>Vendor: {item.vendor}</div>}
                            {item.cost > 0 && <div style={{ fontSize: "0.85rem", color: "#b87333", fontWeight: 500, marginTop: "4px" }}>${Number(item.cost).toFixed(2)}</div>}
                            {item.notes && <div style={{ fontSize: "0.75rem", color: "#aaa", marginTop: "4px", fontStyle: "italic" }}>{item.notes}</div>}
                            <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                              <button onClick={() => { setEditing(item.id); setEditData({...item, unit_cost: item.quantity > 0 ? (item.cost / item.quantity).toFixed(2) : item.cost}); }} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", cursor: "pointer", color: "#8b7355" }}>Edit</button>
                              <button onClick={() => deleteItem("planning_decor", item.id)} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #f0ebe4", borderRadius: "6px", cursor: "pointer", color: "#c0392b" }}>Remove</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "refreshments" && (
          <div>
            {adding && (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Item" value={newRefresh.item} onChange={e => setNewRefresh({...newRefresh, item: e.target.value})} style={inp()} />
                  <input placeholder="Vendor" value={newRefresh.vendor} onChange={e => setNewRefresh({...newRefresh, vendor: e.target.value})} style={inp()} />
                  <input placeholder="Qty" value={newRefresh.quantity_num} onChange={e => setNewRefresh({...newRefresh, quantity_num: e.target.value})} style={inp()} />
                  <input placeholder="Unit cost $" value={newRefresh.cost} onChange={e => setNewRefresh({...newRefresh, cost: e.target.value})} style={inp()} />
                  <div style={{ display: "flex", alignItems: "center", padding: "7px 10px", background: "#faf8f5", borderRadius: "8px", fontSize: "0.82rem", color: "#4a7c59", border: "1px solid #e8e0d5" }}>
                    = ${((parseFloat(newRefresh.quantity_num) || 0) * (parseFloat(newRefresh.cost) || 0)).toFixed(2)}
                  </div>
                </div>
                <input placeholder="Notes" value={newRefresh.notes} onChange={e => setNewRefresh({...newRefresh, notes: e.target.value})} style={inp({ width: "100%", marginBottom: "8px", boxSizing: "border-box" })} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addRefresh} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e8e0d5", overflow: "hidden" }}>
              {refresh.length === 0 && <p style={{ padding: "1rem", fontSize: "0.85rem", color: "#8b7355" }}>No refreshments added yet.</p>}
              {refresh.map((item, i) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: i < refresh.length - 1 ? "1px solid #f0ebe4" : "none" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4a7c59", flexShrink: 0 }} />
                  {editing === item.id ? (
                    <div style={{ display: "flex", gap: "6px", flex: 1, flexWrap: "wrap" as const }}>
                      <input value={editData.item || ""} onChange={e => setEditData({...editData, item: e.target.value})} style={editInp({ width: "120px" })} />
                      <input value={editData.vendor || ""} onChange={e => setEditData({...editData, vendor: e.target.value})} placeholder="Vendor" style={editInp({ width: "100px" })} />
                      <input value={editData.quantity_num || ""} onChange={e => setEditData({...editData, quantity_num: e.target.value})} placeholder="Qty" style={editInp({ width: "50px" })} />
                      <input value={editData.unit_cost || ""} onChange={e => setEditData({...editData, unit_cost: e.target.value})} placeholder="Unit $" style={editInp({ width: "60px" })} />
                      <div style={{ padding: "4px 7px", background: "#faf8f5", borderRadius: "6px", fontSize: "12px", color: "#4a7c59" }}>
                        = ${((parseFloat(editData.quantity_num) || 0) * (parseFloat(editData.unit_cost) || 0)).toFixed(2)}
                      </div>
                      <input value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} placeholder="Notes" style={editInp({ width: "100px" })} />
                      <button onClick={() => saveEdit("planning_refreshments", item.id)} style={{ padding: "3px 8px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Save</button>
                      <button onClick={() => setEditing(null)} style={{ padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>{item.item}</div>
                        <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                          {item.vendor && item.vendor !== "TBD" && <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>Vendor: {item.vendor}</span>}
                          {item.quantity_num > 0 && <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>Qty: {item.quantity_num}</span>}
                          {item.cost > 0 && <span style={{ fontSize: "0.85rem", color: "#4a7c59", fontWeight: 500 }}>${Number(item.cost).toFixed(2)}</span>}
                          {item.notes && <span style={{ fontSize: "0.75rem", color: "#aaa", fontStyle: "italic" }}>{item.notes}</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => { setEditing(item.id); setEditData({...item, unit_cost: item.quantity_num > 0 ? (item.cost / item.quantity_num).toFixed(2) : item.cost}); }} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", cursor: "pointer", color: "#8b7355" }}>Edit</button>
                        <button onClick={() => deleteItem("planning_refreshments", item.id)} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #f0ebe4", borderRadius: "6px", cursor: "pointer", color: "#c0392b" }}>Remove</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "staff" && (
          <div>
            {adding && (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Full name" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} style={inp()} />
                  <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} style={inp()}>
                    {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <input placeholder="Pay rate $/hr" value={newStaff.pay_rate} onChange={e => setNewStaff({...newStaff, pay_rate: e.target.value})} style={inp()} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Phone" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} style={inp()} />
                  <input placeholder="Email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} style={inp()} />
                  <input placeholder="Instagram @" value={newStaff.instagram} onChange={e => setNewStaff({...newStaff, instagram: e.target.value})} style={inp()} />
                </div>
                <input placeholder="Notes" value={newStaff.notes} onChange={e => setNewStaff({...newStaff, notes: e.target.value})} style={inp({ width: "100%", marginBottom: "8px", boxSizing: "border-box" })} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addStaff} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "10px" }}>
              {staff.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No staff added yet.</p>}
              {staff.map(member => {
                const totalHours = (member.shifts || []).reduce((h, s) => h + Number(s.hours), 0);
                const totalPay = totalHours * Number(member.pay_rate);
                return (
                  <div key={member.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                      <div>
                        {editing === member.id ? <input value={editData.name || ""} onChange={e => setEditData({...editData, name: e.target.value})} style={editInp({ width: "140px", marginBottom: "4px" })} /> : <div style={{ fontSize: "1rem", color: "#2c1810", fontWeight: 500 }}>{member.name}</div>}
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: (roleColors[member.role] || "#b87333") + "22", color: roleColors[member.role] || "#b87333" }}>{member.role}</span>
                      </div>
                      <div style={{ textAlign: "right" as const }}>
                        <div style={{ fontSize: "0.85rem", color: "#8b7355" }}>${Number(member.pay_rate).toFixed(0)}/hr</div>
                        {totalHours > 0 && <div style={{ fontSize: "1rem", color: "#b87333", fontWeight: 500 }}>${totalPay.toFixed(2)}</div>}
                        {totalHours > 0 && <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>{totalHours}hrs total</div>}
                      </div>
                    </div>

                    {editing === member.id ? (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                        <select value={editData.role || ""} onChange={e => setEditData({...editData, role: e.target.value})} style={editInp({ width: "100%" })}>
                          {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                        </select>
                        <input placeholder="Pay rate $/hr" value={editData.pay_rate || ""} onChange={e => setEditData({...editData, pay_rate: e.target.value})} style={editInp({ width: "100%" })} />
                        <input placeholder="Phone" value={editData.phone || ""} onChange={e => setEditData({...editData, phone: e.target.value})} style={editInp({ width: "100%" })} />
                        <input placeholder="Email" value={editData.email || ""} onChange={e => setEditData({...editData, email: e.target.value})} style={editInp({ width: "100%" })} />
                        <input placeholder="Instagram @" value={editData.instagram || ""} onChange={e => setEditData({...editData, instagram: e.target.value})} style={editInp({ width: "100%" })} />
                        <input placeholder="Notes" value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} style={editInp({ width: "100%" })} />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => saveEdit("planning_staff", member.id)} style={{ padding: "4px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditing(null)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {member.phone && <div style={{ fontSize: "0.78rem", color: "#8b7355", marginBottom: "2px" }}>📞 {member.phone}</div>}
                        {member.email && <div style={{ fontSize: "0.78rem", color: "#8b7355", marginBottom: "2px" }}>✉️ {member.email}</div>}
                        {member.instagram && <div style={{ fontSize: "0.78rem", color: "#8b7355", marginBottom: "2px" }}>📸 {member.instagram}</div>}
                        {member.notes && <div style={{ fontSize: "0.75rem", color: "#aaa", fontStyle: "italic", marginTop: "4px" }}>{member.notes}</div>}

                        <div style={{ marginTop: "10px", borderTop: "1px solid #f0ebe4", paddingTop: "10px" }}>
                          <div style={{ fontSize: "0.72rem", color: "#8b7355", letterSpacing: "0.05em", marginBottom: "6px" }}>SHIFTS</div>
                          {(member.shifts || []).map(shift => (
                            <div key={shift.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid #f8f5f0", fontSize: "0.8rem" }}>
                              <div style={{ color: "#2c1810" }}>{shift.shift_date}</div>
                              <div style={{ color: "#8b7355" }}>{shift.start_time} – {shift.end_time}</div>
                              <div style={{ color: "#b87333" }}>{shift.hours}hrs</div>
                              <button onClick={() => deleteShift(member.id, shift.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                            </div>
                          ))}

                          {addingShift === member.id ? (
                            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                              <select value={newShift.shift_date} onChange={e => setNewShift({...newShift, shift_date: e.target.value})} style={editInp({ width: "100%" })}>
                                {EVENT_DAYS.map(d => <option key={d}>{d}</option>)}
                              </select>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                                <input placeholder="Start e.g. 10am" value={newShift.start_time} onChange={e => setNewShift({...newShift, start_time: e.target.value})} style={editInp()} />
                                <input placeholder="End e.g. 6pm" value={newShift.end_time} onChange={e => setNewShift({...newShift, end_time: e.target.value})} style={editInp()} />
                              </div>
                              {newShift.start_time && newShift.end_time && (
                                <div style={{ fontSize: "11px", color: "#b87333" }}>= {calcHours(newShift.start_time, newShift.end_time)} hrs · ${(calcHours(newShift.start_time, newShift.end_time) * Number(member.pay_rate)).toFixed(2)}</div>
                              )}
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button onClick={() => addShift(member.id)} style={{ padding: "4px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Add shift</button>
                                <button onClick={() => setAddingShift(null)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setAddingShift(member.id); setNewShift({ shift_date: "Fri Sep 11", start_time: "", end_time: "" }); }} style={{ marginTop: "6px", fontSize: "11px", padding: "3px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", cursor: "pointer", color: "#8b7355" }}>+ Add shift</button>
                          )}
                        </div>

                        <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                          <button onClick={() => { setEditing(member.id); setEditData({...member}); }} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", cursor: "pointer", color: "#8b7355" }}>Edit</button>
                          <button onClick={() => deleteItem("planning_staff", member.id)} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #f0ebe4", borderRadius: "6px", cursor: "pointer", color: "#c0392b" }}>Remove</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}