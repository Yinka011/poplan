/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type PlannerInfo = {
  planner_email: string;
  brand_name: string;
  city?: string;
  dates_label?: string;
  venue_name?: string;
  venue_address?: string;
  start_date?: string;
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

type DecorItem = { id: number; category: string; item: string; cost: number; quantity: number; notes: string; brand_status?: string; };
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "planning" | "budget" | "tasks" | "shipments" | "chat">("overview");
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
  const [comments, setComments] = useState<{id: number; item_name: string; sender_email: string; sender_name: string; message: string; created_at: string;}[]>([]);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [budget, setBudget] = useState(0);
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState("");
  const [expenses, setExpenses] = useState<{id: number; category: string; item: string; cost: number; deposit: number;}[]>([]);

  useEffect(() => { if (slug) fetchAll(); }, [slug]);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setUserEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).single();
    if (profile?.name) setUserName(profile.name);

    const [plannerRes, assignedTasksRes, messagesRes, invoicesRes, shipmentsRes, decorRes, refreshRes, staffRes, shiftsRes, expensesRes, commentsRes] = await Promise.all([
      supabase.from("event_planners").select("*").eq("event_slug", slug).maybeSingle(),
      supabase.from("planner_tasks").select("*").eq("event_slug", slug).eq("owner", "brand").order("created_at"),
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
      setBudget(Number(plannerRes.data.budget) || 0);
      setNewBudget(String(plannerRes.data.budget || ""));
    }
    if (assignedTasksRes.data) setAssignedTasks(assignedTasksRes.data);
    if (messagesRes.data) setMessages(messagesRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (shipmentsRes.data) setShipments(shipmentsRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    if (commentsRes.data) setComments(commentsRes.data);
    if (decorRes.data) setDecor(decorRes.data);
    if (refreshRes.data) setRefresh(refreshRes.data);
    if (staffRes.data && shiftsRes.data) {
      setStaff(staffRes.data.map((s: any) => ({
        ...s, shifts: shiftsRes.data.filter((sh: any) => sh.staff_id === s.id)
      })));
    }
    setLoading(false);
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

  const updateBrandStatus = async (table: string, itemId: number, status: string) => {
    await supabase.from(table).update({ brand_status: status }).eq("id", itemId);
    if (table === "planning_decor") setDecor(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
    if (table === "planning_refreshments") setRefresh(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
    if (table === "planning_staff") setStaff(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
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

  const saveBudget = async () => {
    const val = parseFloat(newBudget) || 0;
    await supabase.from("event_planners").update({ budget: val }).eq("event_slug", slug);
    setBudget(val);
    setEditingBudget(false);
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

  const totalDecor = decor.reduce((s, x) => s + Number(x.cost), 0);
  const totalRefresh = refresh.reduce((s, x) => s + Number(x.cost), 0);
  const totalStaff = staff.reduce((s, m) => {
    const hrs = (m.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0);
    return s + hrs * Number(m.pay_rate);
  }, 0);

  const totalManualExpenses = expenses.reduce((s, e) => s + Number(e.cost), 0);
  const totalSpent = totalDecor + totalRefresh + totalStaff + totalManualExpenses;
  const isOverBudget = budget > 0 && totalSpent > budget;
  const pendingInvoices = invoices.filter(i => i.status === "pending").length;
  const assignedCompleted = assignedTasks.filter(t => t.completed).length;
  const myCompleted = myTasks.filter(t => t.completed).length;
  const daysToEvent = planner?.start_date ? Math.ceil((new Date(planner.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const getItemInvoices = (itemName: string) => invoices.filter(inv => inv.item_name === itemName);

  const CommentThread = ({ itemName, table, itemId }: { itemName: string; table: string; itemId: number }) => {
    const itemComments = comments.filter(c => c.item_name === itemName);
    const isActive = activeComment === itemName;
    return (
      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f0ebe4" }}>
        <button onClick={() => setActiveComment(isActive ? null : itemName)} style={{ fontSize: "0.7rem", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", cursor: "pointer", color: "#8b7355" }}>
          💬 {itemComments.length > 0 ? `${itemComments.length} note${itemComments.length > 1 ? "s" : ""}` : "Add note"}
        </button>
        {isActive && (
          <div style={{ marginTop: "6px", background: "#faf8f5", borderRadius: "8px", padding: "8px", border: "1px solid #f0ebe4" }}>
            {itemComments.map(c => (
              <div key={c.id} style={{ marginBottom: "6px", padding: "6px 8px", background: "#fff", borderRadius: "6px", borderLeft: c.sender_email === userEmail ? "2px solid #b87333" : "2px solid #e8e0d5" }}>
                <div style={{ fontSize: "0.68rem", color: "#8b7355", marginBottom: "2px" }}>{c.sender_name} · {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                <div style={{ fontSize: "0.82rem", color: "#2c1810" }}>{c.message}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <input placeholder="Reply..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment(itemName)} style={{ flex: 1, padding: "5px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.78rem", fontFamily: "Georgia, serif" }} autoFocus />
              <button onClick={() => sendComment(itemName)} style={{ padding: "5px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const BrandApproval = ({ itemName, table, itemId, brandStatus }: { itemName: string; table: string; itemId: number; brandStatus?: string }) => {
    if (brandStatus !== "suggested" && brandStatus !== "approved" && brandStatus !== "rejected") return <CommentThread itemName={itemName} table={table} itemId={itemId} />;
    return (
      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f0ebe4" }}>
        {brandStatus === "suggested" && (
          <div style={{ background: "#b8733311", borderRadius: "8px", padding: "8px 10px", marginBottom: "6px" }}>
            <div style={{ fontSize: "0.75rem", color: "#b87333", marginBottom: "6px" }}>Your planner has suggested this item. Do you want to include it?</div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => updateBrandStatus(table, itemId, "approved")} style={{ fontSize: "0.75rem", padding: "4px 12px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>✓ Yes, include it</button>
              <button onClick={() => updateBrandStatus(table, itemId, "rejected")} style={{ fontSize: "0.75rem", padding: "4px 12px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>✗ No, remove it</button>
            </div>
          </div>
        )}
        {brandStatus === "approved" && <div style={{ fontSize: "0.72rem", color: "#4a7c59", background: "#4a7c5922", padding: "3px 8px", borderRadius: "6px", display: "inline-block", marginBottom: "6px" }}>✓ You approved this item</div>}
        {brandStatus === "rejected" && <div style={{ fontSize: "0.72rem", color: "#c0392b", background: "#c0392b22", padding: "3px 8px", borderRadius: "6px", display: "inline-block", marginBottom: "6px" }}>✗ You removed this item</div>}
        <CommentThread itemName={itemName} table={table} itemId={itemId} />
      </div>
    );
  };

  const InvoiceApproval = ({ itemName }: { itemName: string }) => {
    const itemInvoices = getItemInvoices(itemName);
    if (!itemInvoices.length) return null;
    return (
      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f0ebe4" }}>
        {itemInvoices.map(inv => (
          <div key={inv.id} style={{ background: "#faf8f5", borderRadius: "8px", padding: "8px 10px", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span style={{ padding: "1px 6px", borderRadius: "10px", background: inv.status === "approved" ? "#4a7c5922" : inv.status === "rejected" ? "#c0392b22" : "#f0ebe4", color: inv.status === "approved" ? "#4a7c59" : inv.status === "rejected" ? "#c0392b" : "#8b7355", fontSize: "0.68rem", flexShrink: 0 }}>
                {inv.status === "approved" ? "Approved" : inv.status === "rejected" ? "Rejected" : "Pending"}
              </span>
              <span style={{ color: "#2c1810", flex: 1, fontSize: "0.82rem" }}>{inv.description}</span>
              <span style={{ color: "#b87333", fontWeight: 500, fontSize: "0.85rem" }}>${Number(inv.amount).toFixed(2)}</span>
              <a href={inv.file_url} download target="_blank" rel="noopener noreferrer" style={{ color: "#fff", fontSize: "0.72rem", textDecoration: "none", background: "#2c1810", padding: "3px 8px", borderRadius: "4px" }}>↓</a>
            </div>
            {inv.status === "pending" && (
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button onClick={() => approveInvoice(inv.id)} style={{ fontSize: "0.75rem", padding: "4px 10px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>✓ Approve</button>
                <button onClick={() => { setRejecting(inv.id); setRejectionNote(""); }} style={{ fontSize: "0.75rem", padding: "4px 10px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>✕ Reject</button>
              </div>
            )}
            {rejecting === inv.id && (
              <div style={{ marginTop: "6px", display: "flex", gap: "6px" }}>
                <input placeholder="Reason for rejection..." value={rejectionNote} onChange={e => setRejectionNote(e.target.value)} style={{ flex: 1, padding: "6px 8px", border: "1px solid #c0392b", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} autoFocus />
                <button onClick={() => rejectInvoice(inv.id)} style={{ padding: "6px 10px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Confirm</button>
                <button onClick={() => setRejecting(null)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Cancel</button>
              </div>
            )}
            {inv.rejection_note && <div style={{ fontSize: "0.72rem", color: "#c0392b", marginTop: "4px" }}>Note: {inv.rejection_note}</div>}
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "planning", label: "Planning Hub" },
    { key: "budget", label: "Budget" },
    { key: "tasks", label: "Tasks" },
    { key: "shipments", label: "Shipments" },
    { key: "chat", label: "Chat" },
  ];

  const inp = (style?: object) => ({ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", ...style });

  if (loading) return <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>;

  const cityName = planner?.city || slug;
  const datesLabel = planner?.dates_label || "";
  const venueName = planner?.venue_name || "";
  const venueAddress = planner?.venue_address || "";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000044", zIndex: 15 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "220px", background: "#2c1810", zIndex: 16, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", display: "flex", flexDirection: "column" as const, paddingTop: "60px" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
          <div style={{ fontSize: "0.7rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "4px" }}>MY POP-UP</div>
          <div style={{ fontSize: "0.9rem", color: "#fff" }}>{cityName}</div>
          {datesLabel && <div style={{ fontSize: "0.72rem", color: "#b87333", marginTop: "2px" }}>{datesLabel}</div>}
        </div>
        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {tabs.map(tab => (
            <a key={tab.key} onClick={() => { setActiveTab(tab.key as any); setSidebarOpen(false); }} style={{ display: "block", padding: "10px 1.25rem", fontSize: "0.85rem", color: activeTab === tab.key ? "#fff" : "#c8b89a", background: activeTab === tab.key ? "#3d2415" : "transparent", textDecoration: "none", borderLeft: activeTab === tab.key ? "2px solid #b87333" : "2px solid transparent", cursor: "pointer" }}>
              {tab.label}{tab.key === "tasks" && pendingInvoices > 0 ? ` (${pendingInvoices})` : ""}
            </a>
          ))}
        </nav>
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #3d2415" }}>
          <Link href="/brand-organizer" style={{ fontSize: "0.8rem", color: "#c8b89a", textDecoration: "none", display: "block" }}>← All cities</Link>
        </div>
      </div>

      <div style={{ background: "#2c1810", padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky" as const, top: 0, zIndex: 14 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column" as const, gap: "5px" }}>
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "#b87333" : "#c8b89a", transform: sidebarOpen ? "rotate(45deg) translate(4.5px, 4.5px)" : "none", transition: "all 0.2s" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "transparent" : "#c8b89a", transition: "all 0.2s" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "#b87333" : "#c8b89a", transform: sidebarOpen ? "rotate(-45deg) translate(4.5px, -4.5px)" : "none", transition: "all 0.2s" }} />
        </button>
        <div style={{ fontSize: "1rem", color: "#fff" }}>{cityName}</div>
        {pendingInvoices > 0 && <span style={{ fontSize: "0.72rem", background: "#c0392b", color: "#fff", padding: "2px 8px", borderRadius: "20px" }}>{pendingInvoices} invoice{pendingInvoices > 1 ? "s" : ""} pending</span>}
        <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#c8b89a" }}>{tabs.find(t => t.key === activeTab)?.label}</div>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px", margin: "0 auto" }}>

        {/* Stats box - only on overview */}
        {activeTab === "overview" && <div style={{ background: "#2c1810", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>CITY</div>
              <div style={{ fontSize: "1.1rem" }}>{cityName}</div>
              {datesLabel && <div style={{ fontSize: "0.75rem", color: "#b87333", marginTop: "4px" }}>{datesLabel}</div>}
              {venueName && <div style={{ fontSize: "0.72rem", color: "#c8b89a", marginTop: "4px" }}>📍 {venueName}</div>}
              {venueAddress && <div style={{ fontSize: "0.68rem", color: "#8b7355", marginTop: "2px" }}>{venueAddress}</div>}
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>PLANNER</div>
              <div style={{ fontSize: "0.9rem" }}>{planner?.planner_email || "Self-managed"}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>BUDGET</div>
              <div style={{ fontSize: "1.5rem", color: "#e8c97a" }}>${(totalDecor + totalRefresh + totalStaff).toFixed(2)}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem", textAlign: "center" as const }}>
              <div style={{ fontSize: "2.5rem", color: "#2c1810", lineHeight: 1 }}>{daysToEvent ?? "—"}</div>
              <div style={{ fontSize: "0.7rem", color: "#8b7355", marginTop: "6px" }}>DAYS TO EVENT</div>
            </div>
          </div>
        </div>}

        {/* Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>TASKS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355", marginBottom: "4px" }}>ASSIGNED TO ME</div>
                  <div style={{ fontSize: "1.3rem", color: "#2c1810" }}>{assignedCompleted}/{assignedTasks.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355", marginBottom: "4px" }}>MY OWN TASKS</div>
                  <div style={{ fontSize: "1.3rem", color: "#2c1810" }}>{myCompleted}/{myTasks.length}</div>
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>INVOICES</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div><div style={{ fontSize: "1.3rem", color: "#b87333" }}>{pendingInvoices}</div><div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Pending</div></div>
                <div><div style={{ fontSize: "1.3rem", color: "#4a7c59" }}>{invoices.filter(i => i.status === "approved").length}</div><div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Approved</div></div>
                <div><div style={{ fontSize: "1.3rem", color: "#c0392b" }}>{invoices.filter(i => i.status === "rejected").length}</div><div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Rejected</div></div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>BUDGET BREAKDOWN</div>
              {[{ label: "Decor", value: totalDecor, color: "#b87333" }, { label: "Refreshments", value: totalRefresh, color: "#4a7c59" }, { label: "Staffing", value: totalStaff, color: "#5b7fa6" }].map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 2 ? "1px solid #f0ebe4" : "none" }}>
                  <span style={{ fontSize: "0.85rem", color: "#8b7355" }}>{item.label}</span>
                  <span style={{ fontSize: "0.85rem", color: item.color, fontWeight: 500 }}>${item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>SHIPMENTS</div>
              <div style={{ fontSize: "1.3rem", color: "#2c1810", marginBottom: "4px" }}>{shipments.filter(s => s.shipped).length}/{shipments.length}</div>
              <div style={{ fontSize: "0.78rem", color: "#8b7355" }}>shipped to {cityName}</div>
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
            </div>

            {planningTab === "decor" && (
              <div>
                {["Furniture", "Props", "Lighting", "Signage", "Theme", "Florals"].map(cat => {
                  const items = decor.filter(d => d.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "8px" }}>{cat.toUpperCase()}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
                        {items.map(item => (
                          <div key={item.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e8e0d5" }}>
                            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "4px" }}>{item.item}</div>
                            {item.quantity > 0 && <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>Qty: {item.quantity}</div>}
                            {item.notes && <div style={{ fontSize: "0.75rem", color: "#aaa", fontStyle: "italic" }}>{item.notes}</div>}
                            {item.cost > 0 && <div style={{ fontSize: "0.85rem", color: "#b87333", fontWeight: 500, marginTop: "6px" }}>${Number(item.cost).toFixed(2)}</div>}
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
              <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e8e0d5", overflow: "hidden" }}>
                {refresh.length === 0 && <p style={{ padding: "1rem", fontSize: "0.85rem", color: "#8b7355" }}>No refreshments yet.</p>}
                {refresh.map((item, i) => (
                  <div key={item.id} style={{ padding: "12px 16px", borderBottom: i < refresh.length - 1 ? "1px solid #f0ebe4" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "0.88rem", color: "#2c1810" }}>{item.item}</div>
                        {item.quantity && <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>{item.quantity}</div>}
                      </div>
                      {item.cost > 0 && <span style={{ fontSize: "0.9rem", color: "#4a7c59", fontWeight: 500 }}>${Number(item.cost).toFixed(2)}</span>}
                    </div>
                    <BrandApproval itemName={item.item} table="planning_refreshments" itemId={item.id} brandStatus={item.brand_status} />
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
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "0.95rem", color: "#2c1810" }}>{member.name}</div>
                        {totalPay > 0 && <div style={{ fontSize: "0.9rem", color: "#b87333", fontWeight: 500 }}>${totalPay.toFixed(2)}</div>}
                      </div>
                      {member.notes && <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>{member.notes}</div>}
                      {totalHours > 0 && <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>{totalHours} hrs</div>}
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
            {/* Budget header */}
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.1em" }}>YOUR BUDGET FOR {cityName.toUpperCase()}</div>
                {editingBudget ? (
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <input value={newBudget} onChange={e => setNewBudget(e.target.value)} placeholder="Enter budget" style={{ padding: "4px 8px", borderRadius: "6px", border: "none", fontSize: "0.85rem", width: "120px", fontFamily: "Georgia, serif" }} autoFocus />
                    <button onClick={saveBudget} style={{ padding: "4px 10px", background: "#b87333", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditingBudget(false)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer", color: "#8b7355" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingBudget(true)} style={{ fontSize: "0.75rem", padding: "3px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", cursor: "pointer", color: "#8b7355" }}>
                    {budget > 0 ? "Edit budget" : "Set budget"}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#c8b89a", marginBottom: "4px" }}>BUDGET</div>
                  <div style={{ fontSize: "1.5rem", color: budget > 0 ? "#2c1810" : "#8b7355" }}>{budget > 0 ? `$${budget.toFixed(2)}` : "Not set"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#c8b89a", marginBottom: "4px" }}>SPENT</div>
                  <div style={{ fontSize: "1.5rem", color: isOverBudget ? "#c0392b" : "#2c1810" }}>${totalSpent.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#c8b89a", marginBottom: "4px" }}>{isOverBudget ? "OVER BUDGET" : "REMAINING"}</div>
                  <div style={{ fontSize: "1.5rem", color: isOverBudget ? "#c0392b" : "#4a7c59" }}>{budget > 0 ? `$${Math.abs(budget - totalSpent).toFixed(2)}` : "—"}</div>
                </div>
              </div>
              {budget > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#c8b89a", marginBottom: "4px" }}>
                    <span style={{ color: "#8b7355" }}>{Math.round((totalSpent / budget) * 100)}% spent</span>
                    {isOverBudget && <span style={{ color: "#c0392b" }}>⚠ Over budget by ${(totalSpent - budget).toFixed(2)}</span>}
                  </div>
                  <div style={{ height: "6px", background: "#f0ebe4", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: `${Math.min((totalSpent / budget) * 100, 100)}%`, background: isOverBudget ? "#ff6b6b" : totalSpent / budget > 0.8 ? "#b87333" : "#4a7c59", borderRadius: "3px", transition: "width 0.3s" }} />
                  </div>
                </div>
              )}
            </div>

            {isOverBudget && (
              <div style={{ background: "#ff6b6b22", border: "1px solid #ff6b6b44", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                <div>
                  <div style={{ fontSize: "0.9rem", color: "#c0392b", fontWeight: 500 }}>You are over budget</div>
                  <div style={{ fontSize: "0.82rem", color: "#8b7355" }}>Total spending of ${totalSpent.toFixed(2)} exceeds your budget of ${budget.toFixed(2)} by ${(totalSpent - budget).toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Breakdown */}
            {[
              { label: "Decor", items: decor.map(d => ({ name: d.item, cost: d.cost })), total: totalDecor, color: "#b87333" },
              { label: "Refreshments", items: refresh.map(r => ({ name: r.item, cost: r.cost })), total: totalRefresh, color: "#4a7c59" },
              { label: "Staffing", items: staff.map(s => ({ name: s.name, cost: (s.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0) * Number(s.pay_rate) })), total: totalStaff, color: "#5b7fa6" },
            ].map(section => (
              <div key={section.label} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: section.color }} />
                    <span style={{ fontSize: "0.85rem", color: "#2c1810", fontWeight: 500 }}>{section.label}</span>
                  </div>
                  <span style={{ fontSize: "0.95rem", color: section.color, fontWeight: 500 }}>${section.total.toFixed(2)}</span>
                </div>
                {section.items.filter(i => i.cost > 0).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #f8f5f0", fontSize: "0.82rem" }}>
                    <span style={{ color: "#8b7355" }}>{item.name}</span>
                    <span style={{ color: section.color }}>${Number(item.cost).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ))}

            {expenses.length > 0 && (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
                <div style={{ fontSize: "0.85rem", color: "#2c1810", fontWeight: 500, marginBottom: "0.75rem" }}>Other Expenses</div>
                {expenses.map((exp, i) => (
                  <div key={exp.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: i < expenses.length - 1 ? "1px solid #f8f5f0" : "none", fontSize: "0.82rem" }}>
                    <span style={{ color: "#8b7355" }}>{exp.category} — {exp.item}</span>
                    <span style={{ color: "#b87333" }}>${Number(exp.cost).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#c8b89a", fontSize: "0.85rem" }}>GRAND TOTAL</span>
              <span style={{ color: "#fff", fontSize: "1.1rem" }}>${totalSpent.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Tasks */}
        {activeTab === "tasks" && (
          <div>
            {/* Assigned tasks */}
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "0.5rem" }}>Tasks from planner ({assignedCompleted}/{assignedTasks.length})</div>
              <p style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1rem" }}>Tasks assigned to you by your planner. Check them off as you complete them.</p>
              {assignedTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks assigned yet.</p>}
              {assignedTasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px", borderBottom: "1px solid #f0ebe4" }}>
                  <div onClick={() => toggleTask(task, false)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: task.completed ? "none" : "2px solid #d4c5b0", background: task.completed ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    {task.completed && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", color: task.completed ? "#b0a090" : "#2c1810", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                      {task.due_date && <span style={{ fontSize: "0.72rem", color: "#8b7355" }}>Due {task.due_date}</span>}
                      {task.assigned_to && <span style={{ fontSize: "0.72rem", color: "#b87333" }}>→ {task.assigned_to}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* My own tasks */}
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>My own tasks ({myCompleted}/{myTasks.length})</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap" as const }}>
                <input placeholder="Add a task..." value={newMyTask.task} onChange={e => setNewMyTask({...newMyTask, task: e.target.value})} onKeyDown={e => e.key === "Enter" && addMyTask()} style={inp({ flex: 1, minWidth: "200px" })} />
                <input type="date" value={newMyTask.due_date} onChange={e => setNewMyTask({...newMyTask, due_date: e.target.value})} style={inp({ width: "150px" })} />
                <button onClick={addMyTask} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Add</button>
              </div>
              {myTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks yet.</p>}
              {myTasks.map(task => (
                <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px", borderBottom: "1px solid #f0ebe4" }}>
                  <div onClick={() => toggleTask(task, true)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: task.completed ? "none" : "2px solid #d4c5b0", background: task.completed ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                    {task.completed && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", color: task.completed ? "#b0a090" : "#2c1810", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                    {task.due_date && <div style={{ fontSize: "0.72rem", color: "#8b7355", marginTop: "2px" }}>Due {task.due_date}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shipments */}
        {activeTab === "shipments" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>Shipments to {cityName}</div>
              <button onClick={() => setAddingShipment(true)} style={{ padding: "6px 12px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>+ Add</button>
            </div>
            {addingShipment && (
              <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
                <input placeholder="e.g. 12 dresses, 5 bags..." value={newShipment} onChange={e => setNewShipment(e.target.value)} style={inp({ flex: 1 })} autoFocus />
                <button onClick={addShipment} style={{ padding: "6px 12px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Save</button>
                <button onClick={() => setAddingShipment(false)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
              </div>
            )}
            {shipments.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No shipments yet.</p>}
            {shipments.map(shipment => (
              <div key={shipment.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid #f0ebe4" }}>
                <div onClick={() => toggleShipment(shipment)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: shipment.shipped ? "none" : "2px solid #d4c5b0", background: shipment.shipped ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {shipment.shipped && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                </div>
                <div style={{ flex: 1, fontSize: "0.88rem", color: shipment.shipped ? "#b0a090" : "#2c1810", textDecoration: shipment.shipped ? "line-through" : "none" }}>{shipment.notes}</div>
                <span style={{ fontSize: "0.72rem", color: shipment.shipped ? "#4a7c59" : "#8b7355" }}>{shipment.shipped ? "Shipped ✓" : "Pending"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Chat */}
        {activeTab === "chat" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>Chat{planner ? ` with ${planner.planner_email}` : ""}</div>
            <div style={{ height: "400px", overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column" as const, gap: "10px", padding: "0.5rem" }}>
              {messages.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginTop: "2rem" }}>No messages yet.</p>}
              {messages.map(msg => {
                const isMe = msg.sender_email === userEmail;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: "0.7rem", color: "#8b7355", marginBottom: "2px" }}>{msg.sender_name}</div>
                    <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? "#2c1810" : "#f0ebe4", color: isMe ? "#fff" : "#2c1810", fontSize: "0.88rem", lineHeight: 1.5 }}>{msg.message}</div>
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

      </div>
    </div>
  );
}
