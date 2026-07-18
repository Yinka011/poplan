"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type PlannerEvent = {
  id: number;
  event_slug: string;
  brand_name: string;
  brand_email: string;
  planner_email: string;
  city?: string;
  dates_label?: string;
  start_date?: string;
};

type Task = {
  id: number;
  task: string;
  due_date: string;
  completed: boolean;
  owner: string;
};

type Message = {
  id: number;
  sender_email: string;
  sender_name: string;
  message: string;
  created_at: string;
};

type Receipt = {
  id: number;
  file_name: string;
  file_url: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
};

type DecorItem = { id: number; category: string; item: string; cost: number; quantity: number; notes: string; };
type RefreshItem = { id: number; item: string; quantity: string; cost: number; notes: string; };
type StaffItem = { id: number; name: string; role: string; pay_rate: number; notes: string; shifts?: { staff_id: number; hours: number }[]; };

export default function PlannerDashboard() {
  const params = useParams();
  const slug = params.slug as string;

  const [plannerEvent, setPlannerEvent] = useState<PlannerEvent | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [brandTasks, setBrandTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [decor, setDecor] = useState<DecorItem[]>([]);
  const [refresh, setRefresh] = useState<RefreshItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "planning" | "expenses" | "mytasks" | "brandtasks" | "chat" | "receipts">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [planningTab, setPlanningTab] = useState<"decor" | "refreshments" | "staff">("decor");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newMyTask, setNewMyTask] = useState({ task: "", due_date: "" });
  const [newBrandTask, setNewBrandTask] = useState({ task: "", due_date: "" });
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newReceipt, setNewReceipt] = useState({ description: "", amount: "" });

  useEffect(() => {
    fetchAll();
  }, [slug]);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setUserEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).single();
    if (profile?.name) setUserName(profile.name);

    const [peRes, myTasksRes, brandTasksRes, messagesRes, receiptsRes, decorRes, refreshRes, staffRes, shiftsRes] = await Promise.all([
      supabase.from("event_planners").select("*").eq("event_slug", slug).eq("planner_email", user.email).single(),
      supabase.from("planner_tasks").select("*").eq("event_slug", slug).eq("owner", "planner").order("created_at"),
      supabase.from("planner_tasks").select("*").eq("event_slug", slug).eq("owner", "brand").order("created_at"),
      supabase.from("planner_messages").select("*").eq("event_slug", slug).order("created_at"),
      supabase.from("planner_receipts").select("*").eq("event_slug", slug).order("created_at", { ascending: false }),
      supabase.from("planning_decor").select("*").eq("event", slug).order("category"),
      supabase.from("planning_refreshments").select("*").eq("event", slug),
      supabase.from("planning_staff").select("*").eq("event", slug),
      supabase.from("planning_staff_shifts").select("staff_id, hours").eq("event", slug),
    ]);

    if (peRes.data) setPlannerEvent(peRes.data);
    if (myTasksRes.data) setMyTasks(myTasksRes.data);
    if (brandTasksRes.data) setBrandTasks(brandTasksRes.data);
    if (messagesRes.data) setMessages(messagesRes.data);
    if (receiptsRes.data) setReceipts(receiptsRes.data);
    if (decorRes.data) setDecor(decorRes.data);
    if (refreshRes.data) setRefresh(refreshRes.data);
    if (staffRes.data && shiftsRes.data) {
      const staffWithShifts = staffRes.data.map(s => ({
        ...s,
        shifts: shiftsRes.data.filter(sh => sh.staff_id === s.id)
      }));
      setStaff(staffWithShifts);
    }

    setLoading(false);
  };

  const addMyTask = async () => {
    if (!newMyTask.task.trim()) return;
    const { data } = await supabase.from("planner_tasks").insert({
      event_slug: slug, planner_email: userEmail, brand_email: plannerEvent?.brand_email || "",
      task: newMyTask.task, due_date: newMyTask.due_date, completed: false, owner: "planner"
    }).select().single();
    if (data) setMyTasks(prev => [...prev, data]);
    setNewMyTask({ task: "", due_date: "" });
  };

  const addBrandTask = async () => {
    if (!newBrandTask.task.trim()) return;
    const { data } = await supabase.from("planner_tasks").insert({
      event_slug: slug, planner_email: userEmail, brand_email: plannerEvent?.brand_email || "",
      task: newBrandTask.task, due_date: newBrandTask.due_date, completed: false, owner: "brand"
    }).select().single();
    if (data) setBrandTasks(prev => [...prev, data]);
    setNewBrandTask({ task: "", due_date: "" });
  };

  const toggleTask = async (task: Task, isMine: boolean) => {
    await supabase.from("planner_tasks").update({ completed: !task.completed }).eq("id", task.id);
    if (isMine) setMyTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    else setBrandTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = async (id: number, isMine: boolean) => {
    await supabase.from("planner_tasks").delete().eq("id", id);
    if (isMine) setMyTasks(prev => prev.filter(t => t.id !== id));
    else setBrandTasks(prev => prev.filter(t => t.id !== id));
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const { data } = await supabase.from("planner_messages").insert({
      event_slug: slug, sender_email: userEmail, sender_name: userName || userEmail, message: newMessage
    }).select().single();
    if (data) setMessages(prev => [...prev, data]);
    setNewMessage("");
  };

  const uploadReceipt = async (file: File) => {
    if (!file || !newReceipt.description.trim()) return;
    setUploading(true);
    const path = `receipts/${slug}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("brand-uploads").upload(path, file, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("brand-uploads").getPublicUrl(path);
      const { data } = await supabase.from("planner_receipts").insert({
        event_slug: slug, planner_email: userEmail, file_name: file.name,
        file_url: urlData.publicUrl, amount: parseFloat(newReceipt.amount) || 0,
        description: newReceipt.description, status: "pending"
      }).select().single();
      if (data) setReceipts(prev => [data, ...prev]);
    }
    setNewReceipt({ description: "", amount: "" });
    setUploading(false);
  };

  const deleteReceipt = async (id: number) => {
    if (!confirm("Remove this receipt?")) return;
    await supabase.from("planner_receipts").delete().eq("id", id);
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const totalDecor = decor.reduce((s, x) => s + Number(x.cost), 0);
  const totalRefresh = refresh.reduce((s, x) => s + Number(x.cost), 0);
  const totalStaff = staff.reduce((s, m) => {
    const hrs = (m.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0);
    return s + hrs * Number(m.pay_rate);
  }, 0);
  const totalExpenses = totalDecor + totalRefresh + totalStaff;
  const totalReceipts = receipts.reduce((s, r) => s + Number(r.amount), 0);

  const myCompleted = myTasks.filter(t => t.completed).length;
  const brandCompleted = brandTasks.filter(t => t.completed).length;
  const totalTasks = myTasks.length + brandTasks.length;
  const totalCompleted = myCompleted + brandCompleted;
  const progress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const daysToEvent = plannerEvent?.start_date ? Math.ceil((new Date(plannerEvent.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "planning", label: "Planning Hub" },
    { key: "expenses", label: "Expenses" },
    { key: "mytasks", label: "My Tasks" },
    { key: "brandtasks", label: `${plannerEvent?.brand_name || "Brand"} Tasks` },
    { key: "chat", label: "Chat" },
    { key: "receipts", label: "Receipts" },
  ];

  const inp = (style?: object) => ({ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", ...style });

  if (loading) return <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>;

  if (!plannerEvent) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#8b7355" }}>Planning assignment not found.</p>
        <Link href="/login/organizer/events" style={{ color: "#b87333" }}>← Back to events</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>

      {/* Hamburger sidebar */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000044", zIndex: 15 }} />
      )}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "220px", background: "#2c1810", zIndex: 16, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", display: "flex", flexDirection: "column" as const, paddingTop: "60px" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
          <div style={{ fontSize: "0.7rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "4px" }}>PLANNING FOR</div>
          <div style={{ fontSize: "0.9rem", color: "#fff" }}>{plannerEvent.brand_name}</div>
          {plannerEvent.city && <div style={{ fontSize: "0.75rem", color: "#b87333", marginTop: "2px" }}>{plannerEvent.city}</div>}
        </div>
        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {tabs.map(tab => (
            <a key={tab.key} onClick={() => { setActiveTab(tab.key as "overview" | "planning" | "expenses" | "mytasks" | "brandtasks" | "chat" | "receipts"); setSidebarOpen(false); }} style={{ display: "block", padding: "10px 1.25rem", fontSize: "0.85rem", color: activeTab === tab.key ? "#fff" : "#c8b89a", background: activeTab === tab.key ? "#3d2415" : "transparent", textDecoration: "none", borderLeft: activeTab === tab.key ? "2px solid #b87333" : "2px solid transparent", cursor: "pointer" }}>
              {tab.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #3d2415" }}>
          <Link href="/login/organizer/events" style={{ fontSize: "0.8rem", color: "#c8b89a", textDecoration: "none", display: "block" }}>← All events</Link>
        </div>
      </div>

      {/* Top bar */}
      <div style={{ background: "#2c1810", padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky" as const, top: 0, zIndex: 14 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column" as const, gap: "5px" }}>
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "#b87333" : "#c8b89a", transition: "all 0.2s", transform: sidebarOpen ? "rotate(45deg) translate(4.5px, 4.5px)" : "none" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "transparent" : "#c8b89a", transition: "all 0.2s" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "#b87333" : "#c8b89a", transition: "all 0.2s", transform: sidebarOpen ? "rotate(-45deg) translate(4.5px, -4.5px)" : "none" }} />
        </button>
        <div style={{ fontSize: "1rem", color: "#fff" }}>{plannerEvent.brand_name} — {plannerEvent.city || plannerEvent.event_slug}</div>
        <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#c8b89a" }}>{tabs.find(t => t.key === activeTab)?.label}</div>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px", margin: "0 auto" }}>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px", marginBottom: "1.5rem" }}>
          <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1rem 1.25rem", color: "#fff" }}>
            <div style={{ fontSize: "0.65rem", color: "#c8b89a", marginBottom: "4px" }}>CITY</div>
            <div style={{ fontSize: "0.95rem" }}>{plannerEvent.city || plannerEvent.event_slug}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.65rem", color: "#8b7355", marginBottom: "4px" }}>TOTAL EXPENSES</div>
            <div style={{ fontSize: "1.2rem", color: "#b87333" }}>${totalExpenses.toFixed(2)}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.65rem", color: "#8b7355", marginBottom: "4px" }}>PROGRESS</div>
            <div style={{ fontSize: "1.2rem", color: "#2c1810" }}>{progress}%</div>
            <div style={{ height: "3px", background: "#f0ebe4", borderRadius: "2px", marginTop: "6px" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "2px" }} />
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5", textAlign: "center" as const }}>
            <div style={{ fontSize: daysToEvent ? "2rem" : "1rem", color: "#2c1810", lineHeight: 1 }}>{daysToEvent || "TBD"}</div>
            <div style={{ fontSize: "0.65rem", color: "#8b7355", marginTop: "4px" }}>DAYS TO EVENT</div>
          </div>
        </div>



        {/* Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>EVENT DETAILS</div>
              <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "4px" }}>{plannerEvent.brand_name}</div>
              <div style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "4px" }}>{plannerEvent.city || ""}</div>
              {plannerEvent.dates_label && <div style={{ fontSize: "0.85rem", color: "#b87333" }}>{plannerEvent.dates_label}</div>}
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>TASK PROGRESS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355", marginBottom: "4px" }}>MY TASKS</div>
                  <div style={{ fontSize: "1.3rem", color: "#2c1810" }}>{myCompleted}/{myTasks.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355", marginBottom: "4px" }}>{plannerEvent.brand_name} TASKS</div>
                  <div style={{ fontSize: "1.3rem", color: "#2c1810" }}>{brandCompleted}/{brandTasks.length}</div>
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>EXPENSES BREAKDOWN</div>
              {[{ label: "Decor", value: totalDecor, color: "#b87333" }, { label: "Refreshments", value: totalRefresh, color: "#4a7c59" }, { label: "Staffing", value: totalStaff, color: "#5b7fa6" }].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 2 ? "1px solid #f0ebe4" : "none" }}>
                  <span style={{ fontSize: "0.85rem", color: "#8b7355" }}>{item.label}</span>
                  <span style={{ fontSize: "0.85rem", color: item.color, fontWeight: 500 }}>${item.value.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "2px solid #2c1810" }}>
                <span style={{ fontSize: "0.9rem", color: "#2c1810", fontWeight: 500 }}>Total</span>
                <span style={{ fontSize: "0.9rem", color: "#2c1810", fontWeight: 500 }}>${totalExpenses.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>RECEIPTS</div>
              <div style={{ fontSize: "1.3rem", color: "#2c1810", marginBottom: "4px" }}>${totalReceipts.toFixed(2)}</div>
              <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{receipts.length} receipt{receipts.length !== 1 ? "s" : ""} uploaded</div>
              <div style={{ fontSize: "0.8rem", color: "#4a7c59", marginTop: "4px" }}>{receipts.filter(r => r.status === "approved").length} approved</div>
            </div>
          </div>
        )}

        {/* Planning Hub */}
        {activeTab === "planning" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>Planning Hub</div>
            <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1rem" }}>Use the full Planning Hub for this event. All costs auto-populate to the Expenses tab and Wanni&apos;s portal.</p>
            <Link href={`/login/organizer/planner/${slug}/planning`} style={{ display: "inline-block", padding: "10px 20px", background: "#2c1810", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}>Open Planning Hub →</Link>
          </div>
        )}

        {/* Expenses */}
        {activeTab === "expenses" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1.25rem" }}>Expenses from Planning Hub</div>
            {[{ label: "Decor", value: totalDecor, color: "#b87333" }, { label: "Refreshments", value: totalRefresh, color: "#4a7c59" }, { label: "Staffing", value: totalStaff, color: "#5b7fa6" }].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderRadius: "8px", background: "#faf8f5", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: item.color }} />
                  <span style={{ fontSize: "0.9rem", color: "#2c1810" }}>{item.label}</span>
                </div>
                <span style={{ fontSize: "1rem", color: item.color, fontWeight: 500 }}>${item.value.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 12px", borderTop: "2px solid #2c1810", marginTop: "8px" }}>
              <span style={{ fontSize: "1rem", color: "#2c1810", fontWeight: 500 }}>Grand Total</span>
              <span style={{ fontSize: "1.2rem", color: "#2c1810", fontWeight: 500 }}>${totalExpenses.toFixed(2)}</span>
            </div>
            <Link href={`/login/organizer/planner/${slug}/expenses`} style={{ display: "inline-block", marginTop: "1rem", padding: "8px 16px", background: "transparent", color: "#2c1810", border: "1px solid #e8e0d5", borderRadius: "8px", textDecoration: "none", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}>View full expenses →</Link>
          </div>
        )}

        {/* My Tasks */}
        {activeTab === "mytasks" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>My Tasks ({myCompleted}/{myTasks.length})</div>
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
              <input placeholder="Add a task..." value={newMyTask.task} onChange={e => setNewMyTask({...newMyTask, task: e.target.value})} onKeyDown={e => e.key === "Enter" && addMyTask()} style={inp({ flex: 1 })} />
              <input type="date" value={newMyTask.due_date} onChange={e => setNewMyTask({...newMyTask, due_date: e.target.value})} style={inp({ width: "140px" })} />
              <button onClick={addMyTask} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Add</button>
            </div>
            {myTasks.map(task => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px" }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div onClick={() => toggleTask(task, true)} style={{ width: "18px", height: "18px", borderRadius: "50%", border: task.completed ? "none" : "2px solid #d4c5b0", background: task.completed ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {task.completed && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.88rem", color: task.completed ? "#b0a090" : "#2c1810", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                  {task.due_date && <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Due {task.due_date}</div>}
                </div>
                <button onClick={() => deleteTask(task.id, true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
              </div>
            ))}
            {myTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks yet.</p>}
          </div>
        )}

        {/* Brand Tasks */}
        {activeTab === "brandtasks" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>{plannerEvent.brand_name} Tasks ({brandCompleted}/{brandTasks.length})</div>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1rem" }}>These tasks are visible to {plannerEvent.brand_name} on their portal. They can check them off from their end.</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
              <input placeholder="Add a task for the brand..." value={newBrandTask.task} onChange={e => setNewBrandTask({...newBrandTask, task: e.target.value})} onKeyDown={e => e.key === "Enter" && addBrandTask()} style={inp({ flex: 1 })} />
              <input type="date" value={newBrandTask.due_date} onChange={e => setNewBrandTask({...newBrandTask, due_date: e.target.value})} style={inp({ width: "140px" })} />
              <button onClick={addBrandTask} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Add</button>
            </div>
            {brandTasks.map(task => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px" }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div onClick={() => toggleTask(task, false)} style={{ width: "18px", height: "18px", borderRadius: "50%", border: task.completed ? "none" : "2px solid #d4c5b0", background: task.completed ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {task.completed && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.88rem", color: task.completed ? "#b0a090" : "#2c1810", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                  {task.due_date && <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Due {task.due_date}</div>}
                </div>
                <button onClick={() => deleteTask(task.id, false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
              </div>
            ))}
            {brandTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks yet.</p>}
          </div>
        )}

        {/* Chat */}
        {activeTab === "chat" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>Chat with {plannerEvent.brand_name}</div>
            <div style={{ height: "400px", overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column" as const, gap: "10px" }}>
              {messages.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginTop: "2rem" }}>No messages yet. Start the conversation.</p>}
              {messages.map(msg => {
                const isMe = msg.sender_email === userEmail;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: "0.7rem", color: "#8b7355", marginBottom: "2px" }}>{msg.sender_name}</div>
                    <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? "#2c1810" : "#f0ebe4", color: isMe ? "#fff" : "#2c1810", fontSize: "0.88rem", lineHeight: 1.5 }}>
                      {msg.message}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "#b0a090", marginTop: "2px" }}>{new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} style={inp({ flex: 1 })} />
              <button onClick={sendMessage} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        )}

        {/* Receipts */}
        {activeTab === "receipts" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>Receipts & Invoices</div>
            <p style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1rem" }}>Upload receipts and invoices. {plannerEvent.brand_name} can approve or delete them from their portal.</p>

            <div style={{ background: "#faf8f5", borderRadius: "10px", padding: "1rem", border: "1px solid #f0ebe4", marginBottom: "1.5rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <input placeholder="Description e.g. Venue deposit" value={newReceipt.description} onChange={e => setNewReceipt({...newReceipt, description: e.target.value})} style={inp()} />
                <input placeholder="Amount $" value={newReceipt.amount} onChange={e => setNewReceipt({...newReceipt, amount: e.target.value})} style={inp()} />
              </div>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx" onChange={e => e.target.files?.[0] && uploadReceipt(e.target.files[0])} style={{ fontSize: "0.85rem", color: "#8b7355" }} disabled={uploading || !newReceipt.description.trim()} />
              {uploading && <div style={{ fontSize: "0.8rem", color: "#b87333", marginTop: "6px" }}>Uploading...</div>}
              {!newReceipt.description.trim() && <div style={{ fontSize: "0.75rem", color: "#c0392b", marginTop: "6px" }}>Add a description before uploading.</div>}
            </div>

            {receipts.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No receipts uploaded yet.</p>
            ) : (
              receipts.map(receipt => (
                <div key={receipt.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "#faf8f5", marginBottom: "8px", border: "1px solid #f0ebe4" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.88rem", color: "#2c1810" }}>{receipt.description}</div>
                    <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>{receipt.file_name} · {formatDate(receipt.created_at)}</div>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#b87333", fontWeight: 500 }}>${Number(receipt.amount).toFixed(2)}</div>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: receipt.status === "approved" ? "#4a7c5922" : receipt.status === "rejected" ? "#c0392b22" : "#f0ebe4", color: receipt.status === "approved" ? "#4a7c59" : receipt.status === "rejected" ? "#c0392b" : "#8b7355" }}>
                    {receipt.status === "approved" ? "Approved" : receipt.status === "rejected" ? "Rejected" : "Pending"}
                  </span>
                  <a href={receipt.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", color: "#8b7355", textDecoration: "none" }}>View</a>
                  <button onClick={() => deleteReceipt(receipt.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                </div>
              ))
            )}
            {receipts.length > 0 && (
              <div style={{ borderTop: "1px solid #f0ebe4", paddingTop: "1rem", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.85rem", color: "#8b7355" }}>Total receipts</span>
                <span style={{ fontSize: "0.95rem", color: "#2c1810", fontWeight: 500 }}>${totalReceipts.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
