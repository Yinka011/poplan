"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ChecklistItem = {
  id: number;
  task: string;
  completed: boolean;
  owner: string;
  due_date: string;
  category?: string;
};

const CATEGORIES = ["Venue", "Brands", "Decor & Setup", "Signage", "Refreshments", "Staff", "Marketing", "Content", "Logistics", "Post Event", "General"];

const getInitials = (name: string) => {
  if (!name) return "";
  return name.trim().split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
};

const Avatar = ({ name }: { name: string }) => {
  const initials = getInitials(name);
  if (!initials) return null;
  const colors = ["#b87333", "#4a7c59", "#5b7fa6", "#8b6ab0", "#2c7873", "#a0522d"];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return (
    <div title={name} style={{ width: "22px", height: "22px", borderRadius: "50%", background: colors[colorIndex], display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: "9px", color: "#fff", fontWeight: 600, letterSpacing: "0.02em" }}>{initials}</span>
    </div>
  );
};

export default function Checklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCategory, setNewCategory] = useState("General");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState({ task: "", owner: "", due_date: "", category: "" });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("checklist-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from("checklist").select("*").eq("event", "Atlanta").order("id");
    if (data) setItems(data);
  };

  const toggleComplete = async (item: ChecklistItem) => {
    await supabase.from("checklist").update({ completed: !item.completed }).eq("id", item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: !i.completed } : i));
  };

  const addItem = async () => {
    if (!newTask.trim()) return;
    const { data } = await supabase.from("checklist").insert({
      task: newTask, owner: newOwner, due_date: newDate,
      completed: false, event: "Atlanta", category: newCategory
    }).select().single();
    if (data) setItems(prev => [...prev, data]);
    setNewTask(""); setNewOwner(""); setNewDate(""); setNewCategory("General");
    setAdding(false);
  };

  const saveEdit = async (id: number) => {
    await supabase.from("checklist").update({ task: editData.task, owner: editData.owner, due_date: editData.due_date, category: editData.category }).eq("id", id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...editData } : i));
    setEditing(null);
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Remove this task?")) return;
    await supabase.from("checklist").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const isOverdue = (item: ChecklistItem) => !item.completed && item.due_date && new Date(item.due_date) < new Date();
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const completed = items.filter(i => i.completed).length;
  const overdue = items.filter(i => isOverdue(i)).length;

  const filteredItems = filter === "All" ? items : items.filter(i => (i.category || "General") === filter);

  const grouped: Record<string, ChecklistItem[]> = {};
  CATEGORIES.forEach(cat => {
    const catItems = filteredItems.filter(i => (i.category || "General") === cat);
    if (catItems.length > 0) grouped[cat] = catItems;
  });
  const uncategorized = filteredItems.filter(i => !i.category || !CATEGORIES.includes(i.category));
  if (uncategorized.length > 0) grouped["General"] = [...(grouped["General"] || []), ...uncategorized.filter(u => !grouped["General"]?.find(g => g.id === u.id))];

  const inp = (style?: object) => ({ padding: "7px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif", ...style });

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <div>
          <div style={{ fontSize: "1.1rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>Event Checklist</div>
          <div style={{ display: "flex", gap: "10px", marginTop: "2px" }}>
            <span style={{ fontSize: "0.78rem", color: "#8b7355" }}>{completed}/{items.length} done</span>
            {overdue > 0 && <span style={{ fontSize: "0.72rem", color: "#c0392b", background: "#c0392b11", padding: "1px 7px", borderRadius: "20px" }}>{overdue} overdue</span>}
          </div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ fontSize: "0.8rem", padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add task</button>
      </div>

      {/* Progress */}
      <div style={{ height: "4px", background: "#f0ebe4", borderRadius: "2px", marginBottom: "1rem", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${items.length ? (completed/items.length)*100 : 0}%`, background: "#b87333", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1rem", flexWrap: "wrap" as const }}>
        {["All", ...CATEGORIES.filter(c => items.some(i => (i.category || "General") === c))].map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{ padding: "3px 10px", background: filter === cat ? "#2c1810" : "transparent", color: filter === cat ? "#fff" : "#8b7355", border: "1px solid " + (filter === cat ? "#2c1810" : "#e8e0d5"), borderRadius: "20px", fontSize: "0.7rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>{cat}</button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div style={{ background: "#faf8f5", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
          <input placeholder="Task description" value={newTask} onChange={e => setNewTask(e.target.value)} style={{ ...inp({ width: "100%", marginBottom: "8px", boxSizing: "border-box" as const }) }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)} style={inp()}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input placeholder="Assigned to" value={newOwner} onChange={e => setNewOwner(e.target.value)} style={inp()} />
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={inp()} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addItem} style={{ padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ padding: "6px 14px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Grouped checklist */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#8b7355", fontSize: "0.85rem" }}>No tasks yet.</div>
      ) : (
        Object.entries(grouped).map(([cat, catItems]) => {
          const catDone = catItems.filter(i => i.completed).length;
          const isCollapsed = collapsed[cat];
          return (
            <div key={cat} style={{ marginBottom: "0.5rem" }}>
              <div onClick={() => setCollapsed(prev => ({...prev, [cat]: !prev[cat]}))} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 4px", cursor: "pointer", borderBottom: "1px solid #f0ebe4" }}>
                <span style={{ fontSize: "0.7rem", color: "#8b7355", letterSpacing: "0.08em", flex: 1 }}>{cat.toUpperCase()}</span>
                <span style={{ fontSize: "0.68rem", color: "#8b7355" }}>{catDone}/{catItems.length}</span>
                <span style={{ fontSize: "0.65rem", color: "#8b7355" }}>{isCollapsed ? "▸" : "▾"}</span>
              </div>
              {!isCollapsed && catItems.map(item => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 4px", borderRadius: "6px", background: isOverdue(item) ? "#fff8f8" : "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = isOverdue(item) ? "#fff0f0" : "#fafaf9")}
                  onMouseLeave={e => (e.currentTarget.style.background = isOverdue(item) ? "#fff8f8" : "transparent")}
                >
                  <div onClick={() => toggleComplete(item)} style={{ width: "18px", height: "18px", borderRadius: "50%", border: item.completed ? "none" : "1.5px solid #d4c5b0", background: item.completed ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
                    {item.completed && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                  </div>

                  {editing === item.id ? (
                    <div style={{ flex: 1, display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                      <input value={editData.task} onChange={e => setEditData({...editData, task: e.target.value})} style={{ ...inp({ flex: 1, minWidth: "150px" }) }} />
                      <select value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})} style={inp({ width: "110px" })}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                      <input placeholder="Owner" value={editData.owner} onChange={e => setEditData({...editData, owner: e.target.value})} style={inp({ width: "100px" })} />
                      <input type="date" value={editData.due_date} onChange={e => setEditData({...editData, due_date: e.target.value})} style={inp({ width: "130px" })} />
                      <button onClick={() => saveEdit(item.id)} style={{ padding: "4px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Save</button>
                      <button onClick={() => setEditing(null)} style={{ padding: "4px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleComplete(item)}>
                      <div style={{ fontSize: "0.88rem", color: item.completed ? "#b0a090" : "#2c1810", textDecoration: item.completed ? "line-through" : "none", fontFamily: "Georgia, serif" }}>{item.task}</div>
                      {(item.owner || item.due_date) && (
                        <div style={{ display: "flex", gap: "8px", marginTop: "2px", alignItems: "center" }}>
                          {item.due_date && <span style={{ fontSize: "0.7rem", color: isOverdue(item) ? "#c0392b" : "#8b7355" }}>{isOverdue(item) ? "⚠ " : ""}Due {formatDate(item.due_date)}</span>}
                        </div>
                      )}
                    </div>
                  )}

                  {editing !== item.id && item.owner && <Avatar name={item.owner} />}

                  {editing !== item.id && (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button onClick={() => { setEditing(item.id); setEditData({ task: item.task, owner: item.owner || "", due_date: item.due_date || "", category: item.category || "General" }); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px", padding: "2px 4px" }} onMouseEnter={e => (e.currentTarget.style.color = "#8b7355")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✎</button>
                      <button onClick={() => deleteItem(item.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px", padding: "2px 4px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
