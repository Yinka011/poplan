"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sendNotification } from "@/lib/notifications";
import { sendEmail, emailTemplate } from "@/lib/email";
import LoadingView from "@/components/LoadingView";
import Link from "next/link";
import { useParams } from "next/navigation";
import TasksSkeleton from "./TasksSkeleton";

type Deadline = {
  id: number;
  task: string;
  due_date: string;
  category: string;
};

const CATEGORIES = ["Admin", "Marketing", "Operations", "Logistics"];

const categoryColors: Record<string, string> = {
  Admin: "#E8C97A",
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [retry, setRetry] = useState(0);
  const [adding, setAdding] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [newItem, setNewItem] = useState({ task: "", due_date: "", category: "Admin" });
  const [editItem, setEditItem] = useState({ task: "", due_date: "", category: "Admin" });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    const fetchDeadlines = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user?.email) throw new Error("Please sign in to view tasks.");
        const { data, error } = await supabase
          .from("event_deadlines")
          .select("*")
          .eq("event", city)
          .eq("organizer_email", user.email)
          .order("id");
        if (error) throw error;
        if (active) setDeadlines(data || []);
      } catch (error) {
        console.error("Failed to load brand tasks:", error);
        if (active) setLoadError("Could not load tasks. Please try again.");
      } finally {
        if (active) {
          setLoadedFor(slug);
          setLoading(false);
        }
      }
    };
    void fetchDeadlines();
    return () => { active = false; };
  }, [city, slug, retry]);

  const addDeadline = async () => {
    if (savingNew) return;
    if (!newItem.task.trim()) {
      alert("Enter a task description.");
      return;
    }
    setSavingNew(true);
    let added = false;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user?.email) throw new Error("Please sign in before adding a task.");
      const { data, error } = await supabase.from("event_deadlines").insert({
        organizer_email: user.email,
        event: city,
        task: newItem.task,
        due_date: newItem.due_date,
        category: newItem.category,
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The new task was not returned.");
      added = true;
      setDeadlines(prev => prev.some(deadline => deadline.id === data.id) ? prev : [...prev, data]);
      setNewItem({ task: "", due_date: "", category: "Admin" });
      setAdding(false);
      if (data.brand_email) {
        const [notification, email] = await Promise.allSettled([
          sendNotification({ recipientEmail: data.brand_email, eventSlug: slug, type: "task", title: "New task assigned", message: data.task, link: "/brand/portal" }),
          sendEmail({
            to: data.brand_email,
            subject: "New task assigned to you",
            html: emailTemplate({
              title: "You have a new task",
              message: data.task,
              buttonText: "View your tasks",
              buttonUrl: "https://nalpop.com/brand/portal",
            }),
          }),
        ]);
        if (notification.status === "rejected" || !notification.value || email.status === "rejected" || !email.value?.success) {
          throw new Error("Task notification or email could not be sent.");
        }
      }
    } catch (error) {
      console.error("Failed to add or notify about task:", error);
      alert(added
        ? "The task was added, but the brand notification could not be sent."
        : "Could not add the task. Please try again.");
    } finally {
      setSavingNew(false);
    }
  };

  const startEdit = (deadline: Deadline) => {
    setEditing(deadline.id);
    setEditItem({ task: deadline.task, due_date: deadline.due_date, category: deadline.category });
  };

  const saveEdit = async (id: number) => {
    if (savingEdit) return;
    if (!editItem.task.trim()) {
      alert("Enter a task description.");
      return;
    }
    setSavingEdit(true);
    try {
      const { data, error } = await supabase.from("event_deadlines").update({
        task: editItem.task,
        due_date: editItem.due_date,
        category: editItem.category,
      }).eq("id", id).select().single();
      if (error) throw error;
      if (!data) throw new Error("The updated task was not returned.");
      setDeadlines(prev => prev.map(d => d.id === id ? data : d));
      setEditing(null);
    } catch (error) {
      console.error("Failed to update brand task:", error);
      alert("Could not save the task. Please try again.");
    } finally {
      setSavingEdit(false);
    }
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

  const inp = (value: string, onChange: (v: string) => void, placeholder: string, disabled: boolean) => (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "7px", fontSize: "0.85rem",  width: "100%", boxSizing: "border-box" as const }}
    />
  );

  const sel = (value: string, onChange: (v: string) => void, disabled: boolean) => (
    <select
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      style={{ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "7px", fontSize: "0.85rem",  background: "#fff" }}
    >
      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
    </select>
  );

  return (
    <div className="[overflow-wrap:anywhere]" style={{ minHeight: "100vh", background: "#f8faf8",  padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <LoadingView loading={loading || loadedFor !== slug} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<TasksSkeleton />}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/organizer/events/${slug}`} style={{ fontSize: "0.85rem", color: "#4a5a52", textDecoration: "none" }}>← Back to {city}</Link>
          <h1 style={{ fontSize: "1.8rem", color: "#1B3A2D", fontWeight: "normal", marginTop: "0.5rem" }}>Brand To-Do List Manager</h1>
          <p style={{ color: "#4a5a52", fontSize: "0.9rem", marginTop: "4px" }}>Every task here appears in all brand portals automatically. {deadlines.length} tasks total.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "1rem", color: "#1B3A2D" }}>All tasks</div>
            <button onClick={() => setAdding(!adding)} disabled={savingNew} style={{ fontSize: "0.8rem", padding: "6px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>{savingNew ? "Saving..." : "+ Add task"}</button>
          </div>

          {adding && (
            <div style={{ background: "#f8faf8", borderRadius: "12px", padding: "1rem", marginBottom: "1.25rem", border: "1px solid #e4ebe6" }}>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px", marginBottom: "8px" }}>
                {inp(newItem.task, v => setNewItem({...newItem, task: v}), "Task description", savingNew)}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 [&>*]:min-w-0">
                  {inp(newItem.due_date, v => setNewItem({...newItem, due_date: v}), "Due date e.g. Aug 15", savingNew)}
                  {sel(newItem.category, v => setNewItem({...newItem, category: v}), savingNew)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={addDeadline} disabled={savingNew} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>{savingNew ? "Saving..." : "Save"}</button>
                <button onClick={() => setAdding(false)} disabled={savingNew} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
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
                  <div key={deadline.id} style={{ borderRadius: "10px", border: "1px solid #f0f4f1", background: "#f8faf8", padding: "10px 12px", marginBottom: "6px" }}>
                    {editing === deadline.id ? (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                        {inp(editItem.task, v => setEditItem({...editItem, task: v}), "Task", savingEdit)}
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 [&>*]:min-w-0">
                          {inp(editItem.due_date, v => setEditItem({...editItem, due_date: v}), "Due date", savingEdit)}
                          {sel(editItem.category, v => setEditItem({...editItem, category: v}), savingEdit)}
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => saveEdit(deadline.id)} disabled={savingEdit} style={{ padding: "5px 12px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>{savingEdit ? "Saving..." : "Save"}</button>
                          <button onClick={() => setEditing(null)} disabled={savingEdit} style={{ padding: "5px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{deadline.task}</div>
                          <div style={{ fontSize: "0.75rem", color: "#4a5a52", marginTop: "2px" }}>Due {deadline.due_date}</div>
                        </div>
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                          <button onClick={() => startEdit(deadline)} disabled={savingEdit} title="Edit" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: "5px", color: "#E8C97A", display: "flex", alignItems: "center", opacity: 0.7 }} onMouseEnter={e => { e.currentTarget.style.background = "#f0f4f1"; e.currentTarget.style.opacity = "1"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.7"; }}>
                            <PencilIcon />
                          </button>
                          <button onClick={() => deleteDeadline(deadline.id)} title="Delete" style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 5px", borderRadius: "5px", color: "#E8C97A", display: "flex", alignItems: "center", opacity: 0.7 }} onMouseEnter={e => { e.currentTarget.style.background = "#f0f4f1"; e.currentTarget.style.opacity = "1"; }} onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.opacity = "0.7"; }}>
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

        <div style={{ background: "#fdf8f3", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "0.85rem", color: "#E8C97A", marginBottom: "4px", fontWeight: 500 }}>How this works</div>
          <div style={{ fontSize: "0.82rem", color: "#4a5a52", lineHeight: 1.7 }}>
            Every task you add here automatically appears in all brand portals under their to-do list. When a brand checks off a task it saves to the database and you can see their progress on each brand page. Deleting a task removes it from all brand portals.
          </div>
        </div>

        </LoadingView>
      </div>
    </div>
  );
}