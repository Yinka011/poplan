"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Brand = {
  id: number;
  name: string;
  fee_owed: number;
  amount_paid: number;
  balance: number;
  status: string;
  event: string;
};

type Deadline = {
  id: number;
  task: string;
  due_date: string;
  category: string;
};

type TaskStatus = {
  id: number;
  task: string;
  completed: boolean;
  deadline_id: number;
};

const categoryColors: Record<string, string> = {
  Marketing: "#4a7c59",
  Admin: "#b87333",
  Operations: "#5b7fa6",
  Logistics: "#8b6ab0",
};

export default function BrandPortal() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUserEmail(user.email || "");

      const [brandRes, deadlineRes, taskRes] = await Promise.all([
        supabase.from("brands").select("*").eq("email", user.email).single(),
        supabase.from("event_deadlines").select("*").eq("event", "Atlanta").order("due_date"),
        supabase.from("brand_tasks").select("*").eq("brand_email", user.email).eq("event", "Atlanta"),
      ]);

      if (brandRes.data) setBrand(brandRes.data);
      if (deadlineRes.data) setDeadlines(deadlineRes.data);
      if (taskRes.data) setTasks(taskRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const toggleTask = async (deadline: Deadline) => {
    const existing = tasks.find(t => t.deadline_id === deadline.id);
    if (existing) {
      await supabase.from("brand_tasks").update({ completed: !existing.completed }).eq("id", existing.id);
      setTasks(tasks.map(t => t.id === existing.id ? { ...t, completed: !t.completed } : t));
    } else {
      const { data } = await supabase.from("brand_tasks").insert({
        event: "Atlanta",
        task: deadline.task,
        due_date: deadline.due_date,
        brand_email: userEmail,
        completed: true,
        deadline_id: deadline.id,
      }).select().single();
      if (data) setTasks([...tasks, data]);
    }
  };

  const isCompleted = (deadline: Deadline) => tasks.find(t => t.deadline_id === deadline.id)?.completed || false;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>
  );

  if (!brand) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center", color: "#2c1810" }}>
        <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>POPLAN</div>
        <p style={{ color: "#8b7355" }}>No brand found for {userEmail}</p>
        <button onClick={handleLogout} style={{ marginTop: "1rem", padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>Sign out</button>
      </div>
    </div>
  );

  const completed = deadlines.filter(d => isCompleted(d)).length;
  const statusColor = (s: string) => {
    if (s === "Paid") return { background: "#4a7c5922", color: "#4a7c59" };
    if (s === "Partial") return { background: "#b8733322", color: "#b87333" };
    return { background: "#c0392b22", color: "#c0392b" };
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e0d5", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", marginTop: "2px" }}></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#8b7355" }}>Brand</span>
          <button onClick={handleLogout} style={{ fontSize: "0.8rem", padding: "5px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", cursor: "pointer", color: "#8b7355" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal", margin: 0 }}>Welcome, {brand.name}</h1>
          <p style={{ color: "#8b7355", marginTop: "0.4rem", fontSize: "0.95rem" }}>{brand.event} Pop-up — your brand portal</p>
        </div>

        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ fontSize: "0.75rem", letterSpacing: "0.1em", color: "#c8b89a", marginBottom: "1rem" }}>PARTICIPATION FEE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
            <div><div style={{ fontSize: "0.75rem", color: "#c8b89a", marginBottom: "0.3rem" }}>FEE OWED</div><div style={{ fontSize: "1.4rem" }}>${Number(brand.fee_owed).toFixed(2)}</div></div>
            <div><div style={{ fontSize: "0.75rem", color: "#c8b89a", marginBottom: "0.3rem" }}>AMOUNT PAID</div><div style={{ fontSize: "1.4rem" }}>${Number(brand.amount_paid).toFixed(2)}</div></div>
            <div><div style={{ fontSize: "0.75rem", color: "#c8b89a", marginBottom: "0.3rem" }}>BALANCE</div><div style={{ fontSize: "1.4rem", color: "#e8c97a" }}>${Number(brand.balance).toFixed(2)}</div></div>
            <div><div style={{ fontSize: "0.75rem", color: "#c8b89a", marginBottom: "0.3rem" }}>STATUS</div><div style={{ display: "inline-block", padding: "0.25rem 0.85rem", borderRadius: "20px", fontSize: "0.8rem", marginTop: "0.2rem", ...statusColor(brand.status) }}>{brand.status}</div></div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "1rem", color: "#2c1810" }}>Your to-do list</div>
              <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>{completed} of {deadlines.length} complete</div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#b87333" }}>{brand.event} Pop-up</div>
          </div>

          <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px", marginBottom: "1.25rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${deadlines.length ? (completed / deadlines.length) * 100 : 0}%`, background: "#b87333", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>

          {["Admin", "Marketing", "Operations", "Logistics"].map(cat => {
            const items = deadlines.filter(d => d.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat} style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.7rem", letterSpacing: "0.08em", color: categoryColors[cat] || "#8b7355", marginBottom: "6px" }}>{cat.toUpperCase()}</div>
                {items.map(deadline => (
                  <div key={deadline.id} onClick={() => toggleTask(deadline)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 8px", borderRadius: "8px", cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: isCompleted(deadline) ? "none" : "2px solid #d4c5b0", background: isCompleted(deadline) ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                      {isCompleted(deadline) && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.9rem", color: isCompleted(deadline) ? "#b0a090" : "#2c1810", textDecoration: isCompleted(deadline) ? "line-through" : "none", fontFamily: "Georgia, serif", transition: "all 0.2s" }}>{deadline.task}</div>
                      <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>Due {deadline.due_date}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>My details</div>
          {[
            { label: "Brand", value: brand.name },
            { label: "Event", value: brand.event + " Pop-up" },
            { label: "Email", value: userEmail },
            { label: "Payment status", value: brand.status },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: i < 3 ? "1px solid #f0ebe4" : "none" }}>
              <span style={{ fontSize: "0.8rem", color: "#8b7355" }}>{item.label}</span>
              <span style={{ fontSize: "0.8rem", color: "#2c1810", fontWeight: "500" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}