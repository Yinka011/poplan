"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ChecklistItem = {
  id: number;
  task: string;
  completed: boolean;
  owner: string;
  due_date: string;
};

export default function Checklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [newDate, setNewDate] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel("checklist-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "checklist" }, () => {
        fetchItems();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("checklist")
      .select("*")
      .eq("event", "Atlanta")
      .order("id");
    if (data) setItems(data);
  };

  const toggleComplete = async (item: ChecklistItem) => {
    await supabase
      .from("checklist")
      .update({ completed: !item.completed })
      .eq("id", item.id);
  };

  const addItem = async () => {
    if (!newTask.trim()) return;
    await supabase.from("checklist").insert({
      task: newTask,
      owner: newOwner,
      due_date: newDate,
      completed: false,
      event: "Atlanta"
    });
    setNewTask("");
    setNewOwner("");
    setNewDate("");
    setAdding(false);
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Remove this task?")) return;
    await supabase.from("checklist").delete().eq("id", id);
  };

  const completed = items.filter(i => i.completed).length;

  const iconBtn = (onClick: () => void, icon: string, title: string, danger = false) => (
    <button
      onClick={onClick}
      title={title}
      style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", padding: "4px 6px", borderRadius: "6px", color: danger ? "#c0392b" : "#8b7355" }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? "#c0392b11" : "#f0ebe4")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontSize: "1.1rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>Event checklist</div>
          <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>{completed} of {items.length} complete</div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ fontSize: "0.8rem", padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add task</button>
      </div>

      <div style={{ height: "4px", background: "#f0ebe4", borderRadius: "2px", marginBottom: "1.25rem", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${items.length ? (completed / items.length) * 100 : 0}%`, background: "#b87333", borderRadius: "2px", transition: "width 0.3s" }} />
      </div>

      {adding && (
        <div style={{ background: "#faf8f5", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
          <input
            placeholder="Task description"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            style={{ width: "100%", padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", marginBottom: "8px", boxSizing: "border-box" as const }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input
              placeholder="Owner"
              value={newOwner}
              onChange={e => setNewOwner(e.target.value)}
              style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}
            />
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addItem} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.map(item => (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px" }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <div onClick={() => toggleComplete(item)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: item.completed ? "none" : "2px solid #d4c5b0", background: item.completed ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", transition: "all 0.2s" }}>
              {item.completed && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
            </div>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => toggleComplete(item)}>
              <div style={{ fontSize: "0.9rem", color: item.completed ? "#b0a090" : "#2c1810", textDecoration: item.completed ? "line-through" : "none", fontFamily: "Georgia, serif" }}>{item.task}</div>
              {(item.owner || item.due_date) && (
                <div style={{ display: "flex", gap: "12px", marginTop: "2px" }}>
                  {item.owner && <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>👤 {item.owner}</span>}
                  {item.due_date && <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>📅 {item.due_date}</span>}
                </div>
              )}
            </div>
            {iconBtn(() => deleteItem(item.id), "🗑️", "Remove task", true)}
          </div>
        ))}
      </div>
    </div>
  );
}