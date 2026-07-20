"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MarketingItem = {
  id: number;
  event: string;
  task: string;
  due_date: string;
  channel: string;
  completed: boolean;
  assigned_to?: string;
  notes?: string;
};

const PLATFORMS = ["Instagram", "TikTok", "Meta Ads", "Email", "Twitter/X", "Pinterest", "WhatsApp", "General"];

type Props = { event: string; };

export default function MarketingPlans({ event }: Props) {
  const [items, setItems] = useState<MarketingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newItem, setNewItem] = useState({ task: "", due_date: "", channel: "Instagram", assigned_to: "", notes: "" });

  useEffect(() => { fetchItems(); }, [event]);

  const fetchItems = async () => {
    const { data } = await supabase.from("marketing_deadlines").select("*").eq("event", event).order("due_date");
    if (data) setItems(data);
    setLoading(false);
  };

  const addItem = async () => {
    if (!newItem.task.trim() || !newItem.due_date) return;
    const { data } = await supabase.from("marketing_deadlines").insert({
      event, task: newItem.task, due_date: newItem.due_date,
      channel: newItem.channel, assigned_to: newItem.assigned_to || null,
      notes: newItem.notes || null, completed: false,
    }).select().single();
    if (data) setItems(prev => [...prev, data].sort((a, b) => a.due_date.localeCompare(b.due_date)));
    setNewItem({ task: "", due_date: "", channel: "Instagram", assigned_to: "", notes: "" });
    setAdding(false);
  };

  const toggleComplete = async (item: MarketingItem) => {
    await supabase.from("marketing_deadlines").update({ completed: !item.completed }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
  };

  const deleteItem = async (id: number) => {
    await supabase.from("marketing_deadlines").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const isOverdue = (item: MarketingItem) => !item.completed && item.due_date && new Date(item.due_date) < new Date();
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const grouped: Record<string, MarketingItem[]> = {};
  PLATFORMS.forEach(p => {
    const channelItems = items.filter(i => i.channel === p);
    if (channelItems.length > 0) grouped[p] = channelItems;
  });
  items.forEach(item => {
    if (!PLATFORMS.includes(item.channel) && item.channel) {
      if (!grouped[item.channel]) grouped[item.channel] = [];
      if (!grouped[item.channel].find(i => i.id === item.id)) grouped[item.channel].push(item);
    }
  });

  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const overdueItems = items.filter(i => isOverdue(i)).length;

  const inp = (style?: object) => ({ padding: "7px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif", ...style });

  if (loading) return <div style={{ fontSize: "0.85rem", color: "#8b7355" }}>Loading...</div>;

  return (
    <div style={{ fontFamily: "Georgia, serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", color: "#2c1810", fontWeight: "normal", margin: 0 }}>Marketing Plans</h2>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "#8b7355" }}>{completedItems}/{totalItems} done</span>
          {overdueItems > 0 && <span style={{ fontSize: "0.7rem", color: "#c0392b", background: "#c0392b11", padding: "2px 8px", borderRadius: "20px" }}>{overdueItems} overdue</span>}
        </div>
        <button onClick={() => setAdding(!adding)} style={{ padding: "5px 12px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add task</button>
      </div>

      {totalItems > 0 && (
        <div style={{ height: "3px", background: "#f0ebe4", borderRadius: "2px", marginBottom: "1rem" }}>
          <div style={{ height: "100%", width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%`, background: "#4a7c59", borderRadius: "2px" }} />
        </div>
      )}

      {adding && (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Task e.g. Post event teaser" value={newItem.task} onChange={e => setNewItem({...newItem, task: e.target.value})} style={inp()} />
            <select value={newItem.channel} onChange={e => setNewItem({...newItem, channel: e.target.value})} style={inp()}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" value={newItem.due_date} onChange={e => setNewItem({...newItem, due_date: e.target.value})} style={inp()} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Assigned to (optional)" value={newItem.assigned_to} onChange={e => setNewItem({...newItem, assigned_to: e.target.value})} style={inp()} />
            <input placeholder="Notes (optional)" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} style={inp()} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addItem} style={{ padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem", color: "#8b7355", fontSize: "0.82rem" }}>No marketing tasks yet.</div>
      ) : (
        Object.entries(grouped).map(([channel, channelItems]) => {
          const done = channelItems.filter(i => i.completed).length;
          const isCollapsed = collapsed[channel];
          return (
            <div key={channel} style={{ marginBottom: "0.75rem", background: "#fff", borderRadius: "10px", border: "1px solid #e8e0d5", overflow: "hidden" }}>
              <div onClick={() => setCollapsed(prev => ({...prev, [channel]: !prev[channel]}))} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", background: "#faf8f5" }}>
                <span style={{ fontSize: "0.82rem", color: "#2c1810", fontWeight: 500, flex: 1 }}>{channel}</span>
                <span style={{ fontSize: "0.7rem", color: "#8b7355" }}>{done}/{channelItems.length}</span>
                <span style={{ fontSize: "0.7rem", color: "#8b7355" }}>{isCollapsed ? "▸" : "▾"}</span>
              </div>
              {!isCollapsed && channelItems.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "9px 14px", borderTop: "1px solid #f0ebe4", background: isOverdue(item) ? "#fff8f8" : "#fff" }}>
                  <div onClick={() => toggleComplete(item)} style={{ width: "17px", height: "17px", borderRadius: "50%", border: item.completed ? "none" : "1.5px solid #d4c5b0", background: item.completed ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: "2px" }}>
                    {item.completed && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", color: item.completed ? "#b0a090" : "#2c1810", textDecoration: item.completed ? "line-through" : "none" }}>{item.task}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "2px", flexWrap: "wrap" as const }}>
                      <span style={{ fontSize: "0.7rem", color: isOverdue(item) ? "#c0392b" : "#8b7355" }}>{isOverdue(item) ? "⚠ " : ""}Due {formatDate(item.due_date)}</span>
                      {item.assigned_to && <span style={{ fontSize: "0.7rem", color: "#b87333" }}>→ {item.assigned_to}</span>}
                      {item.notes && <span style={{ fontSize: "0.7rem", color: "#aaa", fontStyle: "italic" }}>{item.notes}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
