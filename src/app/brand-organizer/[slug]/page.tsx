/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type PlannerInfo = {
  id: number;
  planner_email: string;
  planner_name?: string;
  brand_name: string;
  city?: string;
  dates_label?: string;
  venue_name?: string;
  venue_address?: string;
  start_date?: string;
  budget?: number;
};

type Task = {
  id: number;
  task: string;
  due_date: string;
  completed: boolean;
  assigned_to?: string;
  owner: string;
};

type Message = {
  id: number;
  sender_email: string;
  sender_name: string;
  message: string;
  created_at: string;
};

type Invoice = {
  id: number;
  item_name: string;
  item_category: string;
  description: string;
  amount: number;
  file_url: string;
  file_name: string;
  status: string;
  rejection_note: string;
  created_at: string;
};

type Shipment = {
  id: number;
  notes: string;
  shipped: boolean;
};

type DecorItem = { id: number; category: string; item: string; cost: number; quantity: number; notes: string; brand_status?: string; decision?: string; vendor?: string; };
type RefreshItem = { id: number; item: string; quantity: string; cost: number; notes: string; brand_status?: string; };
type StaffItem = { id: number; name: string; role: string; pay_rate: number; notes: string; brand_status?: string; shifts?: { staff_id: number; hours: number }[]; };

export default function BrandCityDashboard() {
  const params = useParams();
  const slug = params.slug as string;

  const [planner, setPlanner] = useState<PlannerInfo | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [decor, setDecor] = useState<DecorItem[]>([]);
  const [refresh, setRefresh] = useState<RefreshItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [expenses, setExpenses] = useState<{id: number; category: string; item: string; cost: number; deposit: number;}[]>([]);
  const [comments, setComments] = useState<{id: number; item_name: string; sender_email: string; sender_name: string; message: string; created_at: string;}[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "planning" | "budget" | "invoices" | "tasks" | "shipments" | "chat">("overview");
  const [planningTab, setPlanningTab] = useState<"decor" | "refreshments" | "staff">("decor");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newShipment, setNewShipment] = useState("");
  const [addingShipment, setAddingShipment] = useState(false);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [newMyTask, setNewMyTask] = useState({ task: "", due_date: "" });
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [editingPlannerName, setEditingPlannerName] = useState(false);
  const [newPlannerName, setNewPlannerName] = useState("");
  const [budget, setBudget] = useState(0);
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState("");

  useEffect(() => { if (slug) fetchAll(); }, [slug]);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setUserEmail(user.email || "");
    const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).single();
    if (profile?.name) setUserName(profile.name);

    const [plannerRes, allTasksRes, messagesRes, invoicesRes, shipmentsRes, decorRes, refreshRes, staffRes, shiftsRes, expensesRes, commentsRes] = await Promise.all([
      supabase.from("event_planners").select("*").eq("event_slug", slug).maybeSingle(),
      supabase.from("planner_tasks").select("*").eq("event_slug", slug).order("created_at"),
      supabase.from("planner_messages").select("*").eq("event_slug", slug).order("created_at"),
      supabase.from("item_invoices").select("*").eq("event_slug", slug).order("created_at", { ascending: false }),
      supabase.from("shipments").select("*").eq("event_slug", slug),
      supabase.from("planning_decor").select("*").eq("event", slug).order("category"),
      supabase.from("planning_refreshments").select("*").eq("event", slug),
      supabase.from("planning_staff").select("*").eq("event", slug),
      supabase.from("planning_staff_shifts").select("*").eq("event", slug),
      supabase.from("expenses").select("*").eq("event", slug),
      supabase.from("item_comments").select("*").eq("event_slug", slug).order("created_at"),
    ]);

    if (plannerRes.data) {
      setPlanner(plannerRes.data);
      setNewPlannerName(plannerRes.data.planner_name || "");
      setBudget(Number(plannerRes.data.budget) || 0);
      setNewBudget(String(plannerRes.data.budget || ""));
    }
    if (allTasksRes.data) {
      setAssignedTasks(allTasksRes.data.filter((t: Task) => t.owner === "brand"));
      setMyTasks(allTasksRes.data.filter((t: Task) => t.owner === "brand_self"));
    }
    if (messagesRes.data) setMessages(messagesRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (shipmentsRes.data) setShipments(shipmentsRes.data);
    if (decorRes.data) setDecor(decorRes.data);
    if (refreshRes.data) setRefresh(refreshRes.data);
    if (staffRes.data && shiftsRes.data) {
      setStaff(staffRes.data.map((s: any) => ({
        ...s, shifts: shiftsRes.data.filter((sh: any) => sh.staff_id === s.id)
      })));
    }
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (commentsRes.data) setComments(commentsRes.data);
    setLoading(false);
  };

  const toggleTask = async (task: Task, isMine: boolean) => {
    await supabase.from("planner_tasks").update({ completed: !task.completed }).eq("id", task.id);
    if (isMine) setMyTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    else setAssignedTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  };

  const addMyTask = async () => {
    if (!newMyTask.task.trim()) return;
    const { data } = await supabase.from("planner_tasks").insert({
      event_slug: slug, planner_email: planner?.planner_email || "", brand_email: userEmail,
      task: newMyTask.task, due_date: newMyTask.due_date || null, completed: false, owner: "brand_self"
    }).select().single();
    if (data) setMyTasks(prev => [...prev, data]);
    setNewMyTask({ task: "", due_date: "" });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const { data } = await supabase.from("planner_messages").insert({
      event_slug: slug, sender_email: userEmail, sender_name: userName || userEmail, message: newMessage
    }).select().single();
    if (data) setMessages(prev => [...prev, data]);
    setNewMessage("");
  };

  const approveInvoice = async (id: number) => {
    await supabase.from("item_invoices").update({ status: "approved" }).eq("id", id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: "approved" } : inv));
  };

  const rejectInvoice = async (id: number) => {
    if (!rejectionNote.trim()) return;
    await supabase.from("item_invoices").update({ status: "rejected", rejection_note: rejectionNote }).eq("id", id);
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: "rejected", rejection_note: rejectionNote } : inv));
    setRejecting(null);
    setRejectionNote("");
  };

  const addShipment = async () => {
    if (!newShipment.trim()) return;
    const { data } = await supabase.from("shipments").insert({
      event_slug: slug, organizer_email: userEmail, notes: newShipment, shipped: false
    }).select().single();
    if (data) setShipments(prev => [...prev, data]);
    setNewShipment("");
    setAddingShipment(false);
  };

  const toggleShipment = async (shipment: Shipment) => {
    await supabase.from("shipments").update({ shipped: !shipment.shipped }).eq("id", shipment.id);
    setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, shipped: !s.shipped } : s));
  };

  const updateBrandStatus = async (table: string, itemId: number, status: string) => {
    await supabase.from(table).update({ brand_status: status }).eq("id", itemId);
    if (table === "planning_decor") setDecor(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
    if (table === "planning_refreshments") setRefresh(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
    if (table === "planning_staff") setStaff(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
  };

  const sendComment = async (itemName: string) => {
    if (!newComment.trim()) return;
    const { data } = await supabase.from("item_comments").insert({
      event_slug: slug, item_name: itemName,
      sender_email: userEmail, sender_name: userName || userEmail, message: newComment,
    }).select().single();
    if (data) setComments(prev => [...prev, data]);
    setNewComment("");
  };

  const savePlannerName = async () => {
    if (!planner) return;
    await supabase.from("event_planners").update({ planner_name: newPlannerName }).eq("id", planner.id);
    setPlanner(prev => prev ? { ...prev, planner_name: newPlannerName } : prev);
    setEditingPlannerName(false);
  };

  const saveBudget = async () => {
    const val = parseFloat(newBudget) || 0;
    await supabase.from("event_planners").update({ budget: val }).eq("event_slug", slug);
    setBudget(val);
    setEditingBudget(false);
  };

  const totalDecor = decor.reduce((s, x) => s + Number(x.cost), 0);
  const totalRefresh = refresh.reduce((s, x) => s + Number(x.cost), 0);
  const totalStaff = staff.reduce((s, m) => {
    const hrs = (m.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0);
    return s + hrs * Number(m.pay_rate);
  }, 0);
  const totalManual = expenses.reduce((s, e) => s + Number(e.cost), 0);
  const totalSpent = totalDecor + totalRefresh + totalStaff + totalManual;
  const isOverBudget = budget > 0 && totalSpent > budget;

  const pendingInvoices = invoices.filter(i => i.status === "pending").length;
  const assignedCompleted = assignedTasks.filter(t => t.completed).length;
  const myCompleted = myTasks.filter(t => t.completed).length;
  const overdueAssigned = assignedTasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < new Date()).length;
  const daysToEvent = planner?.start_date ? Math.ceil((new Date(planner.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const cityName = planner?.city || slug;
  const datesLabel = planner?.dates_label || "";
  const venueName = planner?.venue_name || "";
  const venueAddress = planner?.venue_address || "";
  const plannerDisplay = planner?.planner_name || planner?.planner_email || "Not assigned";

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "planning", label: "Planning Hub" },
    { key: "budget", label: "Budget" },
    { key: "invoices", label: `Invoices${pendingInvoices > 0 ? ` (${pendingInvoices})` : ""}` },
    { key: "tasks", label: `Tasks${overdueAssigned > 0 ? " ⚠" : ""}` },
    { key: "shipments", label: "Shipments" },
    { key: "chat", label: "Chat" },
  ];

  const inp = (style?: object) => ({ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", ...style });

  const CommentThread = ({ itemName, table, itemId }: { itemName: string; table: string; itemId: number }) => {
    const itemComments = comments.filter(c => c.item_name === itemName);
    const isActive = activeComment === itemName;
    return (
      <div style={{ marginTop: "8px" }}>
        <button onClick={() => setActiveComment(isActive ? null : itemName)} style={{ background: "transparent", border: "none", cursor: "pointer", color: itemComments.length > 0 ? "#b87333" : "#c8bfb5", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px", padding: "2px 0" }}>
          ✏ {itemComments.length > 0 ? `${itemComments.length} note${itemComments.length > 1 ? "s" : ""}` : "Add note"}
        </button>
        {isActive && (
          <div style={{ marginTop: "6px", background: "#faf8f5", borderRadius: "8px", padding: "8px", border: "1px solid #f0ebe4" }}>
            {itemComments.map(c => (
              <div key={c.id} style={{ marginBottom: "6px", padding: "6px 8px", background: "#fff", borderRadius: "6px", borderLeft: c.sender_email === userEmail ? "2px solid #b87333" : "2px solid #e8e0d5" }}>
                <div style={{ fontSize: "0.68rem", color: "#8b7355", marginBottom: "2px" }}>{c.sender_name} · {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                <div style={{ fontSize: "0.82rem", color: "#7a5c3a" }}>{c.message}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <input placeholder="Add a note..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment(itemName)} style={{ flex: 1, padding: "5px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.78rem", fontFamily: "Georgia, serif" }} autoFocus />
              <button onClick={() => sendComment(itemName)} style={{ padding: "5px 10px", background: "#7a5c3a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const BrandApproval = ({ itemName, table, itemId, brandStatus }: { itemName: string; table: string; itemId: number; brandStatus?: string }) => {
    return (
      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f0ebe4" }}>
        {brandStatus === "suggested" && (
          <div style={{ background: "#b8733311", borderRadius: "8px", padding: "8px 10px", marginBottom: "6px", border: "1px solid #b8733333" }}>
            <div style={{ fontSize: "0.72rem", color: "#b87333", marginBottom: "6px", letterSpacing: "0.05em" }}>SUGGESTED BY YOUR PLANNER</div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => updateBrandStatus(table, itemId, "approved")} title="Approve" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#4a7c59", color: "#fff", border: "none", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</button>
              <button onClick={() => updateBrandStatus(table, itemId, "rejected")} title="Remove" style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#c0392b", color: "#fff", border: "none", cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          </div>
        )}
        {brandStatus === "approved" && (
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
            <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#4a7c59", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>
            </div>
            <span style={{ fontSize: "0.72rem", color: "#4a7c59" }}>Approved by you</span>
            <button onClick={() => updateBrandStatus(table, itemId, "suggested")} style={{ fontSize: "0.68rem", color: "#8b7355", background: "transparent", border: "none", cursor: "pointer", marginLeft: "auto" }}>Undo</button>
          </div>
        )}
        {brandStatus === "rejected" && (
          <div style={{ marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#c0392b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: "11px" }}>✕</span>
              </div>
              <span style={{ fontSize: "0.72rem", color: "#c0392b" }}>Removed by you</span>
              <button onClick={() => updateBrandStatus(table, itemId, "suggested")} style={{ fontSize: "0.68rem", color: "#8b7355", background: "transparent", border: "none", cursor: "pointer", marginLeft: "auto" }}>Undo</button>
            </div>
          </div>
        )}
        <CommentThread itemName={itemName} table={table} itemId={itemId} />
      </div>
    );
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#faf7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f4", fontFamily: "Georgia, serif" }}>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000033", zIndex: 15 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "240px", background: "#7a5c3a", zIndex: 16, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.3s ease", display: "flex", flexDirection: "column" as const }}>
        <div style={{ padding: "2rem 1.5rem 1.5rem", borderBottom: "1px solid #8a6c4a" }}>
          <div style={{ fontSize: "0.65rem", color: "#8b6a4a", letterSpacing: "0.15em", marginBottom: "8px" }}>YOUR EVENT</div>
          <div style={{ fontSize: "1.1rem", color: "#fff", letterSpacing: "0.05em" }}>{cityName}</div>
          {datesLabel && <div style={{ fontSize: "0.75rem", color: "#c8a882", marginTop: "4px" }}>{datesLabel}</div>}
          {pendingInvoices > 0 && (
            <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "4px", background: "#c0392b22", border: "1px solid #c0392b44", borderRadius: "20px", padding: "2px 8px" }}>
              <span style={{ fontSize: "0.65rem", color: "#c0392b" }}>{pendingInvoices} invoice{pendingInvoices > 1 ? "s" : ""} pending</span>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {tabs.map(tab => (
            <a key={tab.key} onClick={() => { setActiveTab(tab.key as any); setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", padding: "12px 1.5rem", fontSize: "0.82rem", color: activeTab === tab.key ? "#fff" : "#8b6a4a", background: activeTab === tab.key ? "#8a6c4a" : "transparent", textDecoration: "none", borderLeft: activeTab === tab.key ? "2px solid #c8a882" : "2px solid transparent", cursor: "pointer", letterSpacing: "0.05em", transition: "all 0.15s" }}>
              {tab.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: "1.5rem", borderTop: "1px solid #8a6c4a" }}>
          <Link href="/brand-organizer" style={{ fontSize: "0.75rem", color: "#8b6a4a", textDecoration: "none", letterSpacing: "0.08em" }}>← ALL CITIES</Link>
        </div>
      </div>

      <div style={{ background: "#7a5c3a", padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky" as const, top: 0, zIndex: 14 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column" as const, gap: "5px" }}>
          <span style={{ display: "block", width: "22px", height: "1px", background: sidebarOpen ? "#c8a882" : "#8b6a4a", transition: "all 0.2s", transform: sidebarOpen ? "rotate(45deg) translate(4px, 4px)" : "none" }} />
          <span style={{ display: "block", width: "22px", height: "1px", background: sidebarOpen ? "transparent" : "#8b6a4a", transition: "all 0.2s" }} />
          <span style={{ display: "block", width: "22px", height: "1px", background: sidebarOpen ? "#c8a882" : "#8b6a4a", transition: "all 0.2s", transform: sidebarOpen ? "rotate(-45deg) translate(4px, -4px)" : "none" }} />
        </button>
        <div style={{ fontSize: "0.85rem", color: "#fff", letterSpacing: "0.1em" }}>{cityName.toUpperCase()}</div>
        <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: "#8b6a4a", letterSpacing: "0.1em" }}>{tabs.find(t => t.key === activeTab)?.label.toUpperCase()}</div>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px", margin: "0 auto" }}>

        {activeTab === "overview" && (
          <div>
            {/* Hero stats */}
            <div style={{ background: "#7a5c3a", borderRadius: "20px", padding: "2.5rem", marginBottom: "2rem", color: "#fff", position: "relative" as const, overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: "200px", height: "200px", background: "radial-gradient(circle, #b8733322 0%, transparent 70%)", pointerEvents: "none" as const }} />
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "2rem", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: "0.6rem", color: "#8b6a4a", letterSpacing: "0.2em", marginBottom: "8px" }}>LOCATION</div>
                  <div style={{ fontSize: "1.8rem", fontWeight: "normal", letterSpacing: "0.05em", lineHeight: 1.1 }}>{cityName}</div>
                  {datesLabel && <div style={{ fontSize: "0.85rem", color: "#c8a882", marginTop: "8px" }}>{datesLabel}</div>}
                  {venueName && <div style={{ fontSize: "0.75rem", color: "#8b6a4a", marginTop: "6px" }}>📍 {venueName}</div>}
                  {venueAddress && <div style={{ fontSize: "0.7rem", color: "#5a4a3a", marginTop: "2px" }}>{venueAddress}</div>}
                </div>
                <div>
                  <div style={{ fontSize: "0.6rem", color: "#8b6a4a", letterSpacing: "0.2em", marginBottom: "8px" }}>BUDGET</div>
                  <div style={{ fontSize: "1.4rem", color: isOverBudget ? "#ff6b6b" : "#c8a882" }}>${totalSpent.toFixed(0)}</div>
                  {budget > 0 && <div style={{ fontSize: "0.72rem", color: isOverBudget ? "#ff6b6b" : "#8b6a4a", marginTop: "4px" }}>of ${budget.toFixed(0)}</div>}
                  {budget > 0 && (
                    <div style={{ height: "2px", background: "#3d2415", borderRadius: "2px", marginTop: "8px" }}>
                      <div style={{ height: "100%", width: `${Math.min((totalSpent / budget) * 100, 100)}%`, background: isOverBudget ? "#ff6b6b" : "#c8a882", borderRadius: "2px" }} />
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "0.6rem", color: "#8b6a4a", letterSpacing: "0.2em", marginBottom: "8px" }}>TASKS</div>
                  <button onClick={() => setActiveTab("tasks")} style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, padding: 0 }}>
                    <div style={{ fontSize: "1.4rem", color: "#fff" }}>{assignedCompleted + myCompleted}/{assignedTasks.length + myTasks.length}</div>
                    <div style={{ fontSize: "0.72rem", color: overdueAssigned > 0 ? "#ff6b6b" : "#8b6a4a", marginTop: "4px" }}>{overdueAssigned > 0 ? `${overdueAssigned} overdue` : "completed"}</div>
                  </button>
                </div>
                <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", textAlign: "center" as const }}>
                  <div style={{ fontSize: "3rem", color: "#7a5c3a", lineHeight: 1, fontWeight: "normal" }}>{daysToEvent ?? "—"}</div>
                  <div style={{ fontSize: "0.6rem", color: "#8b7355", marginTop: "6px", letterSpacing: "0.1em" }}>DAYS TO EVENT</div>
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #ede8e2" }}>
                <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.15em", marginBottom: "12px" }}>YOUR PLANNER</div>
                {editingPlannerName ? (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input value={newPlannerName} onChange={e => setNewPlannerName(e.target.value)} placeholder="Planner name" style={{ flex: 1, padding: "5px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} autoFocus />
                    <button onClick={savePlannerName} style={{ padding: "5px 8px", background: "#7a5c3a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>✓</button>
                    <button onClick={() => setEditingPlannerName(false)} style={{ padding: "5px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: "1rem", color: "#7a5c3a" }}>{plannerDisplay}</div>
                    <button onClick={() => setEditingPlannerName(true)} style={{ fontSize: "0.68rem", color: "#8b7355", background: "transparent", border: "none", cursor: "pointer" }}>Edit</button>
                  </div>
                )}
              </div>

              <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #ede8e2", cursor: "pointer" }} onClick={() => setActiveTab("budget")}>
                <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.15em", marginBottom: "12px" }}>INVOICES</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div><div style={{ fontSize: "1.4rem", color: "#b87333" }}>{pendingInvoices}</div><div style={{ fontSize: "0.65rem", color: "#8b7355" }}>Pending</div></div>
                  <div><div style={{ fontSize: "1.4rem", color: "#4a7c59" }}>{invoices.filter(i => i.status === "approved").length}</div><div style={{ fontSize: "0.65rem", color: "#8b7355" }}>Approved</div></div>
                  <div><div style={{ fontSize: "1.4rem", color: "#c0392b" }}>{invoices.filter(i => i.status === "rejected").length}</div><div style={{ fontSize: "0.65rem", color: "#8b7355" }}>Rejected</div></div>
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #ede8e2" }}>
                <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.15em", marginBottom: "12px" }}>SHIPMENTS</div>
                <div style={{ fontSize: "1.4rem", color: "#7a5c3a", marginBottom: "4px" }}>{shipments.filter(s => s.shipped).length}/{shipments.length}</div>
                <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>shipped to {cityName}</div>
              </div>
            </div>

            {isOverBudget && (
              <div style={{ background: "#ff6b6b11", border: "1px solid #ff6b6b33", borderRadius: "14px", padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                <div>
                  <div style={{ fontSize: "0.9rem", color: "#c0392b" }}>Over budget by ${(totalSpent - budget).toFixed(2)}</div>
                  <div style={{ fontSize: "0.78rem", color: "#8b7355", marginTop: "2px" }}>Your spending of ${totalSpent.toFixed(2)} exceeds your target of ${budget.toFixed(2)}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Planning Hub */}
        {activeTab === "planning" && (
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "2rem" }}>
              {(["decor", "refreshments", "staff"] as const).map(t => (
                <button key={t} onClick={() => setPlanningTab(t)} style={{ padding: "8px 24px", background: planningTab === t ? "#7a5c3a" : "#fff", color: planningTab === t ? "#fff" : "#8b7355", border: "1px solid " + (planningTab === t ? "#7a5c3a" : "#ede8e2"), borderRadius: "30px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif", textTransform: "capitalize" as const, letterSpacing: "0.08em" }}>{t}</button>
              ))}
            </div>

            {planningTab === "decor" && (
              <div>
                {["Furniture", "Props", "Lighting", "Signage", "Theme", "Florals"].map(cat => {
                  const items = decor.filter(d => d.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom: "2rem" }}>
                      <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.2em", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "12px" }}>
                        {cat.toUpperCase()}
                        <div style={{ flex: 1, height: "1px", background: "#ede8e2" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                        {items.map(item => (
                          <div key={item.id} style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", border: "1px solid #ede8e2", borderLeft: item.brand_status === "approved" ? "3px solid #4a7c59" : item.brand_status === "rejected" ? "3px solid #c0392b" : item.brand_status === "suggested" ? "3px solid #b87333" : "1px solid #ede8e2" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                              <div style={{ fontSize: "0.95rem", color: "#2c1810", fontWeight: 500 }}>{item.item}</div>
                              {item.cost > 0 && <div style={{ fontSize: "0.85rem", color: "#b87333" }}>${Number(item.cost).toFixed(2)}</div>}
                            </div>
                            {item.quantity > 0 && <div style={{ fontSize: "0.72rem", color: "#8b7355", marginBottom: "2px" }}>Qty: {item.quantity}</div>}
                            {item.decision && item.decision !== "TBD" && <div style={{ fontSize: "0.78rem", color: "#5a4a3a", marginBottom: "4px", lineHeight: 1.4 }}>{item.decision}</div>}
                            {item.vendor && <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Vendor: {item.vendor}</div>}
                            {item.notes && <div style={{ fontSize: "0.72rem", color: "#aaa", marginTop: "4px", fontStyle: "italic" }}>{item.notes}</div>}
                            <BrandApproval itemName={item.item} table="planning_decor" itemId={item.id} brandStatus={item.brand_status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {decor.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No decor items yet.</p>}
              </div>
            )}

            {planningTab === "refreshments" && (
              <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #ede8e2", overflow: "hidden" }}>
                {refresh.length === 0 && <p style={{ padding: "1.5rem", fontSize: "0.85rem", color: "#8b7355" }}>No refreshments yet.</p>}
                {refresh.map((item, i) => (
                  <div key={item.id} style={{ padding: "1rem 1.25rem", borderBottom: i < refresh.length - 1 ? "1px solid #f5f2ee" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>{item.item}</div>
                        {item.quantity && <div style={{ fontSize: "0.72rem", color: "#8b7355", marginTop: "2px" }}>{item.quantity}</div>}
                      </div>
                      {item.cost > 0 && <span style={{ fontSize: "0.85rem", color: "#4a7c59" }}>${Number(item.cost).toFixed(2)}</span>}
                    </div>
                    <BrandApproval itemName={item.item} table="planning_refreshments" itemId={item.id} brandStatus={item.brand_status} />
                  </div>
                ))}
              </div>
            )}

            {planningTab === "staff" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                {staff.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No staff yet.</p>}
                {staff.map(member => {
                  const totalHours = (member.shifts || []).reduce((h, s) => h + Number(s.hours), 0);
                  const totalPay = totalHours * Number(member.pay_rate);
                  return (
                    <div key={member.id} style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", border: "1px solid #ede8e2" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <div style={{ fontSize: "0.95rem", color: "#2c1810" }}>{member.name}</div>
                        {totalPay > 0 && <div style={{ fontSize: "0.85rem", color: "#b87333" }}>${totalPay.toFixed(2)}</div>}
                      </div>
                      {member.notes && <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>{member.notes}</div>}
                      {totalHours > 0 && <div style={{ fontSize: "0.72rem", color: "#8b7355", marginTop: "2px" }}>{totalHours} hrs</div>}
                      <BrandApproval itemName={member.name} table="planning_staff" itemId={member.id} brandStatus={member.brand_status} />
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
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #ede8e2" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.15em" }}>YOUR TARGET BUDGET</div>
                {editingBudget ? (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="Enter amount" style={{ padding: "5px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.85rem", width: "120px", fontFamily: "Georgia, serif" }} autoFocus />
                    <button onClick={saveBudget} style={{ padding: "5px 10px", background: "#7a5c3a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditingBudget(false)} style={{ padding: "5px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingBudget(true)} style={{ fontSize: "0.72rem", color: "#8b7355", background: "transparent", border: "1px solid #ede8e2", borderRadius: "6px", padding: "3px 10px", cursor: "pointer" }}>
                    {budget > 0 ? "Edit" : "Set budget"}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.1em", marginBottom: "6px" }}>TARGET</div>
                  <div style={{ fontSize: "1.5rem", color: "#2c1810" }}>{budget > 0 ? `$${budget.toFixed(0)}` : "—"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.1em", marginBottom: "6px" }}>SPENT</div>
                  <div style={{ fontSize: "1.5rem", color: isOverBudget ? "#c0392b" : "#2c1810" }}>${totalSpent.toFixed(0)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.1em", marginBottom: "6px" }}>{isOverBudget ? "OVER" : "REMAINING"}</div>
                  <div style={{ fontSize: "1.5rem", color: isOverBudget ? "#c0392b" : "#4a7c59" }}>{budget > 0 ? `$${Math.abs(budget - totalSpent).toFixed(0)}` : "—"}</div>
                </div>
              </div>
              {budget > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#8b7355", marginBottom: "6px" }}>
                    <span>{Math.round((totalSpent / budget) * 100)}% of budget used</span>
                    {isOverBudget && <span style={{ color: "#c0392b" }}>Over by ${(totalSpent - budget).toFixed(0)}</span>}
                  </div>
                  <div style={{ height: "4px", background: "#f0ebe4", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${Math.min((totalSpent / budget) * 100, 100)}%`, background: isOverBudget ? "#c0392b" : totalSpent / budget > 0.8 ? "#b87333" : "#4a7c59", borderRadius: "2px" }} />
                  </div>
                </div>
              )}
            </div>

            {[
              { label: "Decor", items: decor.map(d => ({ name: d.item, cost: d.cost, detail: d.category })), total: totalDecor, color: "#b87333" },
              { label: "Refreshments", items: refresh.map(r => ({ name: r.item, cost: r.cost, detail: r.quantity })), total: totalRefresh, color: "#4a7c59" },
              { label: "Staffing", items: staff.map(s => ({ name: s.name, cost: (s.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0) * Number(s.pay_rate), detail: s.notes })), total: totalStaff, color: "#5b7fa6" },
            ].map(section => section.total > 0 ? (
              <div key={section.label} style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #ede8e2" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: section.color }} />
                    <span style={{ fontSize: "0.82rem", color: "#2c1810", letterSpacing: "0.05em" }}>{section.label.toUpperCase()}</span>
                  </div>
                  <span style={{ fontSize: "0.95rem", color: section.color }}>${section.total.toFixed(2)}</span>
                </div>
                {section.items.filter(i => i.cost > 0).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f8f5f2", fontSize: "0.8rem" }}>
                    <span style={{ color: "#8b7355" }}>{item.name}</span>
                    <span style={{ color: section.color }}>${Number(item.cost).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : null)}

            <div style={{ background: "#7a5c3a", borderRadius: "14px", padding: "1rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.72rem", color: "#8b6a4a", letterSpacing: "0.15em" }}>TOTAL SPEND</span>
              <span style={{ fontSize: "1.2rem", color: "#fff" }}>${totalSpent.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Invoices */}
        {activeTab === "invoices" && (
          <div>
            <p style={{ fontSize: "0.82rem", color: "#8b7355", marginBottom: "1.5rem" }}>Review and approve or reject invoices from your planner. Approved invoices will be paid.</p>
            {invoices.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", textAlign: "center", border: "1px solid #ede8e2" }}>
                <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No invoices yet.</p>
              </div>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #ede8e2", borderLeft: `3px solid ${inv.status === "approved" ? "#4a7c59" : inv.status === "rejected" ? "#c0392b" : "#b87333"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                    <div>
                      <div style={{ fontSize: "0.9rem", color: "#2c1810", fontWeight: 500 }}>{inv.description}</div>
                      <button onClick={() => { setActiveTab("planning"); setPlanningTab(inv.item_category?.toLowerCase() === "refreshments" ? "refreshments" : inv.item_category?.toLowerCase() === "staff" ? "staff" : "decor"); }} style={{ fontSize: "0.72rem", color: "#b87333", background: "transparent", border: "none", cursor: "pointer", padding: "0", textDecoration: "underline", fontFamily: "Georgia, serif" }}>{inv.item_name} →</button>
                      <div style={{ fontSize: "0.68rem", color: "#8b7355", marginTop: "2px" }}>{new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: "1.1rem", color: "#b87333", fontWeight: 500 }}>${Number(inv.amount).toFixed(2)}</div>
                      <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "20px", background: inv.status === "approved" ? "#4a7c5922" : inv.status === "rejected" ? "#c0392b22" : "#f0ebe4", color: inv.status === "approved" ? "#4a7c59" : inv.status === "rejected" ? "#c0392b" : "#8b7355" }}>
                        {inv.status === "approved" ? "Approved" : inv.status === "rejected" ? "Rejected" : "Pending approval"}
                      </span>
                    </div>
                  </div>
                  {inv.rejection_note && <div style={{ fontSize: "0.75rem", color: "#c0392b", marginBottom: "8px" }}>Note: {inv.rejection_note}</div>}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <a href={inv.file_url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", padding: "5px 12px", background: "#f5f2ee", color: "#2c1810", borderRadius: "6px", textDecoration: "none" }}>↓ Download</a>
                    {inv.status === "pending" && (
                      <>
                        <button onClick={() => approveInvoice(inv.id)} style={{ fontSize: "0.75rem", padding: "5px 12px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>✓ Approve</button>
                        <button onClick={() => { setRejecting(inv.id); setRejectionNote(""); }} style={{ fontSize: "0.75rem", padding: "5px 12px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>✕ Reject</button>
                      </>
                    )}
                  </div>
                  {rejecting === inv.id && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                      <input placeholder="Reason for rejection..." value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} style={{ flex: 1, padding: "6px 10px", border: "1px solid #c0392b", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} autoFocus />
                      <button onClick={() => rejectInvoice(inv.id)} style={{ padding: "6px 12px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Confirm</button>
                      <button onClick={() => setRejecting(null)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tasks */}
        {activeTab === "tasks" && (
          <div>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #ede8e2", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.15em", marginBottom: "1rem" }}>FROM YOUR PLANNER ({assignedCompleted}/{assignedTasks.length})</div>
              {assignedTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks assigned yet.</p>}
              {assignedTasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f5f2ee" }}>
                  <div onClick={() => toggleTask(task, false)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: task.completed ? "none" : "1.5px solid #d4c5b0", background: task.completed ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, transition: "all 0.15s" }}>
                    {task.completed && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", color: task.completed ? "#b0a090" : "#2c1810", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                      {task.due_date && <span style={{ fontSize: "0.68rem", color: !task.completed && new Date(task.due_date) < new Date() ? "#c0392b" : "#8b7355" }}>Due {task.due_date}</span>}
                      {task.assigned_to && <span style={{ fontSize: "0.68rem", color: "#b87333" }}>→ {task.assigned_to}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #ede8e2" }}>
              <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.15em", marginBottom: "1rem" }}>MY OWN TASKS ({myCompleted}/{myTasks.length})</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap" as const }}>
                <input placeholder="Add a task..." value={newMyTask.task} onChange={e => setNewMyTask({...newMyTask, task: e.target.value})} onKeyDown={e => e.key === "Enter" && addMyTask()} style={inp({ flex: 1, minWidth: "200px" })} />
                <input type="date" value={newMyTask.due_date} onChange={e => setNewMyTask({...newMyTask, due_date: e.target.value})} style={inp({ width: "150px" })} />
                <button onClick={addMyTask} style={{ padding: "8px 16px", background: "#7a5c3a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Add</button>
              </div>
              {myTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks yet.</p>}
              {myTasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid #f5f2ee" }}>
                  <div onClick={() => toggleTask(task, true)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: task.completed ? "none" : "1.5px solid #d4c5b0", background: task.completed ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    {task.completed && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", color: task.completed ? "#b0a090" : "#2c1810", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                    {task.due_date && <div style={{ fontSize: "0.68rem", color: "#8b7355", marginTop: "2px" }}>Due {task.due_date}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipments */}
        {activeTab === "shipments" && (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #ede8e2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.15em" }}>SHIPMENTS TO {cityName.toUpperCase()}</div>
              <button onClick={() => setAddingShipment(true)} style={{ padding: "6px 14px", background: "#7a5c3a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>+ Add</button>
            </div>
            {addingShipment && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
                <input placeholder="e.g. 12 dresses, 5 bags..." value={newShipment} onChange={e => setNewShipment(e.target.value)} style={inp({ flex: 1 })} autoFocus />
                <button onClick={addShipment} style={{ padding: "6px 12px", background: "#7a5c3a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>Save</button>
                <button onClick={() => setAddingShipment(false)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #ede8e2", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>Cancel</button>
              </div>
            )}
            {shipments.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No shipments yet.</p>}
            {shipments.map(shipment => (
              <div key={shipment.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderBottom: "1px solid #f5f2ee" }}>
                <div onClick={() => toggleShipment(shipment)} style={{ width: "22px", height: "22px", borderRadius: "50%", border: shipment.shipped ? "none" : "1.5px solid #d4c5b0", background: shipment.shipped ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {shipment.shipped && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                </div>
                <div style={{ flex: 1, fontSize: "0.9rem", color: shipment.shipped ? "#b0a090" : "#2c1810", textDecoration: shipment.shipped ? "line-through" : "none" }}>{shipment.notes}</div>
                <span style={{ fontSize: "0.68rem", color: shipment.shipped ? "#4a7c59" : "#8b7355", letterSpacing: "0.05em" }}>{shipment.shipped ? "SHIPPED" : "PENDING"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Chat */}
        {activeTab === "chat" && (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #ede8e2" }}>
            <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.15em", marginBottom: "1.5rem" }}>MESSAGES WITH {plannerDisplay.toUpperCase()}</div>
            <div style={{ height: "420px", overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column" as const, gap: "12px", padding: "0.5rem" }}>
              {messages.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginTop: "3rem" }}>No messages yet. Start the conversation.</p>}
              {messages.map(msg => {
                const isMe = msg.sender_email === userEmail;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: "0.65rem", color: "#8b7355", marginBottom: "3px", letterSpacing: "0.05em" }}>{msg.sender_name}</div>
                    <div style={{ maxWidth: "70%", padding: "10px 16px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isMe ? "#7a5c3a" : "#f5f2ee", color: isMe ? "#fff" : "#2c1810", fontSize: "0.88rem", lineHeight: 1.6 }}>{msg.message}</div>
                    <div style={{ fontSize: "0.62rem", color: "#b0a090", marginTop: "3px" }}>{new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="Write a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} style={inp({ flex: 1 })} />
              <button onClick={sendMessage} style={{ padding: "8px 20px", background: "#7a5c3a", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
