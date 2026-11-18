"use client";
import { useOrganizer } from "@/context/OrganizerContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingView from "@/components/LoadingView";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

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
  const { organizerEmail, loading: organizerLoading } = useOrganizer();
  const [items, setItems] = useState<MarketingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);

  const [adding, setAdding] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editData, setEditData] = useState({ task: "", due_date: "", channel: "Instagram", assigned_to: "", notes: "" });
  const [newItem, setNewItem] = useState({ task: "", due_date: "", channel: "Instagram", assigned_to: "", notes: "" });

  useEffect(() => {
    if (organizerLoading) return;
    let active = true;
    setLoading(true);
    setLoadError("");

    const fetchItems = async () => {
      try {
        if (!organizerEmail) throw new Error("Please sign in to view marketing plans.");
        const { data, error } = await supabase.from("marketing_deadlines").select("*").eq("event", event).eq("organizer_email", organizerEmail).order("due_date");
        if (error) throw error;
        if (active) setItems(data || []);
      } catch (error) {
        console.error("Failed to load marketing plans:", error);
        if (active) setLoadError("Could not load marketing plans. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchItems();
    return () => { active = false; };
  }, [event, organizerEmail, organizerLoading, retry]);

  const addItem = async () => {
    if (savingNew) return;
    if (!newItem.task.trim() || !newItem.due_date) {
      alert("Enter a task description and due date.");
      return;
    }
    if (!organizerEmail) {
      alert("Please sign in before adding a task.");
      return;
    }
    setSavingNew(true);
    try {
      const { data, error } = await supabase.from("marketing_deadlines").insert({ organizer_email: organizerEmail,
        event, task: newItem.task, due_date: newItem.due_date,
        channel: newItem.channel, assigned_to: newItem.assigned_to || null,
        notes: newItem.notes || null, completed: false,
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The new marketing task was not returned.");
      setItems(prev => [...prev.filter(item => item.id !== data.id), data].sort((a, b) => a.due_date.localeCompare(b.due_date)));
      setNewItem({ task: "", due_date: "", channel: "Instagram", assigned_to: "", notes: "" });
      setAdding(false);
    } catch (error) {
      console.error("Failed to add marketing task:", error);
      alert("Could not add the task. Please try again.");
    } finally {
      setSavingNew(false);
    }
  };

  const toggleComplete = async (item: MarketingItem) => {
    await supabase.from("marketing_deadlines").update({ completed: !item.completed }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
  };

  const saveEdit = async (id: number) => {
    if (savingEdit) return;
    if (!editData.task.trim() || !editData.due_date) {
      alert("Enter a task description and due date.");
      return;
    }
    setSavingEdit(true);
    try {
      const { data, error } = await supabase.from("marketing_deadlines").update({
        task: editData.task, due_date: editData.due_date, channel: editData.channel,
        assigned_to: editData.assigned_to || null, notes: editData.notes || null
      }).eq("id", id).select().single();
      if (error) throw error;
      if (!data) throw new Error("The updated marketing task was not returned.");
      setItems(prev => prev.map(item => item.id === id ? data : item));
      setEditing(null);
    } catch (error) {
      console.error("Failed to update marketing task:", error);
      alert("Could not save the task. Please try again.");
    } finally {
      setSavingEdit(false);
    }
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

  const inp = (style?: object) => ({ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  ...style });

  return (
    <LoadingView loading={loading || organizerLoading} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<DashboardSkeleton section="marketing" />}>
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1rem", color: "#1B3A2D", fontWeight: "normal", margin: 0 }}>Marketing Plans</h2>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "#4a5a52" }}>{completedItems}/{totalItems} done</span>
          {overdueItems > 0 && <span style={{ fontSize: "0.7rem", color: "#c0392b", background: "#c0392b11", padding: "2px 8px", borderRadius: "20px" }}>{overdueItems} overdue</span>}
        </div>
        <button onClick={() => setAdding(!adding)} disabled={savingNew} style={{ padding: "5px 12px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>+ Add task</button>
      </div>

      {totalItems > 0 && (
        <div style={{ height: "3px", background: "#f0f4f1", borderRadius: "2px", marginBottom: "1rem" }}>
          <div style={{ height: "100%", width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%`, background: "#4a7c59", borderRadius: "2px" }} />
        </div>
      )}

      {adding && (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #e4ebe6" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Task e.g. Post event teaser" disabled={savingNew} value={newItem.task} onChange={e => setNewItem({...newItem, task: e.target.value})} style={inp()} />
            <select value={newItem.channel} disabled={savingNew} onChange={e => setNewItem({...newItem, channel: e.target.value})} style={inp()}>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input type="date" disabled={savingNew} value={newItem.due_date} onChange={e => setNewItem({...newItem, due_date: e.target.value})} style={inp()} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Assigned to (optional)" disabled={savingNew} value={newItem.assigned_to} onChange={e => setNewItem({...newItem, assigned_to: e.target.value})} style={inp()} />
            <input placeholder="Notes (optional)" disabled={savingNew} value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} style={inp()} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addItem} disabled={savingNew} style={{ padding: "6px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>{savingNew ? "Saving..." : "Save"}</button>
            <button onClick={() => setAdding(false)} disabled={savingNew} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem", color: "#4a5a52", fontSize: "0.82rem" }}>No marketing tasks yet.</div>
      ) : (
        Object.entries(grouped).map(([channel, channelItems]) => {
          const done = channelItems.filter(i => i.completed).length;
          const isCollapsed = collapsed[channel];
          return (
            <div key={channel} style={{ marginBottom: "0.75rem", background: "#fff", borderRadius: "10px", border: "1px solid #e4ebe6", overflow: "hidden" }}>
              <div onClick={() => { if (!savingEdit || !channelItems.some(item => item.id === editing)) setCollapsed(prev => ({...prev, [channel]: !prev[channel]})); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", background: "#f8faf8" }}>
                <span style={{ fontSize: "0.82rem", color: "#1B3A2D", fontWeight: 500, flex: 1 }}>{channel}</span>
                <span style={{ fontSize: "0.7rem", color: "#4a5a52" }}>{done}/{channelItems.length}</span>
                <span style={{ fontSize: "0.7rem", color: "#4a5a52" }}>{isCollapsed ? "▸" : "▾"}</span>
              </div>
              {!isCollapsed && channelItems.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "9px 14px", borderTop: "1px solid #f0f4f1", background: isOverdue(item) ? "#fff8f8" : "#fff" }}>
                  <div onClick={() => { if (!savingEdit || editing !== item.id) void toggleComplete(item); }} style={{ width: "17px", height: "17px", borderRadius: "50%", border: item.completed ? "none" : "1.5px solid #d4c5b0", background: item.completed ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: "2px" }}>
                    {item.completed && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                  </div>
                  {editing === item.id ? (
                    <div style={{ flex: 1, display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                      <input value={editData.task} disabled={savingEdit} onChange={e => setEditData({...editData, task: e.target.value})} style={{ flex: 1, padding: "5px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.78rem",  minWidth: "150px" }} />
                      <select value={editData.channel} disabled={savingEdit} onChange={e => setEditData({...editData, channel: e.target.value})} style={{ padding: "5px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.78rem" }}>
                        {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                      </select>
                      <input type="date" value={editData.due_date} disabled={savingEdit} onChange={e => setEditData({...editData, due_date: e.target.value})} style={{ padding: "5px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.78rem" }} />
                      <input placeholder="Assigned to" value={editData.assigned_to} disabled={savingEdit} onChange={e => setEditData({...editData, assigned_to: e.target.value})} style={{ padding: "5px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.78rem",  width: "110px" }} />
                      <button onClick={() => saveEdit(item.id)} disabled={savingEdit} style={{ padding: "4px 10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer" }}>{savingEdit ? "Saving..." : "Save"}</button>
                      <button onClick={() => setEditing(null)} disabled={savingEdit} style={{ padding: "4px 8px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.85rem", color: item.completed ? "#b0a090" : "#1B3A2D", textDecoration: item.completed ? "line-through" : "none" }}>{item.task}</div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "2px", flexWrap: "wrap" as const }}>
                        <span style={{ fontSize: "0.7rem", color: isOverdue(item) ? "#c0392b" : "#4a5a52" }}>{isOverdue(item) ? "⚠ " : ""}Due {formatDate(item.due_date)}</span>
                        {item.assigned_to && <span style={{ fontSize: "0.7rem", color: "#E8C97A" }}>→ {item.assigned_to}</span>}
                        {item.notes && <span style={{ fontSize: "0.7rem", color: "#aaa", fontStyle: "italic" }}>{item.notes}</span>}
                      </div>
                    </div>
                  )}
                  {editing !== item.id && <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => { setEditing(item.id); setEditData({ task: item.task, due_date: item.due_date || "", channel: item.channel, assigned_to: item.assigned_to || "", notes: item.notes || "" }); }} disabled={savingEdit} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#4a5a52")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✎</button>
                    <button onClick={() => deleteItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                  </div>}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
    </LoadingView>
  );
}
