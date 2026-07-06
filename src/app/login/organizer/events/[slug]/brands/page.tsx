"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Brand = { id: number; name: string; email: string; fee_owed: number; amount_paid: number; balance: number; status: string; };
type Task = { brand_email: string; completed: boolean; task: string; due_date: string; };
type Deadline = { id: number; task: string; due_date: string; category: string; };

const statusColors: Record<string, { bg: string; color: string }> = {
  Paid: { bg: "#4a7c5922", color: "#4a7c59" },
  Partial: { bg: "#b8733322", color: "#b87333" },
  Unpaid: { bg: "#c0392b22", color: "#c0392b" },
};

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [selected, setSelected] = useState<Brand | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [brandRes, taskRes, deadlineRes] = await Promise.all([
        supabase.from("brands").select("*").eq("event", "Atlanta"),
        supabase.from("brand_tasks").select("*").eq("event", "Atlanta"),
        supabase.from("event_deadlines").select("*").eq("event", "Atlanta").order("id"),
      ]);
      if (brandRes.data) setBrands(brandRes.data);
      if (taskRes.data) setTasks(taskRes.data);
      if (deadlineRes.data) setDeadlines(deadlineRes.data);
    };
    fetchAll();
  }, []);

  const getProgress = (email: string) => {
    if (!email) return { completed: 0, total: deadlines.length, percent: 0 };
    const brandTasks = tasks.filter(t => t.brand_email === email && t.completed);
    return {
      completed: brandTasks.length,
      total: deadlines.length,
      percent: deadlines.length ? Math.round((brandTasks.length / deadlines.length) * 100) : 0,
    };
  };

  const getStatusLabel = (percent: number) => {
    if (percent === 100) return { label: "All done", color: "#4a7c59", bg: "#4a7c5922" };
    if (percent >= 50) return { label: "In progress", color: "#b87333", bg: "#b8733322" };
    if (percent > 0) return { label: "Started", color: "#5b7fa6", bg: "#5b7fa622" };
    return { label: "Not started", color: "#c0392b", bg: "#c0392b22" };
  };

  const getCompletedTasks = (email: string) =>
    tasks.filter(t => t.brand_email === email && t.completed).map(t => t.task);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/login/organizer/events/atlanta" style={{ fontSize: "0.85rem", color: "#8b7355", textDecoration: "none" }}>← Back to Atlanta</Link>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", marginTop: "0.5rem" }}>Brand Activity</h1>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Track task completion across all Atlanta brands</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: "1rem" }}>
          <div>
            {brands.map(brand => {
              const { completed, total, percent } = getProgress(brand.email);
              const progress = getStatusLabel(percent);
              const payStatus = statusColors[brand.status] || statusColors.Unpaid;
              return (
                <div key={brand.id} onClick={() => setSelected(selected?.id === brand.id ? null : brand)} style={{ background: selected?.id === brand.id ? "#fdf8f3" : "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "10px", border: selected?.id === brand.id ? "1px solid #b87333" : "1px solid #e8e0d5", cursor: "pointer", transition: "all 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "1rem", color: "#2c1810", fontWeight: 500 }}>{brand.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>{brand.email || "No portal access"}</div>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "20px", ...payStatus }}>{brand.status}</span>
                      <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "20px", background: progress.bg, color: progress.color }}>{progress.label}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{completed} of {total} tasks complete</div>
                    <div style={{ fontSize: "0.8rem", color: "#2c1810", fontWeight: 500 }}>{percent}%</div>
                  </div>
                  <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${percent}%`, background: progress.color, borderRadius: "3px", transition: "width 0.3s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", fontSize: "0.8rem" }}>
                    <span style={{ color: "#8b7355" }}>Balance: <strong style={{ color: Number(brand.balance) > 0 ? "#c0392b" : "#4a7c59" }}>${Number(brand.balance).toFixed(2)}</strong></span>
                    <span style={{ color: "#b87333" }}>Click to view tasks →</span>
                  </div>
                </div>
              );
            })}
          </div>

          {selected && (
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e8e0d5", height: "fit-content", position: "sticky", top: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ fontSize: "1rem", color: "#2c1810" }}>{selected.name}</div>
                <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", color: "#8b7355", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>TASK COMPLETION</div>
              {deadlines.map(deadline => {
                const completedTasks = getCompletedTasks(selected.email);
                const done = completedTasks.includes(deadline.task);
                return (
                  <div key={deadline.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid #f0ebe4" }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: done ? "#b87333" : "#f0ebe4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {done && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.82rem", color: done ? "#b0a090" : "#2c1810", textDecoration: done ? "line-through" : "none" }}>{deadline.task}</div>
                      <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Due {deadline.due_date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}