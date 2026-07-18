/* eslint-disable @typescript-eslint/no-explicit-any */
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
  assigned_to?: string;
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
type RefreshItem = { id: number; item: string; quantity: string; cost: number; };
type StaffItem = { id: number; name: string; role: string; pay_rate: number; notes: string; shifts?: { staff_id: number; hours: number }[]; };
type ManualExpense = { id: number; category: string; item: string; cost: number; deposit: number; };

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
  const [manualExpenses, setManualExpenses] = useState<ManualExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "planning" | "budget" | "mytasks" | "brandtasks" | "chat" | "receipts">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [planningTab, setPlanningTab] = useState<"decor" | "refreshments" | "staff">("decor");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newMyTask, setNewMyTask] = useState({ task: "", due_date: "" });
  const [newBrandTask, setNewBrandTask] = useState({ task: "", due_date: "", assigned_to: "" });
  const [newMessage, setNewMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newReceipt, setNewReceipt] = useState({ description: "", amount: "" });
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<File | null>(null);
  const [addingExpense, setAddingExpense] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({ item: "", cost: "", deposit: "" });

  useEffect(() => {
    if (slug) fetchAll();
  }, [slug]);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setUserEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).single();
    if (profile?.name) setUserName(profile.name);

    const [peRes, myTasksRes, brandTasksRes, messagesRes, receiptsRes, decorRes, refreshRes, staffRes, shiftsRes, expRes] = await Promise.all([
      supabase.from("event_planners").select("*").eq("event_slug", slug).eq("planner_email", user.email).maybeSingle(),
      supabase.from("planner_tasks").select("*").eq("event_slug", slug).eq("owner", "planner").order("created_at"),
      supabase.from("planner_tasks").select("*").eq("event_slug", slug).eq("owner", "brand").order("created_at"),
      supabase.from("planner_messages").select("*").eq("event_slug", slug).order("created_at"),
      supabase.from("planner_receipts").select("*").eq("event_slug", slug).order("created_at", { ascending: false }),
      supabase.from("planning_decor").select("*").eq("event", slug).order("category"),
      supabase.from("planning_refreshments").select("*").eq("event", slug),
      supabase.from("planning_staff").select("*").eq("event", slug),
      supabase.from("planning_staff_shifts").select("*").eq("event", slug),
      supabase.from("expenses").select("*").eq("event", slug).order("category"),
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
        shifts: shiftsRes.data.filter((sh: any) => sh.staff_id === s.id)
      }));
      setStaff(staffWithShifts);
    }
    if (expRes.data) setManualExpenses(expRes.data);
    setLoading(false);
  };

  const addMyTask = async () => {
    if (!newMyTask.task.trim()) return;
    const { data, error } = await supabase.from("planner_tasks").insert({
      event_slug: slug, planner_email: userEmail, brand_email: plannerEvent?.brand_email || "",
      task: newMyTask.task, due_date: newMyTask.due_date || null, completed: false, owner: "planner"
    }).select().single();
    if (error) { console.error("Task error:", error); alert("Error saving task: " + error.message); return; }
    if (data) setMyTasks(prev => [...prev, data]);
    setNewMyTask({ task: "", due_date: "" });
  };

  const addBrandTask = async () => {
    if (!newBrandTask.task.trim()) return;
    const { data, error } = await supabase.from("planner_tasks").insert({
      event_slug: slug, planner_email: userEmail, brand_email: plannerEvent?.brand_email || "",
      task: newBrandTask.task, due_date: newBrandTask.due_date || null, completed: false, owner: "brand",
      assigned_to: newBrandTask.assigned_to || null,
    }).select().single();
    if (error) { console.error("Brand task error:", error); alert("Error saving task: " + error.message); return; }
    if (data) setBrandTasks(prev => [...prev, data]);
    setNewBrandTask({ task: "", due_date: "", assigned_to: "" });
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

  const uploadReceipt = async () => {
    if (!selectedReceiptFile || !newReceipt.description.trim()) return;
    setUploading(true);
    const path = `receipts/${slug}/${Date.now()}_${selectedReceiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("brand-uploads").upload(path, selectedReceiptFile, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("brand-uploads").getPublicUrl(path);
      const { data } = await supabase.from("planner_receipts").insert({
        event_slug: slug, planner_email: userEmail, file_name: selectedReceiptFile.name,
        file_url: urlData.publicUrl, amount: parseFloat(newReceipt.amount) || 0,
        description: newReceipt.description, status: "pending"
      }).select().single();
      if (data) setReceipts(prev => [data, ...prev]);
    }
    setNewReceipt({ description: "", amount: "" });
    setSelectedReceiptFile(null);
    setUploading(false);
  };

  const deleteReceipt = async (id: number) => {
    if (!confirm("Remove this receipt?")) return;
    await supabase.from("planner_receipts").delete().eq("id", id);
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const addExpense = async (cat: string) => {
    if (!newExpense.item.trim()) return;
    const cost = parseFloat(newExpense.cost) || 0;
    const deposit = parseFloat(newExpense.deposit) || 0;
    const { data } = await supabase.from("expenses").insert({
      event: slug, category: cat, item: newExpense.item,
      cost, deposit, notes: ""
    }).select().single();
    if (data) setManualExpenses(prev => [...prev, data]);
    setNewExpense({ item: "", cost: "", deposit: "" });
    setAddingExpense(null);
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Remove this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    setManualExpenses(prev => prev.filter(e => e.id !== id));
  };

  const totalDecor = decor.reduce((s, x) => s + Number(x.cost), 0);
  const totalRefresh = refresh.reduce((s, x) => s + Number(x.cost), 0);
  const totalStaff = staff.reduce((s, m) => {
    const hrs = (m.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0);
    return s + hrs * Number(m.pay_rate);
  }, 0);
  const totalManual = manualExpenses.reduce((s, e) => s + Number(e.cost), 0);
  const grandTotal = totalDecor + totalRefresh + totalStaff + totalManual;

  const myCompleted = myTasks.filter(t => t.completed).length;
  const brandCompleted = brandTasks.filter(t => t.completed).length;
  const totalTasks = myTasks.length + brandTasks.length;
  const totalCompleted = myCompleted + brandCompleted;
  const progress = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  const daysToEvent = plannerEvent?.start_date ? Math.ceil((new Date(plannerEvent.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "planning", label: "Planning Hub" },
    { key: "budget", label: "Budget" },
    { key: "mytasks", label: "My Tasks" },
    { key: "brandtasks", label: `${plannerEvent?.brand_name || "Brand"} Tasks` },
    { key: "chat", label: "Chat" },
    { key: "receipts", label: "Receipts" },
  ];

  const inp = (style?: object) => ({ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", ...style });

  if (loading) return <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>

      {/* Sidebar */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000044", zIndex: 15 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "220px", background: "#2c1810", zIndex: 16, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", display: "flex", flexDirection: "column" as const, paddingTop: "60px" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
          <div style={{ fontSize: "0.7rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "4px" }}>PLANNING FOR</div>
          <div style={{ fontSize: "0.9rem", color: "#fff" }}>{plannerEvent?.brand_name || slug}</div>
          {plannerEvent?.city && <div style={{ fontSize: "0.75rem", color: "#b87333", marginTop: "2px" }}>{plannerEvent.city}</div>}
        </div>
        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {tabs.map(tab => (
            <a key={tab.key} onClick={() => { setActiveTab(tab.key as any); setSidebarOpen(false); }} style={{ display: "block", padding: "10px 1.25rem", fontSize: "0.85rem", color: activeTab === tab.key ? "#fff" : "#c8b89a", background: activeTab === tab.key ? "#3d2415" : "transparent", textDecoration: "none", borderLeft: activeTab === tab.key ? "2px solid #b87333" : "2px solid transparent", cursor: "pointer" }}>
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
        <div style={{ fontSize: "1rem", color: "#fff" }}>{plannerEvent?.brand_name || slug}{plannerEvent?.city ? ` — ${plannerEvent.city}` : ""}</div>
        <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#c8b89a" }}>{tabs.find(t => t.key === activeTab)?.label}</div>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px", margin: "0 auto" }}>

        {/* Dark brown stats box */}
        <div style={{ background: "#2c1810", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>BRAND</div>
              <div style={{ fontSize: "1.1rem" }}>{plannerEvent?.brand_name || "—"}</div>
              {plannerEvent?.city && <div style={{ fontSize: "0.75rem", color: "#b87333", marginTop: "2px" }}>{plannerEvent.city}</div>}
              {plannerEvent?.dates_label && <div style={{ fontSize: "0.75rem", color: "#c8b89a", marginTop: "2px" }}>{plannerEvent.dates_label}</div>}
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>TOTAL BUDGET</div>
              <div style={{ fontSize: "1.8rem", fontFamily: "Georgia, serif", fontWeight: "normal", color: "#e8c97a" }}>${grandTotal.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>PROGRESS</div>
              <div style={{ fontSize: "1.8rem", fontFamily: "Georgia, serif", fontWeight: "normal" }}>{progress}%</div>
              <div style={{ height: "3px", background: "#3d2415", borderRadius: "2px", marginTop: "8px" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "2px" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "#c8b89a", marginTop: "4px" }}>{totalCompleted} of {totalTasks} tasks done</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem", textAlign: "center" as const }}>
              <div style={{ fontSize: "2.5rem", color: "#2c1810", fontFamily: "Georgia, serif", fontWeight: "normal", lineHeight: 1 }}>{daysToEvent ?? "—"}</div>
              <div style={{ fontSize: "0.7rem", color: "#8b7355", marginTop: "6px", letterSpacing: "0.05em" }}>DAYS TO EVENT</div>
            </div>
          </div>
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>TASK PROGRESS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355", marginBottom: "4px" }}>MY TASKS</div>
                  <div style={{ fontSize: "1.3rem", color: "#2c1810" }}>{myCompleted}/{myTasks.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355", marginBottom: "4px" }}>{plannerEvent?.brand_name?.toUpperCase() || "BRAND"}</div>
                  <div style={{ fontSize: "1.3rem", color: "#2c1810" }}>{brandCompleted}/{brandTasks.length}</div>
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>BUDGET BREAKDOWN</div>
              {[
                { label: "Decor", value: totalDecor, color: "#b87333" },
                { label: "Refreshments", value: totalRefresh, color: "#4a7c59" },
                { label: "Staffing", value: totalStaff, color: "#5b7fa6" },
                { label: "Other", value: totalManual, color: "#8b6ab0" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 3 ? "1px solid #f0ebe4" : "none" }}>
                  <span style={{ fontSize: "0.85rem", color: "#8b7355" }}>{item.label}</span>
                  <span style={{ fontSize: "0.85rem", color: item.color, fontWeight: 500 }}>${item.value.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "2px solid #2c1810" }}>
                <span style={{ fontSize: "0.9rem", color: "#2c1810", fontWeight: 500 }}>Total</span>
                <span style={{ fontSize: "0.9rem", color: "#2c1810", fontWeight: 500 }}>${grandTotal.toFixed(2)}</span>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>RECEIPTS</div>
              <div style={{ fontSize: "1.3rem", color: "#2c1810", marginBottom: "4px" }}>{receipts.length}</div>
              <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>receipt{receipts.length !== 1 ? "s" : ""} uploaded</div>
              <div style={{ fontSize: "0.8rem", color: "#4a7c59", marginTop: "4px" }}>{receipts.filter(r => r.status === "approved").length} approved</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>MESSAGES</div>
              <div style={{ fontSize: "1.3rem", color: "#2c1810", marginBottom: "4px" }}>{messages.length}</div>
              <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>message{messages.length !== 1 ? "s" : ""} exchanged</div>
            </div>
          </div>
        )}

        {/* Planning Hub */}
        {activeTab === "planning" && (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
              {(["decor", "refreshments", "staff"] as const).map(t => (
                <button key={t} onClick={() => setPlanningTab(t)} style={{ padding: "8px 20px", background: planningTab === t ? "#2c1810" : "#fff", color: planningTab === t ? "#fff" : "#8b7355", border: "1px solid " + (planningTab === t ? "#2c1810" : "#e8e0d5"), borderRadius: "20px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif", textTransform: "capitalize" as const }}>{t}</button>
              ))}
              <a href={`/login/organizer/planner/${slug}/planning`} style={{ marginLeft: "auto", padding: "8px 16px", background: "#b87333", color: "#fff", borderRadius: "20px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>Edit & Add Items →</a>
            </div>

            {planningTab === "decor" && (
              <div>
                {["Furniture", "Props", "Lighting", "Signage", "Theme", "Florals"].map(cat => {
                  const items = decor.filter(d => d.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "8px" }}>{cat.toUpperCase()}</div>
                      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e8e0d5", overflow: "hidden" }}>
                        {items.map((item, i) => (
                          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < items.length - 1 ? "1px solid #f0ebe4" : "none" }}>
                            <div>
                              <div style={{ fontSize: "0.88rem", color: "#2c1810" }}>{item.item}</div>
                              {item.notes && <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>{item.notes}</div>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {item.quantity > 0 && <span style={{ fontSize: "0.78rem", color: "#8b7355" }}>Qty: {item.quantity}</span>}
                              <span style={{ fontSize: "0.9rem", color: "#b87333", fontWeight: 500 }}>${Number(item.cost).toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {decor.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No decor items yet. Click Edit & Add Items to add.</p>}
              </div>
            )}

            {planningTab === "refreshments" && (
              <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e8e0d5", overflow: "hidden" }}>
                {refresh.length === 0 && <p style={{ padding: "1rem", fontSize: "0.85rem", color: "#8b7355" }}>No refreshments yet.</p>}
                {refresh.map((item, i) => (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < refresh.length - 1 ? "1px solid #f0ebe4" : "none" }}>
                    <div>
                      <div style={{ fontSize: "0.88rem", color: "#2c1810" }}>{item.item}</div>
                      {item.quantity && <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>{item.quantity}</div>}
                    </div>
                    <span style={{ fontSize: "0.9rem", color: "#4a7c59", fontWeight: 500 }}>${Number(item.cost).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {planningTab === "staff" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                {staff.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No staff yet.</p>}
                {staff.map(member => {
                  const totalHours = (member.shifts || []).reduce((h, s) => h + Number(s.hours), 0);
                  const totalPay = totalHours * Number(member.pay_rate);
                  return (
                    <div key={member.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e8e0d5" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: "0.95rem", color: "#2c1810", marginBottom: "4px" }}>{member.name}</div>
                          {member.notes && <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>{member.notes}</div>}
                        </div>
                        <div style={{ textAlign: "right" as const }}>
                          {totalHours > 0 && <div style={{ fontSize: "1rem", color: "#b87333", fontWeight: 500 }}>${totalPay.toFixed(2)}</div>}
                          {totalHours > 0 && <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>{totalHours}hrs</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Budget */}
        {activeTab === "budget" && (
          <div>
            <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "#c8b89a", letterSpacing: "0.1em" }}>GRAND TOTAL</div>
              <div style={{ fontSize: "1.5rem", color: "#fff" }}>${grandTotal.toFixed(2)}</div>
            </div>

            {["Venue", "Content", "Marketing", "Operations", "Logistics"].map(cat => {
              const items = manualExpenses.filter(e => e.category === cat);
              const catTotal = items.reduce((s, e) => s + Number(e.cost), 0);
              return (
                <div key={cat} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.85rem", color: "#2c1810", fontWeight: 500 }}>{cat}</div>
                    {catTotal > 0 && <div style={{ fontSize: "0.95rem", color: "#b87333", fontWeight: 500 }}>${catTotal.toFixed(2)}</div>}
                  </div>
                  {items.map(exp => (
                    <div key={exp.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0ebe4", fontSize: "0.85rem", alignItems: "center" }}>
                      <span style={{ color: "#2c1810" }}>{exp.item}</span>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        {exp.deposit > 0 && <span style={{ fontSize: "0.75rem", color: "#4a7c59" }}>Deposit: ${Number(exp.deposit).toFixed(2)}</span>}
                        <span style={{ color: "#b87333", fontWeight: 500 }}>${Number(exp.cost).toFixed(2)}</span>
                        <button onClick={() => deleteExpense(exp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                      </div>
                    </div>
                  ))}
                  {addingExpense === cat ? (
                    <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" as const, alignItems: "center" }}>
                      <input placeholder="Item description" value={newExpense.item} onChange={e => setNewExpense(prev => ({...prev, item: e.target.value}))} style={{ flex: 1, padding: "6px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif", minWidth: "150px" }} />
                      <input placeholder="Cost $" value={newExpense.cost} onChange={e => setNewExpense(prev => ({...prev, cost: e.target.value}))} style={{ width: "80px", padding: "6px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
                      <input placeholder="Deposit $" value={newExpense.deposit} onChange={e => setNewExpense(prev => ({...prev, deposit: e.target.value}))} style={{ width: "80px", padding: "6px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
                      <button onClick={() => addExpense(cat)} style={{ padding: "6px 12px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Save</button>
                      <button onClick={() => setAddingExpense(null)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingExpense(cat); setNewExpense({ item: "", cost: "", deposit: "" }); }} style={{ marginTop: "8px", fontSize: "0.78rem", padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", cursor: "pointer", color: "#8b7355" }}>+ Add {cat.toLowerCase()} expense</button>
                  )}
                </div>
              );
            })}

            {[
              { label: "Decor", items: decor.map(d => ({ name: d.item, cost: d.cost, detail: d.category })), total: totalDecor, color: "#b87333" },
              { label: "Refreshments", items: refresh.map(r => ({ name: r.item, cost: r.cost, detail: r.quantity })), total: totalRefresh, color: "#4a7c59" },
              { label: "Staffing", items: staff.map(s => ({ name: s.name, cost: (s.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0) * Number(s.pay_rate), detail: s.notes })), total: totalStaff, color: "#5b7fa6" },
            ].map(section => (
              <div key={section.label} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: section.color }} />
                    <div style={{ fontSize: "0.85rem", color: "#2c1810", fontWeight: 500 }}>{section.label}</div>
                    <span style={{ fontSize: "0.7rem", color: "#8b7355", background: "#f0ebe4", padding: "1px 6px", borderRadius: "10px" }}>Planning Hub</span>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: section.color, fontWeight: 500 }}>${section.total.toFixed(2)}</div>
                </div>
                {section.items.filter(i => i.cost > 0).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f8f5f0", fontSize: "0.82rem" }}>
                    <div>
                      <span style={{ color: "#2c1810" }}>{item.name}</span>
                      {item.detail && <span style={{ color: "#8b7355", fontSize: "0.72rem", marginLeft: "6px" }}>{item.detail}</span>}
                    </div>
                    <span style={{ color: section.color }}>${Number(item.cost).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* My Tasks */}
        {activeTab === "mytasks" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>My Tasks ({myCompleted}/{myTasks.length})</div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap" as const }}>
              <input placeholder="Add a task..." value={newMyTask.task} onChange={e => setNewMyTask({...newMyTask, task: e.target.value})} onKeyDown={e => e.key === "Enter" && addMyTask()} style={inp({ flex: 1, minWidth: "200px" })} />
              <input type="date" value={newMyTask.due_date} onChange={e => setNewMyTask({...newMyTask, due_date: e.target.value})} style={inp({ width: "150px" })} />
              <button onClick={addMyTask} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Add</button>
            </div>
            {myTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks yet. Add your first task above.</p>}
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
          </div>
        )}

        {/* Brand Tasks */}
        {activeTab === "brandtasks" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "0.5rem" }}>{plannerEvent?.brand_name || "Brand"} Tasks ({brandCompleted}/{brandTasks.length})</div>
            <p style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1rem" }}>These tasks are visible to {plannerEvent?.brand_name || "the brand"} on their portal. Assign to a team member if needed.</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap" as const }}>
              <input placeholder="Add a task for the brand..." value={newBrandTask.task} onChange={e => setNewBrandTask({...newBrandTask, task: e.target.value})} onKeyDown={e => e.key === "Enter" && addBrandTask()} style={inp({ flex: 1, minWidth: "200px" })} />
              <input type="date" value={newBrandTask.due_date} onChange={e => setNewBrandTask({...newBrandTask, due_date: e.target.value})} style={inp({ width: "150px" })} />
              <input placeholder="Assign to (name)" value={newBrandTask.assigned_to} onChange={e => setNewBrandTask({...newBrandTask, assigned_to: e.target.value})} style={inp({ width: "150px" })} />
              <button onClick={addBrandTask} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Add</button>
            </div>
            {brandTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks yet.</p>}
            {brandTasks.map(task => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px" }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div onClick={() => toggleTask(task, false)} style={{ width: "18px", height: "18px", borderRadius: "50%", border: task.completed ? "none" : "2px solid #d4c5b0", background: task.completed ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {task.completed && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.88rem", color: task.completed ? "#b0a090" : "#2c1810", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                    {task.due_date && <span style={{ fontSize: "0.72rem", color: "#8b7355" }}>Due {task.due_date}</span>}
                    {task.assigned_to && <span style={{ fontSize: "0.72rem", color: "#b87333" }}>→ {task.assigned_to}</span>}
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id, false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Chat */}
        {activeTab === "chat" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>Chat with {plannerEvent?.brand_name || "brand"}</div>
            <div style={{ height: "400px", overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column" as const, gap: "10px", padding: "0.5rem" }}>
              {messages.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginTop: "2rem" }}>No messages yet. Start the conversation.</p>}
              {messages.map(msg => {
                const isMe = msg.sender_email === userEmail;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: "0.7rem", color: "#8b7355", marginBottom: "2px" }}>{msg.sender_name}</div>
                    <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? "#2c1810" : "#f0ebe4", color: isMe ? "#fff" : "#2c1810", fontSize: "0.88rem", lineHeight: 1.5 }}>{msg.message}</div>
                    <div style={{ fontSize: "0.68rem", color: "#b0a090", marginTop: "2px" }}>{formatDate(msg.created_at)}</div>
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
            <p style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1rem" }}>{plannerEvent?.brand_name || "The brand"} can approve or reject these from their portal.</p>

            <div style={{ background: "#faf8f5", borderRadius: "10px", padding: "1rem", border: "1px solid #f0ebe4", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.82rem", color: "#2c1810", marginBottom: "10px", fontWeight: 500 }}>Upload new receipt or invoice</div>
              <input placeholder="Description e.g. Venue deposit" value={newReceipt.description} onChange={e => setNewReceipt({...newReceipt, description: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", marginBottom: "8px", boxSizing: "border-box" as const }} />
              <input placeholder="Amount $" value={newReceipt.amount} onChange={e => setNewReceipt({...newReceipt, amount: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", marginBottom: "8px", boxSizing: "border-box" as const }} />
              <div onClick={() => document.getElementById("receipt-upload")?.click()} style={{ border: "2px dashed #e8e0d5", borderRadius: "8px", padding: "12px", textAlign: "center" as const, cursor: "pointer", marginBottom: "8px", background: selectedReceiptFile ? "#f0faf0" : "#fff" }}>
                <input id="receipt-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => setSelectedReceiptFile(e.target.files?.[0] || null)} />
                {selectedReceiptFile ? <div style={{ fontSize: "0.82rem", color: "#4a7c59" }}>✓ {selectedReceiptFile.name}</div> : <div style={{ fontSize: "0.82rem", color: "#8b7355" }}>Click to select file (PDF or image)</div>}
              </div>
              <button onClick={uploadReceipt} disabled={uploading || !newReceipt.description.trim() || !selectedReceiptFile} style={{ padding: "8px 16px", background: selectedReceiptFile && newReceipt.description ? "#2c1810" : "#d4c5b0", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: selectedReceiptFile && newReceipt.description ? "pointer" : "not-allowed", fontFamily: "Georgia, serif" }}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>

            {receipts.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No receipts uploaded yet.</p>
            ) : (
              receipts.map(receipt => (
                <div key={receipt.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "#faf8f5", marginBottom: "8px", border: "1px solid #f0ebe4" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.88rem", color: "#2c1810" }}>{receipt.description}</div>
                    <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>{receipt.file_name} · {new Date(receipt.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#b87333", fontWeight: 500 }}>${Number(receipt.amount).toFixed(2)}</div>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: receipt.status === "approved" ? "#4a7c5922" : receipt.status === "rejected" ? "#c0392b22" : "#f0ebe4", color: receipt.status === "approved" ? "#4a7c59" : receipt.status === "rejected" ? "#c0392b" : "#8b7355" }}>
                    {receipt.status === "approved" ? "Approved" : receipt.status === "rejected" ? "Rejected" : "Pending"}
                  </span>
                  <a href={receipt.file_url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", padding: "3px 8px", background: "#2c1810", color: "#fff", borderRadius: "6px", textDecoration: "none" }}>↓</a>
                  <button onClick={() => deleteReceipt(receipt.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
