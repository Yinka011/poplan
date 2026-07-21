"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sendNotification } from "@/lib/notifications";
import Link from "next/link";
import { useParams } from "next/navigation";

type Deadline = {
  id: number;
  task: string;
  due_date: string;
  category: string;
};

const CATEGORIES = ["Admin", "Marketing", "Operations", "Logistics"];

const categoryColors: Record<string, string> = {
  Admin: "#b87333",
  Marketing: "#4a7c59",
  Operations: "#5b7fa6",
  Logistics: "#8b6ab0",
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

export default function TasksPage() {
  const params = useParams();
  const slug = params.slug as string;
  const city = slug.charAt(0).toUpperCase() + slug.slice(1);

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [newItem, setNewItem] = useState({ task: "", due_date: "", category: "Admin" });
  const [editItem, setEditItem] = useState({ task: "", due_date: "", category: "Admin" });

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    const { data } = await supabase
      .from("event_deadlines")
      .select("*")
      .eq("event", city)
      .order("id");
    if (data) setDeadlines(data);
  };

  const addDeadline = async () => {
    if (!newItem.task.trim()) return;
    const { data } = await supabase.from("event_deadlines").insert({
      event: city,
      task: newItem.task,
      due_date: newItem.due_date,
      category: newItem.category,
    }).select().single();
    if (data) {
      setDeadlines(prev => [...prev, data]);
      if (data.brand_email) {
        await sendNotification({ recipientEmail: data.brand_email, eventSlug: slug as string, type: 'task', title: 'New task assigned', message: data.task, link: '/brand/portal' });
      }
    }
    setNewItem({ task: "", due_date: "", category: "Admin" });
    setAdding(false);
  };

  const startEdit = (deadline: Deadline) => {
    setEditing(deadline.id);
    setEditItem({ task: deadline.task, due_date: deadline.due_date, category: deadline.category });
  };

  const saveEdit = async (id: number) => {
    await supabase.from("event_deadlines").update({
      task: editItem.task,
      due_date: editItem.due_date,
      category: editItem.category,
    }).eq("id", id);
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, ...editItem } : d));
    setEditing(null);
  };

  const deleteDeadline = async (id: number) => {
    if (!confirm("Remove this task from all brand portals?")) return;
    await supabase.from("event_deadlines").delete().eq("id", id);
    setDeadlines(prev => prev.filter(d => d.id !== id));
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = deadlines.filter(d => d.category === cat);
    return acc;
  }, {} as Record<string, Deadline[]>);

  const inp = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ padding: "7px 10px", border: "1px solid #e8e0d5", borderRadius: "7px", fontSize: "0.85rem", fontFamily: "Georgia, serif", width: "100%", boxSizing: "border-box" as const }}
    />
  );

  const sel = (value: string, onChange: (v: string) => void) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ padding: "7px 10px", border: "1px solid #e8e0d5", borderRadius: "7px", fontSize: "0.85rem", fontFamily: "Georgia, serif", background: "#fff" }}
    >
      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
    </select>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.85rem", color: "#8b7355", textDecoration: "none" }}>← Back to {city}</Link>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", marginTop: "0.5rem" }}>Brand To-Do List Manager</h1>
          <p style={{ color: "#8b7355", fontSize: "0.9rem", marginTop: "4px" }}>Every task here appears in all brand portals automatically. {deadlines.length} tasks total.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "1rem", color: "#2c1810" }}>All tasks</div>
            <button onClick={() => setAdding(!adding)} style={{ fontSize: "0.8rem", padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add task</button>
          </div>

          {adding && (
            <div style={{ background: "#faf8f5", borderRadius: "12px", padding: "1rem", marginBottom: "1.25rem", border: "1px solid #e8e0d5" }}>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px", marginBottom: "8px" }}>
                {inp(newItem.task, v => setNewItem({...newItem, task: v}), "Task description")}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {inp(newItem.due_date, v => setNewItem({...newItem, due_date: v}), "Due date e.g. Aug 15")}
                  {sel(newItem.category, v => setNewItem({...newItem, category: v}))}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={addDeadline} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save</button>
                <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {CATEGORIES.map(cat => {
            const catDeadlines = grouped[cat];
            if (!catDeadlines || catDeadlines.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: "1.5rem" }}>
                <div style={{ fontSize: "0.7rem", letterSpacing: "0.1em", color: categoryColors[cat], marginBottom: "8px", fontWeight: 600 }}>{cat.toUpperCase()} — {catDeadlines.length} tasks</div>
                {catDeadlines.map(deadline => (
                  <div key={deadline.id} style={{ borderRadius: "10px", border: "1px solid #f0ebe4", background: "#faf8f5", padding: "10px 12px", marginBottom: "6px" }}>
                    {editing === deadline.id ? (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                        {inp(editItem.task, v => setEditItem({...editItem, task: v}), "Task")}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                          {inp(editItem.due_date, v => setEditItem({...editItem, due_date: v}), "Due date")}
                          {sel(editItem.category, v => setEditItem({...editItem, category: v}))}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => saveEdit(deadline.id)} style={{ padding: "5px 12px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditing(null)} style={{ padding: "5px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: "0.88rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>{deadline.task}</div>
                          <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>Due {deadline.due_date}</div>
                        </div>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button onClick={() => startEdit(deadline)} title="Edit" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: "5px", color: "#b87333", display: "flex", alignItems: "center", opacity: 0.7 }} onMouseEnter={e => { e.currentTarget.style.background = "#f0ebe4"; e.currentTarget.style.opacity = "1"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.7"; }}>
                            <PencilIcon />
                          </button>
                          <button onClick={() => deleteDeadline(deadline.id)} title="Delete" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: "5px", color: "#b87333", display: "flex", alignItems: "center", opacity: 0.7 }} onMouseEnter={e => { e.currentTarget.style.background = "#f0ebe4"; e.currentTarget.style.opacity = "1"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.7"; }}>
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fdf8f3", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.85rem", color: "#b87333", marginBottom: "4px", fontWeight: 500 }}>How this works</div>
          <div style={{ fontSize: "0.82rem", color: "#8b7355", lineHeight: 1.7 }}>
            Every task you add here automatically appears in all brand portals under their to-do list. When a brand checks off a task it saves to the database and you can see their progress on each brand page. Deleting a task removes it from all brand portals.
          </div>
        </div>

      </div>
    </div>
  );
}