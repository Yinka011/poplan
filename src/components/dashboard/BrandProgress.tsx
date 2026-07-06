"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Brand = { id: number; name: string; email: string; };
type Task = { brand_email: string; completed: boolean; };
type Deadline = { id: number; task: string; };

export default function BrandProgress() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [brandRes, taskRes, deadlineRes] = await Promise.all([
        supabase.from("brands").select("id, name, email").eq("event", "Atlanta"),
        supabase.from("brand_tasks").select("brand_email, completed").eq("event", "Atlanta"),
        supabase.from("event_deadlines").select("id, task").eq("event", "Atlanta"),
      ]);
      if (brandRes.data) setBrands(brandRes.data);
      if (taskRes.data) setTasks(taskRes.data);
      if (deadlineRes.data) setDeadlines(deadlineRes.data);
    };
    fetchAll();
  }, []);

  const getProgress = (email: string) => {
    if (!email) return { completed: 0, total: deadlines.length, percent: 0 };
    const brandTasks = tasks.filter(t => t.brand_email === email);
    const completed = brandTasks.filter(t => t.completed).length;
    const total = deadlines.length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  };

  const getStatus = (percent: number) => {
    if (percent === 100) return { label: "Complete", color: "#4a7c59", bg: "#4a7c5922" };
    if (percent >= 50) return { label: "In progress", color: "#b87333", bg: "#b8733322" };
    if (percent > 0) return { label: "Started", color: "#5b7fa6", bg: "#5b7fa622" };
    return { label: "Not started", color: "#c0392b", bg: "#c0392b22" };
  };

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
      <div style={{ fontSize: "1.1rem", color: "#2c1810", marginBottom: "0.3rem", fontFamily: "Georgia, serif" }}>Brand progress</div>
      <div style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1.25rem" }}>Task completion across all Atlanta brands</div>
      {brands.filter(b => b.email).map(brand => {
        const { completed, total, percent } = getProgress(brand.email);
        const status = getStatus(percent);
        return (
          <div key={brand.id} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #f0ebe4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ fontSize: "0.9rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>{brand.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>{completed}/{total} tasks</span>
                <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "20px", background: status.bg, color: status.color }}>{status.label}</span>
              </div>
            </div>
            <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${percent}%`, background: status.color, borderRadius: "3px", transition: "width 0.3s" }} />
            </div>
          </div>
        );
      })}
      {brands.filter(b => !b.email).map(brand => (
        <div key={brand.id} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #f0ebe4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>{brand.name}</div>
            <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "20px", background: "#f0ebe4", color: "#8b7355" }}>No portal access</span>
          </div>
          <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px" }} />
        </div>
      ))}
    </div>
  );
}
