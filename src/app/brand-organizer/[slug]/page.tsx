/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type CityEvent = {
  id: number;
  slug: string;
  name: string;
  city: string;
  dates_label: string;
  status: string;
  venue_name?: string;
  venue_address?: string;
  start_date?: string;
};

type PlannerInfo = {
  planner_email: string;
  brand_name: string;
  city?: string;
  dates_label?: string;
  venue_name?: string;
  venue_address?: string;
};

type Task = {
  id: number;
  task: string;
  due_date: string;
  completed: boolean;
  assigned_to?: string;
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

type Expense = {
  id: number;
  category: string;
  item: string;
  cost: number;
  deposit: number;
};

export default function BrandCityDashboard() {
  const params = useParams();
  const slug = params.slug as string;

  const [event, setEvent] = useState<CityEvent | null>(null);
  const [planner, setPlanner] = useState<PlannerInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "budget" | "tasks" | "invoices" | "shipments" | "chat" | "team">("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newShipment, setNewShipment] = useState("");
  const [addingShipment, setAddingShipment] = useState(false);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  useEffect(() => { if (slug) fetchAll(); }, [slug]);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }
    setUserEmail(user.email || "");

    const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).single();
    if (profile?.name) setUserName(profile.name);

    const [eventRes, plannerRes, tasksRes, messagesRes, invoicesRes, shipmentsRes, expensesRes] = await Promise.all([
      supabase.from("events").select("*").eq("slug", slug).maybeSingle(),
      supabase.from("event_planners").select("*").eq("event_slug", slug).maybeSingle(),
      supabase.from("planner_tasks").select("*").eq("event_slug", slug).eq("owner", "brand").order("created_at"),
      supabase.from("planner_messages").select("*").eq("event_slug", slug).order("created_at"),
      supabase.from("item_invoices").select("*").eq("event_slug", slug).order("created_at", { ascending: false }),
      supabase.from("shipments").select("*").eq("event_slug", slug),
      supabase.from("expenses").select("*").eq("event", slug),
    ]);

    if (eventRes.data) setEvent(eventRes.data);
    if (plannerRes.data) setPlanner(plannerRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (messagesRes.data) setMessages(messagesRes.data);
    if (invoicesRes.data) setInvoices(invoicesRes.data);
    if (shipmentsRes.data) setShipments(shipmentsRes.data);
    if (expensesRes.data) setExpenses(expensesRes.data);
    setLoading(false);
  };

  const toggleTask = async (task: Task) => {
    await supabase.from("planner_tasks").update({ completed: !task.completed }).eq("id", task.id);
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
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
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("shipments").insert({
      event_slug: slug, organizer_email: user?.email, notes: newShipment, shipped: false
    }).select().single();
    if (data) setShipments(prev => [...prev, data]);
    setNewShipment("");
    setAddingShipment(false);
  };

  const toggleShipment = async (shipment: Shipment) => {
    await supabase.from("shipments").update({ shipped: !shipment.shipped }).eq("id", shipment.id);
    setShipments(prev => prev.map(s => s.id === shipment.id ? { ...s, shipped: !s.shipped } : s));
  };

  const daysToEvent = event?.start_date ? Math.ceil((new Date(event.start_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const totalBudget = expenses.reduce((s, e) => s + Number(e.cost), 0);
  const pendingInvoices = invoices.filter(i => i.status === "pending").length;
  const approvedInvoices = invoices.filter(i => i.status === "approved").length;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "budget", label: "Budget" },
    { key: "invoices", label: `Invoices${pendingInvoices > 0 ? ` (${pendingInvoices})` : ""}` },
    { key: "tasks", label: "My Tasks" },
    { key: "shipments", label: "Shipments" },
    { key: "chat", label: "Chat" },
    { key: "team", label: "Team" },
  ];

  const inp = (style?: object) => ({ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", ...style });

  if (loading) return <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>;

  const cityName = event?.city || planner?.city || slug;
  const datesLabel = event?.dates_label || planner?.dates_label || "";
  const venueName = event?.venue_name || planner?.venue_name || "";
  const venueAddress = event?.venue_address || planner?.venue_address || "";

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>

      {/* Sidebar */}
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "#00000044", zIndex: 15 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: "220px", background: "#2c1810", zIndex: 16, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", display: "flex", flexDirection: "column" as const, paddingTop: "60px" }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #3d2415" }}>
          <div style={{ fontSize: "0.7rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "4px" }}>{userName || "MY BRAND"}</div>
          <div style={{ fontSize: "0.9rem", color: "#fff" }}>{cityName}</div>
          {datesLabel && <div style={{ fontSize: "0.72rem", color: "#b87333", marginTop: "2px" }}>{datesLabel}</div>}
        </div>
        <nav style={{ flex: 1, padding: "1rem 0" }}>
          {tabs.map(tab => (
            <a key={tab.key} onClick={() => { setActiveTab(tab.key as any); setSidebarOpen(false); }} style={{ display: "block", padding: "10px 1.25rem", fontSize: "0.85rem", color: activeTab === tab.key ? "#fff" : "#c8b89a", background: activeTab === tab.key ? "#3d2415" : "transparent", textDecoration: "none", borderLeft: activeTab === tab.key ? "2px solid #b87333" : "2px solid transparent", cursor: "pointer" }}>
              {tab.label}
            </a>
          ))}
        </nav>
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #3d2415" }}>
          <Link href="/brand-organizer" style={{ fontSize: "0.8rem", color: "#c8b89a", textDecoration: "none", display: "block" }}>← All cities</Link>
        </div>
      </div>

      {/* Top bar */}
      <div style={{ background: "#2c1810", padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", position: "sticky" as const, top: 0, zIndex: 14 }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", flexDirection: "column" as const, gap: "5px" }}>
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "#b87333" : "#c8b89a", transition: "all 0.2s", transform: sidebarOpen ? "rotate(45deg) translate(4.5px, 4.5px)" : "none" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "transparent" : "#c8b89a", transition: "all 0.2s" }} />
          <span style={{ display: "block", width: "20px", height: "1.5px", background: sidebarOpen ? "#b87333" : "#c8b89a", transition: "all 0.2s", transform: sidebarOpen ? "rotate(-45deg) translate(4.5px, -4.5px)" : "none" }} />
        </button>
        <div style={{ fontSize: "1rem", color: "#fff" }}>{cityName}</div>
        <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#c8b89a" }}>{tabs.find(t => t.key === activeTab)?.label}</div>
      </div>

      <div style={{ padding: "2rem 2.5rem", maxWidth: "1000px", margin: "0 auto" }}>

        {/* Stats box */}
        <div style={{ background: "#2c1810", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>CITY</div>
              <div style={{ fontSize: "1.1rem" }}>{cityName}</div>
              {datesLabel && <div style={{ fontSize: "0.75rem", color: "#b87333", marginTop: "4px" }}>{datesLabel}</div>}
              {venueName && <div style={{ fontSize: "0.72rem", color: "#c8b89a", marginTop: "4px" }}>📍 {venueName}</div>}
              {venueAddress && <div style={{ fontSize: "0.68rem", color: "#8b7355", marginTop: "2px" }}>{venueAddress}</div>}
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>TOTAL BUDGET</div>
              <div style={{ fontSize: "1.8rem", color: "#e8c97a" }}>${totalBudget.toFixed(2)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.1em", marginBottom: "6px" }}>TASK PROGRESS</div>
              <div style={{ fontSize: "1.8rem" }}>{progress}%</div>
              <div style={{ height: "3px", background: "#3d2415", borderRadius: "2px", marginTop: "8px" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "2px" }} />
              </div>
              <div style={{ fontSize: "0.72rem", color: "#c8b89a", marginTop: "4px" }}>{completedTasks}/{tasks.length} done</div>
            </div>
            <div style={{ background: "#fff", borderRadius: "10px", padding: "1rem", textAlign: "center" as const }}>
              <div style={{ fontSize: "2.5rem", color: "#2c1810", lineHeight: 1 }}>{daysToEvent ?? "—"}</div>
              <div style={{ fontSize: "0.7rem", color: "#8b7355", marginTop: "6px", letterSpacing: "0.05em" }}>DAYS TO EVENT</div>
            </div>
          </div>
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>PLANNER</div>
              {planner ? (
                <div>
                  <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "4px" }}>{planner.planner_email}</div>
                  <div style={{ fontSize: "0.78rem", color: "#8b7355" }}>Managing your {cityName} event</div>
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "#8b7355" }}>Self-managed</div>
              )}
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>INVOICES</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                <div>
                  <div style={{ fontSize: "1.3rem", color: "#b87333" }}>{pendingInvoices}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Pending</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.3rem", color: "#4a7c59" }}>{approvedInvoices}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Approved</div>
                </div>
                <div>
                  <div style={{ fontSize: "1.3rem", color: "#c0392b" }}>{invoices.filter(i => i.status === "rejected").length}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Rejected</div>
                </div>
              </div>
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>VENUE</div>
              {venueName ? (
                <div>
                  <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "4px" }}>{venueName}</div>
                  {venueAddress && <div style={{ fontSize: "0.78rem", color: "#8b7355" }}>{venueAddress}</div>}
                </div>
              ) : (
                <div style={{ fontSize: "0.85rem", color: "#8b7355" }}>No venue set yet</div>
              )}
            </div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>SHIPMENTS</div>
              <div style={{ fontSize: "1.3rem", color: "#2c1810", marginBottom: "4px" }}>{shipments.filter(s => s.shipped).length}/{shipments.length}</div>
              <div style={{ fontSize: "0.78rem", color: "#8b7355" }}>shipped</div>
            </div>
          </div>
        )}

        {/* Budget */}
        {activeTab === "budget" && (
          <div>
            {expenses.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "2rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
                <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No budget items yet. Your planner will add expenses here.</p>
              </div>
            ) : (
              ["Venue", "Content", "Marketing", "Operations", "Logistics", "Decor", "Refreshments", "Staff"].map(cat => {
                const items = expenses.filter(e => e.category === cat);
                if (!items.length) return null;
                const catTotal = items.reduce((s, e) => s + Number(e.cost), 0);
                return (
                  <div key={cat} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <div style={{ fontSize: "0.85rem", color: "#2c1810", fontWeight: 500 }}>{cat}</div>
                      <div style={{ fontSize: "0.95rem", color: "#b87333", fontWeight: 500 }}>${catTotal.toFixed(2)}</div>
                    </div>
                    {items.map((exp, i) => (
                      <div key={exp.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < items.length - 1 ? "1px solid #f0ebe4" : "none", fontSize: "0.85rem" }}>
                        <span style={{ color: "#2c1810" }}>{exp.item}</span>
                        <div style={{ display: "flex", gap: "12px" }}>
                          {exp.deposit > 0 && <span style={{ fontSize: "0.75rem", color: "#4a7c59" }}>Deposit: ${Number(exp.deposit).toFixed(2)}</span>}
                          <span style={{ color: "#b87333", fontWeight: 500 }}>${Number(exp.cost).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
            <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#c8b89a", fontSize: "0.85rem" }}>GRAND TOTAL</span>
              <span style={{ color: "#fff", fontSize: "1.1rem" }}>${totalBudget.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Invoices */}
        {activeTab === "invoices" && (
          <div>
            <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1rem" }}>Review and approve or reject invoices from your planner. Approved invoices will be paid.</p>
            {invoices.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "2rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
                <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No invoices yet.</p>
              </div>
            ) : (
              invoices.map(inv => (
                <div key={inv.id} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5", borderLeft: `3px solid ${inv.status === "approved" ? "#4a7c59" : inv.status === "rejected" ? "#c0392b" : "#b87333"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "0.9rem", color: "#2c1810", fontWeight: 500 }}>{inv.description}</div>
                      <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>{inv.item_name} · {new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: "1.1rem", color: "#b87333", fontWeight: 500 }}>${Number(inv.amount).toFixed(2)}</div>
                      <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: inv.status === "approved" ? "#4a7c5922" : inv.status === "rejected" ? "#c0392b22" : "#f0ebe4", color: inv.status === "approved" ? "#4a7c59" : inv.status === "rejected" ? "#c0392b" : "#8b7355" }}>
                        {inv.status === "approved" ? "Approved" : inv.status === "rejected" ? "Rejected" : "Pending approval"}
                      </span>
                    </div>
                  </div>
                  {inv.rejection_note && <div style={{ fontSize: "0.78rem", color: "#c0392b", marginBottom: "8px" }}>Rejection note: {inv.rejection_note}</div>}
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <a href={inv.file_url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.78rem", padding: "5px 12px", background: "#f0ebe4", color: "#2c1810", borderRadius: "6px", textDecoration: "none" }}>↓ Download</a>
                    {inv.status === "pending" && (
                      <>
                        <button onClick={() => approveInvoice(inv.id)} style={{ fontSize: "0.78rem", padding: "5px 12px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>✓ Approve</button>
                        <button onClick={() => { setRejecting(inv.id); setRejectionNote(""); }} style={{ fontSize: "0.78rem", padding: "5px 12px", background: "#c0392b", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" }}>✕ Reject</button>
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
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "0.5rem" }}>My Tasks ({completedTasks}/{tasks.length})</div>
            <p style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1rem" }}>Tasks assigned to you by your planner. Check them off as you complete them.</p>
            {tasks.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks assigned yet.</p>}
            {tasks.map(task => (
              <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 8px", borderRadius: "8px", borderBottom: "1px solid #f0ebe4" }}>
                <div onClick={() => toggleTask(task)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: task.completed ? "none" : "2px solid #d4c5b0", background: task.completed ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
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
            {shipments.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No shipments added yet.</p>}
            {shipments.map(shipment => (
              <div key={shipment.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid #f0ebe4" }}>
                <div onClick={() => toggleShipment(shipment)} style={{ width: "20px", height: "20px", borderRadius: "50%", border: shipment.shipped ? "none" : "2px solid #d4c5b0", background: shipment.shipped ? "#4a7c59" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                  {shipment.shipped && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                </div>
                <div style={{ flex: 1, fontSize: "0.88rem", color: shipment.shipped ? "#b0a090" : "#2c1810", textDecoration: shipment.shipped ? "line-through" : "none" }}>{shipment.notes}</div>
                <span style={{ fontSize: "0.72rem", color: shipment.shipped ? "#4a7c59" : "#8b7355" }}>{shipment.shipped ? "Shipped" : "Pending"}</span>
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

        {/* Team */}
        {activeTab === "team" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>Team for {cityName}</div>
            {planner && (
              <div style={{ padding: "12px", background: "#faf8f5", borderRadius: "10px", marginBottom: "10px", border: "1px solid #f0ebe4" }}>
                <div style={{ fontSize: "0.7rem", color: "#b87333", letterSpacing: "0.08em", marginBottom: "4px" }}>PLANNER</div>
                <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>{planner.planner_email}</div>
                <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>Managing logistics for {cityName}</div>
              </div>
            )}
            <p style={{ fontSize: "0.82rem", color: "#8b7355", marginTop: "1rem" }}>Team members will appear here once added by your planner.</p>
          </div>
        )}

      </div>
    </div>
  );
}
