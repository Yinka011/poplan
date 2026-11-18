/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { useParams } from "next/navigation";
import Link from "next/link";
import MoodBoard from "@/components/shared/MoodBoard";
import { formatCurrency } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import PlannerSkeleton from "./PlannerSkeleton";

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
  const [shipments, setShipments] = useState<{id: number; notes: string; shipped: boolean; courier?: string; tracking_number?: string; received?: boolean;}[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState<string | null>(null);
  const actionRef = useRef(false);
  const searchParams = useSearchParams();
  const [teamEmail, setTeamEmail] = useState("");
  const [invitingTeam, setInvitingTeam] = useState(false);
  const [teamInvited, setTeamInvited] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "planning" | "budget" | "mytasks" | "brandtasks" | "chat" | "receipts" | "moodboard" | "team" | "shipments">((searchParams.get("tab") as any) || "overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [planningTab, setPlanningTab] = useState<"decor" | "refreshments" | "staff">("decor");
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newMyTask, setNewMyTask] = useState({ task: "", due_date: "" });
  const [newBrandTask, setNewBrandTask] = useState({ task: "", due_date: "", assigned_to: "" });
  const [newMessage, setNewMessage] = useState("");
  const [newReceipt, setNewReceipt] = useState({ description: "", amount: "" });
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState<File | null>(null);
  const [addingExpense, setAddingExpense] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({ item: "", cost: "", deposit: "" });

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
    setLoading(true);
    setLoadError("");
    try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user?.email) throw new Error("Please sign in to view the planner.");

    const { data: profile, error: profileError } = await supabase.from("profiles").select("name").eq("email", user.email).maybeSingle();
    if (profileError) throw profileError;

    const [peRes, myTasksRes, brandTasksRes, messagesRes, receiptsRes, decorRes, refreshRes, staffRes, shiftsRes, expRes, shipmentsRes] = await Promise.all([
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
      supabase.from("shipments").select("*").eq("event_slug", slug).order("created_at"),
    ]);

    const error = peRes.error || myTasksRes.error || brandTasksRes.error || messagesRes.error || receiptsRes.error || decorRes.error || refreshRes.error || staffRes.error || shiftsRes.error || expRes.error || shipmentsRes.error;
    if (error) throw error;
    if (!peRes.data) throw new Error("Planner event not found.");
    if (!active) return;
    setUserEmail(user.email);
    setUserName(profile?.name || "");
    setPlannerEvent(peRes.data);
    setMyTasks(myTasksRes.data ?? []);
    setBrandTasks(brandTasksRes.data ?? []);
    setMessages(messagesRes.data ?? []);
    setReceipts(receiptsRes.data ?? []);
    setDecor(decorRes.data ?? []);
    setRefresh(refreshRes.data ?? []);
    {
      const shifts = shiftsRes.data ?? [];
      const staffWithShifts = (staffRes.data ?? []).map(s => ({
        ...s,
        shifts: shifts.filter((sh: any) => sh.staff_id === s.id)
      }));
      setStaff(staffWithShifts);
    }
    setManualExpenses(expRes.data ?? []);
    setShipments(shipmentsRes.data ?? []);
    setLoadedFor(slug);
    } catch (error) {
      if (!active) return;
      console.error("Failed to load planner:", error);
      setLoadError(error instanceof Error && (error.message === "Please sign in to view the planner." || error.message === "Planner event not found.") ? error.message : "Could not load planner. Please try again.");
      setLoadedFor(slug);
    } finally {
      if (active) setLoading(false);
    }
    };
    void fetchAll();
    return () => { active = false; };
  }, [slug, retry]);

  const runAction = async (key: string, message: string, callback: () => Promise<void>) => {
    if (actionRef.current) return;
    actionRef.current = true;
    setAction(key);
    try {
      await callback();
    } catch (error) {
      console.error(message, error);
      alert(message);
    } finally {
      actionRef.current = false;
      setAction(null);
    }
  };

  const addMyTask = async () => {
    if (!newMyTask.task.trim()) { alert("Enter a task."); return; }
    await runAction("my-task", "Could not add task. Please try again.", async () => {
    const { data, error } = await supabase.from("planner_tasks").insert({
      event_slug: slug, planner_email: userEmail, brand_email: plannerEvent?.brand_email || "",
      task: newMyTask.task, due_date: newMyTask.due_date || null, completed: false, owner: "planner"
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Saved task was not returned.");
    setMyTasks(prev => [...prev, data]);
    setNewMyTask({ task: "", due_date: "" });
    });
  };

  const addBrandTask = async () => {
    if (!newBrandTask.task.trim()) { alert("Enter a task."); return; }
    await runAction("brand-task", "Could not add task. Please try again.", async () => {
    const { data, error } = await supabase.from("planner_tasks").insert({
      event_slug: slug, planner_email: userEmail, brand_email: plannerEvent?.brand_email || "",
      task: newBrandTask.task, due_date: newBrandTask.due_date || null, completed: false, owner: "brand",
      assigned_to: newBrandTask.assigned_to || null,
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Saved task was not returned.");
    setBrandTasks(prev => [...prev, data]);
    setNewBrandTask({ task: "", due_date: "", assigned_to: "" });
    });
  };

  const toggleTask = async (task: Task, isMine: boolean) => {
    await runAction(`task-${task.id}`, "Could not update task. Please try again.", async () => {
    const { error } = await supabase.from("planner_tasks").update({ completed: !task.completed }).eq("id", task.id).select("id").single();
    if (error) throw error;
    if (isMine) setMyTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    else setBrandTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    });
  };

  const deleteTask = async (id: number, isMine: boolean) => {
    await runAction(`task-${id}`, "Could not remove task. Please try again.", async () => {
    const { error } = await supabase.from("planner_tasks").delete().eq("id", id).select("id").single();
    if (error) throw error;
    if (isMine) setMyTasks(prev => prev.filter(t => t.id !== id));
    else setBrandTasks(prev => prev.filter(t => t.id !== id));
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) { alert("Enter a message."); return; }
    await runAction("message", "Could not send message. Please try again.", async () => {
    const { data, error } = await supabase.from("planner_messages").insert({
      event_slug: slug, sender_email: userEmail, sender_name: userName || userEmail, message: newMessage
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Sent message was not returned.");
    setMessages(prev => [...prev, data]);
    setNewMessage("");
    });
  };

  const uploadReceipt = async () => {
    if (!selectedReceiptFile || !newReceipt.description.trim()) { alert("Select a receipt and enter a description."); return; }
    const amount = newReceipt.amount.trim() ? Number(newReceipt.amount) : 0;
    if (!Number.isFinite(amount) || amount < 0) { alert("Enter a valid non-negative amount."); return; }
    await runAction("upload", "Could not save receipt. Please try again; an uploaded file may need to be removed separately.", async () => {
      const uploaded = await uploadToCloudinary(selectedReceiptFile, `receipts/${slug}`);
      const { data, error: insertError } = await supabase.from("planner_receipts").insert({
          event_slug: slug, planner_email: userEmail, file_name: selectedReceiptFile.name,
          file_url: uploaded.url, amount,
        description: selectedItems.length > 0 ? JSON.stringify(selectedItems) : newReceipt.description, status: "pending"
      }).select().single();
      if (insertError) throw insertError;
      if (!data) throw new Error("Saved receipt was not returned.");
      setReceipts(prev => [data, ...prev]);
    setNewReceipt({ description: "", amount: "" });
    setSelectedReceiptFile(null);
    setSelectedItems([]);
    });
  };

  const deleteReceipt = async (id: number) => {
    if (!confirm("Remove this receipt?")) return;
    await runAction(`receipt-${id}`, "Could not remove receipt. Please try again.", async () => {
    const { error } = await supabase.from("planner_receipts").delete().eq("id", id).select("id").single();
    if (error) throw error;
    setReceipts(prev => prev.filter(r => r.id !== id));
    });
  };

  const addExpense = async (cat: string) => {
    if (!newExpense.item.trim()) { alert("Enter an expense item."); return; }
    const cost = newExpense.cost.trim() ? Number(newExpense.cost) : 0;
    const deposit = newExpense.deposit.trim() ? Number(newExpense.deposit) : 0;
    if (!Number.isFinite(cost) || cost < 0 || !Number.isFinite(deposit) || deposit < 0) { alert("Enter valid non-negative amounts."); return; }
    await runAction("expense", "Could not add expense. Please try again.", async () => {
    const { data, error } = await supabase.from("expenses").insert({
      event: slug, category: cat, item: newExpense.item,
      cost, deposit, notes: ""
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Saved expense was not returned.");
    setManualExpenses(prev => [...prev, data]);
    setNewExpense({ item: "", cost: "", deposit: "" });
    setAddingExpense(null);
    });
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Remove this expense?")) return;
    await runAction(`expense-${id}`, "Could not remove expense. Please try again.", async () => {
    const { error } = await supabase.from("expenses").delete().eq("id", id).select("id").single();
    if (error) throw error;
    setManualExpenses(prev => prev.filter(e => e.id !== id));
    });
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
    { key: "budget", label: "Expenses" },
    { key: "mytasks", label: "My Tasks" },
    { key: "brandtasks", label: `${plannerEvent?.brand_name || "Brand"} Tasks` },
    { key: "chat", label: "Chat" },
    { key: "receipts", label: "Receipts" },
    { key: "moodboard", label: "Mood Board" },
    { key: "team", label: "Team Access" },
    { key: "shipments", label: `Shipments${shipments.filter(s => s.shipped && !s.received).length > 0 ? ` (${shipments.filter(s => s.shipped && !s.received).length})` : ""}` },
  ];

  const inp = (style?: object) => ({ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", minWidth: 0, maxWidth: "100%", ...style });

  if (loading || loadedFor !== slug || loadError) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8faf8", padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <LoadingView loading={loading || loadedFor !== slug} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<PlannerSkeleton />} />
        </div>
      </div>
    );
  }

  const inviteTeamMember = async () => {
    if (!teamEmail.trim()) { alert("Enter a team member email."); return; }
    await runAction("invite", "Could not send invite. Please try again.", async () => {
    setInvitingTeam(true);
    try {
    const res = await fetch("/api/invite-organizer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: teamEmail, role: "brand_organizer" }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setTeamInvited(prev => [...prev, teamEmail]);
      setTeamEmail("");
      alert(`Invite sent to ${teamEmail}`);
    } else {
      throw new Error(data.error || "Could not send invite");
    }
    } finally {
    setInvitingTeam(false);
    }
    });
  };

  const markReceived = async (id: number, received: boolean) => {
    await runAction(`shipment-${id}`, "Could not update shipment. Please try again.", async () => {
    const { error } = await supabase.from("shipments").update({ received }).eq("id", id).select("id").single();
    if (error) throw error;
    setShipments(prev => prev.map(s => s.id === id ? { ...s, received } : s));
    });
  };

  return (
    <div className="[overflow-wrap:anywhere]" style={{ minHeight: "100vh", background: "#f8faf8" }}>

      {/* Sidebar */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000044", zIndex: 15 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "220px", background: "#1B3A2D", zIndex: 16, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", display: "flex", flexDirection: "column" as const, paddingTop: "60px" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #2a4d3e" }}>
          <div style={{ fontSize: "0.7rem", color: "#d4c87a", letterSpacing: "0.1em", marginBottom: "4px" }}>PLANNING FOR</div>
          <div style={{ fontSize: "0.9rem", color: "#fff" }}>{plannerEvent?.brand_name || slug}</div>
          {plannerEvent?.city && <div style={{ fontSize: "0.75rem", color: "#E8C97A", marginTop: "2px" }}>{plannerEvent.city}</div>}
        </div>
        <nav style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "1rem 0" }}>
          {tabs.map(tab => (
            <a key={tab.key} onClick={() => { setActiveTab(tab.key as any); setSidebarOpen(false); }} style={{ display: "block", padding: "10px 1.25rem", fontSize: "0.85rem", color: activeTab === tab.key ? "#fff" : "#d4c87a", background: activeTab === tab.key ? "#2a4d3e" : "transparent", textDecoration: "none", borderLeft: activeTab === tab.key ? "2px solid #E8C97A" : "2px solid transparent", cursor: "pointer" }}>
              {tab.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #2a4d3e" }}>
          <Link href="/organizer/events" style={{ fontSize: "0.8rem", color: "#d4c87a", textDecoration: "none", display: "block" }}>← All events</Link>
        </div>
      </div>

      {/* Top bar */}
      <div style={{ background: "#1B3A2D", padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky" as const, top: 0, zIndex: 14 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column" as const, gap: "5px" }}>
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "#E8C97A" : "#d4c87a", transition: "all 0.2s", transform: sidebarOpen ? "rotate(45deg) translate(4.5px, 4.5px)" : "none" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "transparent" : "#d4c87a", transition: "all 0.2s" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "#E8C97A" : "#d4c87a", transition: "all 0.2s", transform: sidebarOpen ? "rotate(-45deg) translate(4.5px, -4.5px)" : "none" }} />
        </button>
        <div style={{ minWidth: 0, fontSize: "1rem", color: "#fff" }}>{plannerEvent?.brand_name || slug}{plannerEvent?.city ? ` — ${plannerEvent.city}` : ""}</div>
        <div style={{ marginLeft: "auto", minWidth: 0, fontSize: "0.8rem", color: "#d4c87a" }}>{tabs.find(t => t.key === activeTab)?.label}</div>
      </div>

      <div className="px-6 sm:px-10" style={{ paddingBlock: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
        {action && <div role="status" style={{ color: "#4a5a52", marginBottom: "1rem" }}>{action === "upload" ? "Uploading receipt..." : action === "invite" ? "Sending invite..." : action === "message" ? "Sending message..." : "Saving changes..."}</div>}
        <fieldset disabled={action !== null} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

        {/* Dark brown stats box */}
        <div style={{ background: "#1B3A2D", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4" style={{ alignItems: "start" }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#d4c87a", letterSpacing: "0.1em", marginBottom: "6px" }}>BRAND</div>
              <div style={{ fontSize: "1.1rem" }}>{plannerEvent?.brand_name || "—"}</div>
              {plannerEvent?.city && <div style={{ fontSize: "0.75rem", color: "#E8C97A", marginTop: "2px" }}>{plannerEvent.city}</div>}
              {plannerEvent?.dates_label && <div style={{ fontSize: "0.75rem", color: "#d4c87a", marginTop: "2px" }}>{plannerEvent.dates_label}</div>}
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#d4c87a", letterSpacing: "0.1em", marginBottom: "6px" }}>TOTAL BUDGET</div>
              <div style={{ fontSize: "1.8rem",  fontWeight: "normal", color: "#e8c97a" }}>{formatCurrency(grandTotal)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#d4c87a", letterSpacing: "0.1em", marginBottom: "6px" }}>PROGRESS</div>
              <div style={{ fontSize: "1.8rem",  fontWeight: "normal" }}>{progress}%</div>
              <div style={{ height: "3px", background: "#2a4d3e", borderRadius: "2px", marginTop: "8px" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#E8C97A", borderRadius: "2px" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "#d4c87a", marginTop: "4px" }}>{totalCompleted} of {totalTasks} tasks done</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem", textAlign: "center" as const }}>
              <div style={{ fontSize: "2.5rem", color: "#1B3A2D",  fontWeight: "normal", lineHeight: 1 }}>{daysToEvent ?? "—"}</div>
              <div style={{ fontSize: "0.7rem", color: "#4a5a52", marginTop: "6px", letterSpacing: "0.05em" }}>DAYS TO EVENT</div>
            </div>
          </div>
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "1rem" }}>TASK PROGRESS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#4a5a52", marginBottom: "4px" }}>MY TASKS</div>
                  <div style={{ fontSize: "1.3rem", color: "#1B3A2D" }}>{myCompleted}/{myTasks.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#4a5a52", marginBottom: "4px" }}>{plannerEvent?.brand_name?.toUpperCase() || "BRAND"}</div>
                  <div style={{ fontSize: "1.3rem", color: "#1B3A2D" }}>{brandCompleted}/{brandTasks.length}</div>
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "1rem" }}>BUDGET BREAKDOWN</div>
              {[
                { label: "Decor", value: totalDecor, color: "#E8C97A" },
                { label: "Refreshments", value: totalRefresh, color: "#4a7c59" },
                { label: "Staffing", value: totalStaff, color: "#5b7fa6" },
                { label: "Other", value: totalManual, color: "#8b6ab0" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 3 ? "1px solid #f0f4f1" : "none" }}>
                  <span style={{ fontSize: "0.85rem", color: "#4a5a52" }}>{item.label}</span>
                  <span style={{ fontSize: "0.85rem", color: item.color, fontWeight: 500 }}>{formatCurrency(item.value)}</span>
                </div>
              ))}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "2px solid #1B3A2D" }}>
                <span style={{ fontSize: "0.9rem", color: "#1B3A2D", fontWeight: 500 }}>Total</span>
                <span style={{ fontSize: "0.9rem", color: "#1B3A2D", fontWeight: 500 }}>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "1rem" }}>RECEIPTS</div>
              <div style={{ fontSize: "1.3rem", color: "#1B3A2D", marginBottom: "4px" }}>{receipts.length}</div>
              <div style={{ fontSize: "0.8rem", color: "#4a5a52" }}>receipt{receipts.length !== 1 ? "s" : ""} uploaded</div>
              <div style={{ fontSize: "0.8rem", color: "#4a7c59", marginTop: "4px" }}>{receipts.filter(r => r.status === "approved").length} approved</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "1rem" }}>MESSAGES</div>
              <div style={{ fontSize: "1.3rem", color: "#1B3A2D", marginBottom: "4px" }}>{messages.length}</div>
              <div style={{ fontSize: "0.8rem", color: "#4a5a52" }}>message{messages.length !== 1 ? "s" : ""} exchanged</div>
            </div>
          </div>
        )}

        {/* Planning Hub */}
        {activeTab === "planning" && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "1.5rem" }}>
              {(["decor", "refreshments", "staff"] as const).map(t => (
                <button key={t} onClick={() => setPlanningTab(t)} style={{ padding: "8px 20px", background: planningTab === t ? "#1B3A2D" : "#fff", color: planningTab === t ? "#fff" : "#4a5a52", border: "1px solid " + (planningTab === t ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.85rem", cursor: "pointer",  textTransform: "capitalize" as const }}>{t}</button>
              ))}
              <a href={`/organizer/planner/${slug}/planning`} style={{ marginLeft: "auto", padding: "8px 16px", background: "#1B3A2D", color: "#fff", borderRadius: "20px", fontSize: "0.85rem", textDecoration: "none" }}>Manage items →</a>
            </div>

            {planningTab === "decor" && (
              <div>
                {["Furniture", "Props", "Lighting", "Signage", "Theme", "Florals"].map(cat => {
                  const items = decor.filter(d => d.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "8px" }}>{cat.toUpperCase()}</div>
                      <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e4ebe6", overflow: "hidden" }}>
                        {items.map((item, i) => (
                          <div key={item.id} style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < items.length - 1 ? "1px solid #f0f4f1" : "none" }}>
                            <div>
                              <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{item.item}</div>
                              {item.notes && <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{item.notes}</div>}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {item.quantity > 0 && <span style={{ fontSize: "0.78rem", color: "#4a5a52" }}>Qty: {item.quantity}</span>}
                              <span style={{ fontSize: "0.9rem", color: "#E8C97A", fontWeight: 500 }}>{formatCurrency(Number(item.cost))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {decor.length === 0 && <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>No decor items yet. Click Edit & Add Items to add.</p>}
              </div>
            )}

            {planningTab === "refreshments" && (
              <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e4ebe6", overflow: "hidden" }}>
                {refresh.length === 0 && <p style={{ padding: "1rem", fontSize: "0.85rem", color: "#4a5a52" }}>No refreshments yet.</p>}
                {refresh.map((item, i) => (
                  <div key={item.id} style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderBottom: i < refresh.length - 1 ? "1px solid #f0f4f1" : "none" }}>
                    <div>
                      <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{item.item}</div>
                      {item.quantity && <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{item.quantity}</div>}
                    </div>
                    <span style={{ fontSize: "0.9rem", color: "#4a7c59", fontWeight: 500 }}>{formatCurrency(Number(item.cost))}</span>
                  </div>
                ))}
              </div>
            )}

            {planningTab === "staff" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))", gap: "10px" }}>
                {staff.length === 0 && <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>No staff yet.</p>}
                {staff.map(member => {
                  const totalHours = (member.shifts || []).reduce((h, s) => h + Number(s.hours), 0);
                  const totalPay = totalHours * Number(member.pay_rate);
                  return (
                    <div key={member.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: "0.95rem", color: "#1B3A2D", marginBottom: "4px" }}>{member.name}</div>
                          {member.notes && <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{member.notes}</div>}
                        </div>
                        <div style={{ textAlign: "right" as const }}>
                          {totalHours > 0 && <div style={{ fontSize: "1rem", color: "#E8C97A", fontWeight: 500 }}>{formatCurrency(totalPay)}</div>}
                          {totalHours > 0 && <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>{totalHours}hrs</div>}
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
            <div style={{ background: "#1B3A2D", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "#d4c87a", letterSpacing: "0.1em" }}>GRAND TOTAL</div>
              <div style={{ fontSize: "1.5rem", color: "#fff" }}>{formatCurrency(grandTotal)}</div>
            </div>

            {["Venue", "Content", "Marketing", "Operations", "Logistics"].map(cat => {
              const items = manualExpenses.filter(e => e.category === cat);
              const catTotal = items.reduce((s, e) => s + Number(e.cost), 0);
              return (
                <div key={cat} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e4ebe6" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <div style={{ fontSize: "0.85rem", color: "#1B3A2D", fontWeight: 500 }}>{cat}</div>
                    {catTotal > 0 && <div style={{ fontSize: "0.95rem", color: "#E8C97A", fontWeight: 500 }}>{formatCurrency(catTotal)}</div>}
                  </div>
                  {items.map(exp => (
                    <div key={exp.id} style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f4f1", fontSize: "0.85rem", alignItems: "center" }}>
                      <span style={{ color: "#1B3A2D" }}>{exp.item}</span>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
                        {exp.deposit > 0 && <span style={{ fontSize: "0.75rem", color: "#4a7c59" }}>Deposit: {formatCurrency(Number(exp.deposit))}</span>}
                        <span style={{ color: "#E8C97A", fontWeight: 500 }}>{formatCurrency(Number(exp.cost))}</span>
                        <button onClick={() => deleteExpense(exp.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                      </div>
                    </div>
                  ))}
                  {addingExpense === cat ? (
                    <div style={{ marginTop: "8px", display: "flex", gap: "8px", flexWrap: "wrap" as const, alignItems: "center" }}>
                      <input placeholder="Item description" value={newExpense.item} onChange={e => setNewExpense(prev => ({...prev, item: e.target.value}))} style={{ flex: 1, padding: "6px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", minWidth: "min(150px, 100%)" }} />
                      <input placeholder="Cost $" value={newExpense.cost} onChange={e => setNewExpense(prev => ({...prev, cost: e.target.value}))} style={{ width: "80px", padding: "6px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem" }} />
                      <input placeholder="Deposit $" value={newExpense.deposit} onChange={e => setNewExpense(prev => ({...prev, deposit: e.target.value}))} style={{ width: "80px", padding: "6px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem" }} />
                      <button onClick={() => addExpense(cat)} style={{ padding: "6px 12px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>{action === "expense" ? "Saving..." : "Save"}</button>
                      <button onClick={() => setAddingExpense(null)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setAddingExpense(cat); setNewExpense({ item: "", cost: "", deposit: "" }); }} style={{ marginTop: "8px", fontSize: "0.78rem", padding: "4px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52" }}>+ Add {cat.toLowerCase()} expense</button>
                  )}
                </div>
              );
            })}

            {[
              { label: "Decor", items: decor.map(d => ({ name: d.item, cost: d.cost, detail: d.category })), total: totalDecor, color: "#E8C97A" },
              { label: "Refreshments", items: refresh.map(r => ({ name: r.item, cost: r.cost, detail: r.quantity })), total: totalRefresh, color: "#4a7c59" },
              { label: "Staffing", items: staff.map(s => ({ name: s.name, cost: (s.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0) * Number(s.pay_rate), detail: s.notes })), total: totalStaff, color: "#5b7fa6" },
            ].map(section => (
              <div key={section.label} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e4ebe6" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: section.color }} />
                    <div style={{ fontSize: "0.85rem", color: "#1B3A2D", fontWeight: 500 }}>{section.label}</div>
                    <span style={{ fontSize: "0.7rem", color: "#4a5a52", background: "#f0f4f1", padding: "1px 6px", borderRadius: "10px" }}>Planning Hub</span>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: section.color, fontWeight: 500 }}>{formatCurrency(section.total)}</div>
                </div>
                {section.items.filter(i => i.cost > 0).map((item, i) => (
                  <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f8f5f0", fontSize: "0.82rem" }}>
                    <div>
                      <span style={{ color: "#1B3A2D" }}>{item.name}</span>
                      {item.detail && <span style={{ color: "#4a5a52", fontSize: "0.72rem", marginLeft: "6px" }}>{item.detail}</span>}
                    </div>
                    <span style={{ color: section.color }}>{formatCurrency(Number(item.cost))}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* My Tasks */}
        {activeTab === "mytasks" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "1rem" }}>My Tasks ({myCompleted}/{myTasks.length})</div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap" as const }}>
              <input placeholder="Add a task..." value={newMyTask.task} onChange={e => setNewMyTask({...newMyTask, task: e.target.value})} onKeyDown={e => e.key === "Enter" && addMyTask()} style={inp({ flex: 1, minWidth: "min(200px, 100%)" })} />
              <input type="date" value={newMyTask.due_date} onChange={e => setNewMyTask({...newMyTask, due_date: e.target.value})} style={inp({ width: "150px" })} />
              <button onClick={addMyTask} style={{ padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>{action === "my-task" ? "Adding..." : "Add"}</button>
            </div>
            {myTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>No tasks yet. Add your first task above.</p>}
            {myTasks.map(task => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px" }} onMouseEnter={e => (e.currentTarget.style.background = "#f8faf8")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div onClick={() => toggleTask(task, true)} style={{ width: "18px", height: "18px", borderRadius: "50%", border: task.completed ? "none" : "2px solid #d4c5b0", background: task.completed ? "#E8C97A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {task.completed && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.88rem", color: task.completed ? "#b0a090" : "#1B3A2D", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                  {task.due_date && <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>Due {task.due_date}</div>}
                </div>
                <button onClick={() => deleteTask(task.id, true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Brand Tasks */}
        {activeTab === "brandtasks" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>{plannerEvent?.brand_name || "Brand"} Tasks ({brandCompleted}/{brandTasks.length})</div>
            <p style={{ fontSize: "0.8rem", color: "#4a5a52", marginBottom: "1rem" }}>These tasks are visible to {plannerEvent?.brand_name || "the brand"} on their portal. Assign to a team member if needed.</p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", flexWrap: "wrap" as const }}>
              <input placeholder="Add a task for the brand..." value={newBrandTask.task} onChange={e => setNewBrandTask({...newBrandTask, task: e.target.value})} onKeyDown={e => e.key === "Enter" && addBrandTask()} style={inp({ flex: 1, minWidth: "min(200px, 100%)" })} />
              <input type="date" value={newBrandTask.due_date} onChange={e => setNewBrandTask({...newBrandTask, due_date: e.target.value})} style={inp({ width: "150px" })} />
              <input placeholder="Assign to (name)" value={newBrandTask.assigned_to} onChange={e => setNewBrandTask({...newBrandTask, assigned_to: e.target.value})} style={inp({ width: "150px" })} />
              <button onClick={addBrandTask} style={{ padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>{action === "brand-task" ? "Adding..." : "Add"}</button>
            </div>
            {brandTasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>No tasks yet.</p>}
            {brandTasks.map(task => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px", borderRadius: "8px" }} onMouseEnter={e => (e.currentTarget.style.background = "#f8faf8")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div onClick={() => toggleTask(task, false)} style={{ width: "18px", height: "18px", borderRadius: "50%", border: task.completed ? "none" : "2px solid #d4c5b0", background: task.completed ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {task.completed && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.88rem", color: task.completed ? "#b0a090" : "#1B3A2D", textDecoration: task.completed ? "line-through" : "none" }}>{task.task}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "2px" }}>
                    {task.due_date && <span style={{ fontSize: "0.72rem", color: "#4a5a52" }}>Due {task.due_date}</span>}
                    {task.assigned_to && <span style={{ fontSize: "0.72rem", color: "#E8C97A" }}>→ {task.assigned_to}</span>}
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id, false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Chat */}
        {activeTab === "chat" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "1rem" }}>Chat with {plannerEvent?.brand_name || "brand"}</div>
            <div style={{ height: "400px", overflowY: "auto", marginBottom: "1rem", display: "flex", flexDirection: "column" as const, gap: "10px", padding: "0.5rem" }}>
              {messages.length === 0 && <p style={{ fontSize: "0.85rem", color: "#4a5a52", textAlign: "center", marginTop: "2rem" }}>No messages yet. Start the conversation.</p>}
              {messages.map(msg => {
                const isMe = msg.sender_email === userEmail;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: "0.7rem", color: "#4a5a52", marginBottom: "2px" }}>{msg.sender_name}</div>
                    <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? "#1B3A2D" : "#f0f4f1", color: isMe ? "#fff" : "#1B3A2D", fontSize: "0.88rem", lineHeight: 1.5 }}>{msg.message}</div>
                    <div style={{ fontSize: "0.68rem", color: "#b0a090", marginTop: "2px" }}>{formatDate(msg.created_at)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="Type a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} style={inp({ flex: 1 })} />
              <button onClick={sendMessage} style={{ padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>{action === "message" ? "Sending..." : "Send"}</button>
            </div>
          </div>
        )}

        {/* Mood Board */}
        {activeTab === "team" && (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>Team access</div>
            <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1.5rem" }}>Invite team members to access {plannerEvent?.brand_name || "this brand"} portal. They will receive an email with a link to set up their account.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "1.5rem" }}>
              <input type="email" value={teamEmail} onChange={e => setTeamEmail(e.target.value)} placeholder="Team member email" style={{ flex: "1 1 180px", minWidth: 0, maxWidth: "100%", padding: "10px 12px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.88rem",  outline: "none" }} onKeyDown={e => e.key === "Enter" && inviteTeamMember()} />
              <button onClick={inviteTeamMember} disabled={invitingTeam || !teamEmail.trim()} style={{ padding: "10px 20px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.88rem", cursor: "pointer" }}>
                {invitingTeam ? "Sending..." : "Send invite"}
              </button>
            </div>
            {teamInvited.length > 0 && (
              <div>
                <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.1em", marginBottom: "8px" }}>INVITED THIS SESSION</div>
                {teamInvited.map(email => (
                  <div key={email} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "#f0f4f1", borderRadius: "8px", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>✓</span>
                    <span style={{ fontSize: "0.85rem", color: "#1c1714" }}>{email}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "shipments" && (
          <div>
            <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1.5rem" }}>Track items being shipped to the venue. Mark items as received when they arrive.</p>
            {shipments.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
                <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No shipments yet</div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Shipments will appear here when the brand marks items as shipped.</div>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" style={{ marginBottom: "1.5rem" }}>
                  <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
                    <div style={{ fontSize: "1.5rem", color: "#1B3A2D" }}>{shipments.length}</div>
                    <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em" }}>TOTAL ITEMS</div>
                  </div>
                  <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
                    <div style={{ fontSize: "1.5rem", color: "#E8C97A" }}>{shipments.filter(s => s.shipped).length}</div>
                    <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em" }}>SHIPPED</div>
                  </div>
                  <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
                    <div style={{ fontSize: "1.5rem", color: "#4a7c59" }}>{shipments.filter(s => s.received).length}</div>
                    <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em" }}>RECEIVED</div>
                  </div>
                </div>
                {shipments.map(shipment => (
                  <div key={shipment.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "8px", border: "1px solid #e4ebe6", borderLeft: `3px solid ${shipment.received ? "#4a7c59" : shipment.shipped ? "#E8C97A" : "#e4ebe6"}` }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "4px" }}>{shipment.notes}</div>
                        {shipment.courier && <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{shipment.courier} {shipment.tracking_number && `· ${shipment.tracking_number}`}</div>}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                        <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "20px", background: shipment.received ? "#4a7c5922" : shipment.shipped ? "#E8C97A22" : "#f0f4f1", color: shipment.received ? "#4a7c59" : shipment.shipped ? "#b87333" : "#4a5a52" }}>
                          {shipment.received ? "✓ Received" : shipment.shipped ? "Shipped" : "Pending"}
                        </span>
                        {shipment.shipped && !shipment.received && (
                          <button onClick={() => markReceived(shipment.id, true)} style={{ fontSize: "0.72rem", padding: "4px 10px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>Mark received</button>
                        )}
                        {shipment.received && (
                          <button onClick={() => markReceived(shipment.id, false)} style={{ fontSize: "0.72rem", padding: "4px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52" }}>Undo</button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "moodboard" && (
          <MoodBoard eventSlug={slug} userEmail={userEmail} userName={userName} />
        )}

        {/* Receipts */}
        {activeTab === "receipts" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "1rem" }}>Receipts & Invoices</div>
            <p style={{ fontSize: "0.8rem", color: "#4a5a52", marginBottom: "1rem" }}>{plannerEvent?.brand_name || "The brand"} can approve or reject these from their portal.</p>

            <div style={{ background: "#f8faf8", borderRadius: "10px", padding: "1rem", border: "1px solid #f0f4f1", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "0.82rem", color: "#1B3A2D", marginBottom: "10px", fontWeight: 500 }}>Upload new receipt or invoice</div>
              <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>RECEIPT NAME / VENDOR</div>
              <input placeholder="e.g. Instacart, LuxeBalloons, Videographer" value={newReceipt.description} onChange={e => setNewReceipt({...newReceipt, description: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem",  marginBottom: "8px", boxSizing: "border-box" as const }} />
              <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "6px" }}>SELECT ITEMS COVERED BY THIS RECEIPT</div>
              <div style={{ background: "#f8faf8", borderRadius: "8px", padding: "8px", border: "1px solid #e4ebe6", marginBottom: "8px", maxHeight: "200px", overflowY: "auto" as const }}>
                {[
                  ...decor.filter(d => d.cost > 0).map(d => ({ key: `d-${d.id}`, name: d.item, cost: d.cost, cat: "Decor" })),
                  ...refresh.filter(r => r.cost > 0).map(r => ({ key: `r-${r.id}`, name: r.item, cost: r.cost, cat: "Refreshments" })),
                  ...manualExpenses.filter(e => e.cost > 0).map(e => ({ key: `e-${e.id}`, name: e.item, cost: e.cost, cat: e.category })),
                ].map(item => (
                  <div key={item.key} onClick={() => { if (!action) setSelectedItems(prev => prev.includes(item.name) ? prev.filter(i => i !== item.name) : [...prev, item.name]); }} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", background: selectedItems.includes(item.name) ? "#f0f4f1" : "transparent", marginBottom: "2px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "3px", border: "1.5px solid " + (selectedItems.includes(item.name) ? "#1B3A2D" : "#e4ebe6"), background: selectedItems.includes(item.name) ? "#1B3A2D" : "#fff", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selectedItems.includes(item.name) && <span style={{ color: "#fff", fontSize: "10px" }}>✓</span>}
                    </div>
                    <span style={{ fontSize: "0.82rem", color: "#1c1714", flex: "1 1 100px", minWidth: 0 }}>{item.name}</span>
                    <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{item.cat}</span>
                    <span style={{ fontSize: "0.82rem", color: "#E8C97A" }}>{formatCurrency(Number(item.cost))}</span>
                  </div>
                ))}
              </div>
              {selectedItems.length > 0 && (
                <div style={{ fontSize: "0.75rem", color: "#1B3A2D", marginBottom: "8px" }}>{selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected</div>
              )}
              <input placeholder="Amount $" value={newReceipt.amount} onChange={e => setNewReceipt({...newReceipt, amount: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem",  marginBottom: "8px", boxSizing: "border-box" as const }} />
              <div onClick={() => { if (!action) document.getElementById("receipt-upload")?.click(); }} style={{ border: "2px dashed #e4ebe6", borderRadius: "8px", padding: "12px", textAlign: "center" as const, cursor: "pointer", marginBottom: "8px", background: selectedReceiptFile ? "#f0faf0" : "#fff" }}>
                <input id="receipt-upload" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={e => setSelectedReceiptFile(e.target.files?.[0] || null)} />
                {selectedReceiptFile ? <div style={{ fontSize: "0.82rem", color: "#4a7c59" }}>✓ {selectedReceiptFile.name}</div> : <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Click to select file (PDF or image)</div>}
              </div>
              <button onClick={uploadReceipt} disabled={action !== null || !newReceipt.description.trim() || !selectedReceiptFile} style={{ padding: "8px 16px", background: selectedReceiptFile && newReceipt.description ? "#1B3A2D" : "#d4c5b0", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: selectedReceiptFile && newReceipt.description ? "pointer" : "not-allowed" }}>
                {action === "upload" ? "Uploading..." : "Upload"}
              </button>
            </div>

            {/* Budget items without receipts */}
            {(() => {
              const receiptedItems = receipts.flatMap(r => {
                try {
                  const parsed = JSON.parse(r.description || "[]");
                  return Array.isArray(parsed) ? parsed : [r.description];
                } catch { return [r.description]; }
              });
              const allItems = [
                ...decor.filter(d => d.cost > 0).map(d => ({ name: d.item, cost: d.cost, category: "Decor" })),
                ...refresh.filter(r => r.cost > 0).map(r => ({ name: r.item, cost: r.cost, category: "Refreshments" })),
                ...manualExpenses.filter(e => e.cost > 0).map(e => ({ name: e.item, cost: e.cost, category: e.category })),
              ];
              const pending = allItems.filter(i => !receiptedItems.includes(i.name));
              if (pending.length === 0) return null;
              return (
                <div style={{ background: "#fff8f0", borderRadius: "10px", padding: "1rem", border: "1px solid #f0e8d8", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "#b87333", letterSpacing: "0.1em", marginBottom: "8px" }}>PENDING RECEIPTS ({pending.length})</div>
                  {pending.map((item, i) => (
                    <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "space-between", padding: "4px 0", borderBottom: i < pending.length - 1 ? "1px solid #f5ede0" : "none", fontSize: "0.82rem" }}>
                      <span style={{ color: "#4a5a52" }}>{item.name} — {item.category}</span>
                      <span style={{ color: "#b87333" }}>{formatCurrency(Number(item.cost))}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            {receipts.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>No receipts uploaded yet.</p>
            ) : (
              receipts.map(receipt => (
                <div key={receipt.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "#f8faf8", marginBottom: "8px", border: "1px solid #f0f4f1" }}>
                  <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                    <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>
                      {(() => {
                        try {
                          const parsed = JSON.parse(receipt.description);
                          return Array.isArray(parsed) ? parsed.join(", ") : receipt.description;
                        } catch { return receipt.description; }
                      })()}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#4a5a52", marginTop: "2px" }}>{receipt.file_name} · {new Date(receipt.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                  <div style={{ fontSize: "0.95rem", color: "#E8C97A", fontWeight: 500 }}>{formatCurrency(Number(receipt.amount))}</div>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: receipt.status === "approved" ? "#4a7c5922" : receipt.status === "rejected" ? "#c0392b22" : "#f0f4f1", color: receipt.status === "approved" ? "#4a7c59" : receipt.status === "rejected" ? "#c0392b" : "#4a5a52" }}>
                    {receipt.status === "approved" ? "Approved" : receipt.status === "rejected" ? "Rejected" : "Pending"}
                  </span>
                  <a href={receipt.file_url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", padding: "3px 8px", background: "#1B3A2D", color: "#fff", borderRadius: "6px", textDecoration: "none" }}>↓</a>
                  <button onClick={() => deleteReceipt(receipt.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                </div>
              ))
            )}
          </div>
        )}
        </fieldset>
      </div>
    </div>
  );
}
