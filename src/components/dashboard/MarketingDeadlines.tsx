"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MarketingDeadline = {
  id: number;
  task: string;
  due_date: string;
  channel: string;
};

const PencilIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export function MarketingDeadlines({ city }: { city: string }) {
  const [items, setItems] = useState<MarketingDeadline[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ task: "", due_date: "", channel: "" });
  const [editItem, setEditItem] = useState({ task: "", due_date: "", channel: "" });

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("marketing-deadlines")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_deadlines" }, fetchItems)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("marketing_deadlines")
      .select("*")
      .eq("event", city)
      .order("id");
    if (data) setItems(data);
  };

  const addItem = async () => {
    if (!newItem.task.trim()) return;
    const { data } = await supabase.from("marketing_deadlines").insert({
      event: city,
      task: newItem.task,
      due_date: newItem.due_date,
      channel: newItem.channel,
    }).select().single();
    if (data) setItems(prev => [...prev, data]);
    setNewItem({ task: "", due_date: "", channel: "" });
    setAdding(false);
  };

  const startEdit = (item: MarketingDeadline) => {
    setEditing(item.id);
    setEditItem({ task: item.task, due_date: item.due_date, channel: item.channel });
  };

  const saveEdit = async (id: number) => {
    await supabase.from("marketing_deadlines").update({
      task: editItem.task,
      due_date: editItem.due_date,
      channel: editItem.channel,
    }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...editItem } : i));
    setEditing(null);
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Remove this deadline?")) return;
    await supabase.from("marketing_deadlines").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const inp = (value: string, onChange: (v: string) => void, placeholder: string, type = "text") => (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding: "6px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif", width: "100%", boxSizing: "border-box" as const }}
    />
  );

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontSize: "1.1rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>Marketing deadlines</div>
          <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>Upcoming campaigns for {city}</div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ fontSize: "0.8rem", padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add</button>
      </div>

      {adding && (
        <div style={{ background: "#faf8f5", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px", marginBottom: "8px" }}>
            {inp(newItem.task, v => setNewItem({...newItem, task: v}), "Task description")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {inp(newItem.due_date, v => setNewItem({...newItem, due_date: v}), "Due date e.g. Aug 15")}
              {inp(newItem.channel, v => setNewItem({...newItem, channel: v}), "Channel e.g. Instagram")}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addItem} style={{ padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
        {items.length === 0 && (
          <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No marketing deadlines yet.</p>
        )}
        {items.map(item => (
          <div key={item.id} style={{ borderRadius: "10px", border: "1px solid #f0ebe4", background: "#faf8f5", padding: "10px 12px" }}>
            {editing === item.id ? (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                {inp(editItem.task, v => setEditItem({...editItem, task: v}), "Task")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {inp(editItem.due_date, v => setEditItem({...editItem, due_date: v}), "Due date")}
                  {inp(editItem.channel, v => setEditItem({...editItem, channel: v}), "Channel")}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => saveEdit(item.id)} style={{ padding: "5px 12px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>Save</button>
                  <button onClick={() => setEditing(null)} style={{ padding: "5px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.88rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>{item.task}</div>
                  <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>{item.channel} · Due {item.due_date}</div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  <button onClick={() => startEdit(item)} title="Edit" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: "5px", color: "#b87333", display: "flex", alignItems: "center", opacity: 0.7 }} onMouseEnter={e => { e.currentTarget.style.background = "#f0ebe4"; e.currentTarget.style.opacity = "1"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.7"; }}>
                    <PencilIcon />
                  </button>
                  <button onClick={() => deleteItem(item.id)} title="Delete" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: "5px", color: "#b87333", display: "flex", alignItems: "center", opacity: 0.7 }} onMouseEnter={e => { e.currentTarget.style.background = "#f0ebe4"; e.currentTarget.style.opacity = "1"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.7"; }}>
                    <TrashIcon />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}