/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { formatCurrency } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import PlanningSkeleton from "@/app/organizer/events/[slug]/planning/PlanningSkeleton";
import Link from "next/link";

type DecorItem = { id: number; category: string; item: string; decision: string; vendor: string; cost: number; quantity: number; status: string; notes: string; brand_status?: string; };
type RefreshItem = { id: number; item: string; vendor: string; quantity: string; quantity_num: number; cost: number; notes: string; brand_status?: string; };
type StaffItem = { id: number; name: string; role: string; hours: string; pay_rate: number; phone: string; email: string; instagram: string; notes: string; brand_status?: string; shifts?: StaffShift[]; };
type StaffShift = { id: number; staff_id: number; shift_date: string; start_time: string; end_time: string; hours: number; };
type Invoice = { id: number; item_name: string; item_category: string; description: string; amount: number; file_url: string; file_name: string; status: string; rejection_note: string; receipt_url: string; receipt_name: string; };
type ItemComment = { id: number; item_name: string; sender_email: string; sender_name: string; message: string; created_at: string; };

const DECOR_CATEGORIES = ["Theme", "Furniture", "Florals", "Lighting", "Signage", "Props"];
const STAFF_ROLES = ["Cashier", "Stylist", "Runner", "Check-in", "Security", "Inventory", "Brand liaison", "Photographer"];
const STATUSES = ["Pending", "In Progress", "Confirmed", "Cancelled"];


const statusColors: Record<string, { bg: string; color: string }> = {
  Confirmed: { bg: "#4a7c5922", color: "#4a7c59" },
  "In Progress": { bg: "#E8C97A22", color: "#E8C97A" },
  Pending: { bg: "#4a5a5222", color: "#4a5a52" },
  Cancelled: { bg: "#c0392b22", color: "#c0392b" },
};

const roleColors: Record<string, string> = {
  Cashier: "#E8C97A", Stylist: "#4a7c59", Runner: "#5b7fa6",
  "Check-in": "#8b6ab0", Security: "#c0392b", Inventory: "#2c7873",
  "Brand liaison": "#a0522d", Photographer: "#6b8e23",
};

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const toMins = (t: string) => {
    const match = t.match(/^(\d+)(?::(\d+))?\s*(am|pm)$/i);
    if (!match) return 0;
    let h = parseInt(match[1]);
    const m = parseInt(match[2] || "0");
    const period = match[3].toLowerCase();
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    return h * 60 + m;
  };
  const diff = (toMins(end) - toMins(start)) / 60;
  return diff > 0 ? Math.round(diff * 10) / 10 : 0;
}

const formatNumber = (value: number) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 2 });

function nonNegativeAmount(value: string | number | null | undefined): number | null {
  const parsed = value == null || String(value).trim() === "" ? 0 : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export default function PlannerPlanningHub({ params }: { params: Promise<{ slug: string }> }) {
  const [eventSlug, setEventSlug] = useState("");
  const [tab, setTab] = useState<"decor" | "refreshments" | "staff">("decor");
  const [decor, setDecor] = useState<DecorItem[]>([]);
  const [refresh, setRefresh] = useState<RefreshItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [addingShift, setAddingShift] = useState<number | null>(null);
  const [staffMenu, setStaffMenu] = useState<number | null>(null);
  const [newShift, setNewShift] = useState({ shift_date: "", start_time: "", end_time: "" });
  const [newDecor, setNewDecor] = useState({ category: "Theme", item: "", decision: "", vendor: "", cost: "", quantity: "", status: "Pending", notes: "" });
  const [newRefresh, setNewRefresh] = useState({ item: "", vendor: "", quantity: "", quantity_num: "", cost: "", notes: "" });
  const [newStaff, setNewStaff] = useState({ name: "", role: "Cashier", pay_rate: "", phone: "", email: "", instagram: "", notes: "" });
  const [addingInvoice, setAddingInvoice] = useState<{ type: string; itemName: string; category: string } | null>(null);
  const [newInvoice, setNewInvoice] = useState({ description: "", amount: "" });
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [comments, setComments] = useState<ItemComment[]>([]);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    params.then(p => setEventSlug(p.slug));
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!eventSlug) return;
    let active = true;
    const run = async () => {
      setLoading(true);
      setLoadError("");
      try {
        await fetchAll(() => active);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load planning hub:", error);
        setLoadError("Could not load the planning hub. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug, retry]);

  const fetchAll = async (isActive: () => boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserEmail(user.email || "");
    const { data: profile } = await supabase.from("profiles").select("name").eq("email", user?.email || "").maybeSingle();
    if (profile?.name) setUserName(profile.name);

    const [d, r, s, sh, inv, commentsData] = await Promise.all([
      supabase.from("planning_decor").select("*").eq("event", eventSlug).order("category"),
      supabase.from("planning_refreshments").select("*").eq("event", eventSlug),
      supabase.from("planning_staff").select("*").eq("event", eventSlug),
      supabase.from("planning_staff_shifts").select("*").eq("event", eventSlug),
      supabase.from("item_invoices").select("*").eq("event_slug", eventSlug).order("created_at", { ascending: false }),
      supabase.from("item_comments").select("*").eq("event_slug", eventSlug).order("created_at"),
    ]);
    const queryError = d.error || r.error || s.error || sh.error || inv.error || commentsData.error;
    if (queryError) throw queryError;
    if (!isActive()) return;
    const shifts = sh.data ?? [];
    setDecor(d.data ?? []);
    setRefresh(r.data ?? []);
    setStaff((s.data ?? []).map(member => ({
      ...member,
      shifts: shifts.filter((shift: StaffShift) => shift.staff_id === member.id)
    })));
    setInvoices(inv.data ?? []);
    setComments(commentsData.data ?? []);
  };

  const addDecor = async () => {
    if (saving) return;
    if (!newDecor.item.trim()) { alert("Enter an item."); return; }
    const qty = nonNegativeAmount(newDecor.quantity);
    const unitCost = nonNegativeAmount(newDecor.cost);
    if (qty === null || unitCost === null) { alert("Enter valid non-negative amounts."); return; }
    const totalCost = qty > 0 ? qty * unitCost : unitCost;
    setSaving("add");
    try {
      const { data, error } = await supabase.from("planning_decor").insert({
        ...newDecor, cost: totalCost, quantity: qty, event: eventSlug
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The saved decor item was not returned.");
      setDecor(prev => [...prev, data]);
      setNewDecor({ category: "Theme", item: "", decision: "", vendor: "", cost: "", quantity: "", status: "Pending", notes: "" });
      setAdding(false);
    } catch (error) {
      console.error("Failed to add decor:", error);
      alert("Could not add decor. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const addRefresh = async () => {
    if (saving) return;
    if (!newRefresh.item.trim()) { alert("Enter an item."); return; }
    const qty = nonNegativeAmount(newRefresh.quantity_num);
    const unitCost = nonNegativeAmount(newRefresh.cost);
    if (qty === null || unitCost === null) { alert("Enter valid non-negative amounts."); return; }
    const totalCost = qty > 0 ? qty * unitCost : unitCost;
    setSaving("add");
    try {
      const { data, error } = await supabase.from("planning_refreshments").insert({
        item: newRefresh.item, vendor: newRefresh.vendor, quantity: newRefresh.quantity,
        quantity_num: qty, cost: totalCost, notes: newRefresh.notes, event: eventSlug
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The saved refreshment was not returned.");
      setRefresh(prev => [...prev, data]);
      setNewRefresh({ item: "", vendor: "", quantity: "", quantity_num: "", cost: "", notes: "" });
      setAdding(false);
    } catch (error) {
      console.error("Failed to add refreshment:", error);
      alert("Could not add refreshment. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const addStaff = async () => {
    if (saving) return;
    if (!newStaff.name.trim()) { alert("Enter a staff name."); return; }
    const payRate = nonNegativeAmount(newStaff.pay_rate);
    if (payRate === null) { alert("Enter a valid non-negative pay rate."); return; }
    setSaving("add");
    try {
      const { data, error } = await supabase.from("planning_staff").insert({
        name: newStaff.name, role: newStaff.role, pay_rate: payRate,
        phone: newStaff.phone, email: newStaff.email, instagram: newStaff.instagram,
        notes: newStaff.notes, event: eventSlug
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The saved staff member was not returned.");
      setStaff(prev => [...prev, { ...data, shifts: [] }]);
      setNewStaff({ name: "", role: "Cashier", pay_rate: "", phone: "", email: "", instagram: "", notes: "" });
      setAdding(false);
    } catch (error) {
      console.error("Failed to add staff:", error);
      alert("Could not add staff. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const addShift = async (staffId: number) => {
    if (saving) return;
    if (!newShift.start_time || !newShift.end_time) { alert("Enter a start and end time."); return; }
    const hours = calcHours(newShift.start_time, newShift.end_time);
    if (!(hours > 0)) { alert("Enter a valid start and end time, with the end after the start."); return; }
    setSaving("shift");
    try {
      const { data, error } = await supabase.from("planning_staff_shifts").insert({
        staff_id: staffId, event: eventSlug, shift_date: newShift.shift_date,
        start_time: newShift.start_time, end_time: newShift.end_time, hours,
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The saved shift was not returned.");
      setStaff(prev => prev.map(m => m.id === staffId ? { ...m, shifts: [...(m.shifts || []), data] } : m));
      setNewShift({ shift_date: "", start_time: "", end_time: "" });
      setAddingShift(null);
    } catch (error) {
      console.error("Failed to add shift:", error);
      alert("Could not add shift. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const duplicateStaff = async (member: any) => {
    if (saving) return;
    setSaving("duplicate");
    try {
      const { data, error } = await supabase.from("planning_staff").insert({
        event: eventSlug,
        name: member.name + " (copy)",
        role: member.role,
        pay_rate: member.pay_rate,
        phone: member.phone,
        email: member.email,
        notes: member.notes,
        brand_status: "pending",
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The duplicated staff member was not returned.");
      setStaff(prev => [...prev, { ...data, shifts: [] }]);
      setStaffMenu(null);
    } catch (error) {
      console.error("Failed to duplicate staff:", error);
      alert("Could not duplicate staff. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const deleteShift = async (staffId: number, shiftId: number) => {
    if (saving) return;
    setSaving("delete");
    try {
      const { error } = await supabase.from("planning_staff_shifts").delete().eq("id", shiftId);
      if (error) throw error;
      setStaff(prev => prev.map(m => m.id === staffId ? { ...m, shifts: (m.shifts || []).filter(s => s.id !== shiftId) } : m));
    } catch (error) {
      console.error("Failed to delete shift:", error);
      alert("Could not remove the shift. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const saveEdit = async (table: string, id: number) => {
    if (saving) return;
    const saveId = editData.id ?? id;
    if (!String((table === "planning_staff" ? editData.name : editData.item) ?? "").trim()) {
      alert(table === "planning_staff" ? "Enter a staff name." : "Enter an item.");
      return;
    }
    const qty = table === "planning_staff" ? 0 : nonNegativeAmount(table === "planning_decor" ? editData.quantity : editData.quantity_num);
    const amount = nonNegativeAmount(table === "planning_staff" ? editData.pay_rate : (editData.unit_cost ?? editData.cost));
    if (qty === null || amount === null) { alert("Enter valid non-negative amounts."); return; }
    const totalCost = qty > 0 ? qty * amount : amount;
    setSaving("edit");
    try {
      if (table === "planning_decor") {
        const { error } = await supabase.from(table).update({ item: editData.item, decision: editData.decision, vendor: editData.vendor, cost: totalCost, quantity: qty, status: editData.status, notes: editData.notes }).eq("id", saveId);
        if (error) throw error;
        setDecor(prev => prev.map(i => i.id === saveId ? { ...i, ...editData, cost: totalCost } : i));
      } else if (table === "planning_refreshments") {
        const { error } = await supabase.from(table).update({ item: editData.item, vendor: editData.vendor, quantity: editData.quantity, quantity_num: qty, cost: totalCost, notes: editData.notes }).eq("id", saveId);
        if (error) throw error;
        setRefresh(prev => prev.map(i => i.id === saveId ? { ...i, ...editData, cost: totalCost } : i));
      } else if (table === "planning_staff") {
        const { error } = await supabase.from(table).update({ name: editData.name, role: editData.role, pay_rate: amount, phone: editData.phone, email: editData.email, instagram: editData.instagram, notes: editData.notes }).eq("id", saveId);
        if (error) throw error;
        setStaff(prev => prev.map(i => i.id === saveId ? { ...i, ...editData, pay_rate: amount } : i));
      }
      setEditing(null);
    } catch (error) {
      console.error("Failed to save changes:", error);
      alert("Could not save changes. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const deleteItem = async (table: string, id: number) => {
    if (saving) return;
    if (!confirm("Remove this item?")) return;
    setSaving("delete");
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      if (table === "planning_decor") setDecor(prev => prev.filter(i => i.id !== id));
      if (table === "planning_refreshments") setRefresh(prev => prev.filter(i => i.id !== id));
      if (table === "planning_staff") setStaff(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error("Failed to remove item:", error);
      alert("Could not remove the item. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const sendComment = async (itemName: string) => {
    if (saving) return;
    if (!newComment.trim()) return;
    setSaving("comment");
    try {
      const { data, error } = await supabase.from("item_comments").insert({
        event_slug: eventSlug,
        item_name: itemName,
        sender_email: userEmail,
        sender_name: userName || userEmail,
        message: newComment,
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The saved comment was not returned.");
      setComments(prev => [...prev, data]);
      setNewComment("");
    } catch (error) {
      console.error("Failed to send comment:", error);
      alert("Could not send the comment. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const updateBrandStatus = async (table: string, itemId: number, status: string) => {
    if (saving) return;
    setSaving("share");
    try {
      const { error } = await supabase.from(table).update({ brand_status: status }).eq("id", itemId);
      if (error) throw error;
      if (table === "planning_decor") setDecor(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
      if (table === "planning_refreshments") setRefresh(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
      if (table === "planning_staff") setStaff(prev => prev.map(i => i.id === itemId ? { ...i, brand_status: status } : i));
    } catch (error) {
      console.error("Failed to update brand status:", error);
      alert("Could not update sharing. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const uploadInvoice = async (file: File) => {
    if (saving) return;
    if (!file || !addingInvoice || !newInvoice.description.trim()) return;
    const amount = nonNegativeAmount(newInvoice.amount);
    if (amount === null) { alert("Enter a valid non-negative amount."); return; }
    setSaving("invoice");
    setUploadingInvoice(true);
    try {
      const uploaded = await uploadToCloudinary(file, `invoices/${eventSlug}`);
      const { data, error } = await supabase.from("item_invoices").insert({
        event_slug: eventSlug,
        item_name: addingInvoice.itemName,
        item_category: addingInvoice.category,
        description: newInvoice.description,
        amount,
        file_url: uploaded.url,
        file_name: file.name,
        status: "pending",
        uploaded_by: userEmail,
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The saved invoice was not returned.");
      setInvoices(prev => [data, ...prev]);
      setNewInvoice({ description: "", amount: "" });
      setAddingInvoice(null);
    } catch (error) {
      console.error("Failed to upload invoice:", error);
      alert("Could not upload the invoice. Please try again.");
    } finally {
      setUploadingInvoice(false);
      setSaving(null);
    }
  };

  const getItemInvoices = (itemName: string) => invoices.filter(inv => inv.item_name === itemName);

  const inp = (style?: any) => ({ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  ...style });
  const editInp = (style?: any) => ({ padding: "4px 7px", border: "1px solid #E8C97A", borderRadius: "6px", fontSize: "12px", ...style });

  const totalStaffCost = staff.reduce((s, m) => {
    const totalHours = (m.shifts || []).reduce((h, sh) => h + Number(sh.hours), 0);
    return s + (totalHours * Number(m.pay_rate));
  }, 0);
  const totalRefreshCost = refresh.reduce((s, x) => s + Number(x.cost), 0);
  const totalDecorCost = decor.reduce((s, x) => s + Number(x.cost), 0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const CommentThread = ({ itemName, table, itemId, currentStatus }: { itemName: string; table: string; itemId: number; currentStatus?: string }) => {
    const itemComments = comments.filter(c => c.item_name === itemName);
    const isActive = activeComment === itemName;
    return (
      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f0f4f1" }}>
        <div style={{ display: "flex", gap: "6px", marginBottom: "6px", flexWrap: "wrap" as const }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.72rem", color: "#4a5a52" }}>Share with brand</span>
            <div onClick={() => updateBrandStatus(table, itemId, currentStatus === "suggested" ? "pending" : "suggested")} style={{ width: "36px", height: "20px", borderRadius: "10px", background: currentStatus === "suggested" ? "#E8C97A" : "#e4ebe6", cursor: "pointer", position: "relative" as const, transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute" as const, top: "2px", left: currentStatus === "suggested" ? "18px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px #0003" }} />
            </div>
          </div>
          <button onClick={() => setActiveComment(isActive ? null : itemName)} style={{ fontSize: "0.7rem", padding: "3px 8px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52" }}>
            💬 {itemComments.length > 0 ? `${itemComments.length} comment${itemComments.length > 1 ? "s" : ""}` : "Add note"}
          </button>
        </div>
        {isActive && (
          <div style={{ background: "#f8faf8", borderRadius: "8px", padding: "8px", border: "1px solid #f0f4f1" }}>
            {itemComments.map(c => (
              <div key={c.id} style={{ marginBottom: "6px", padding: "6px 8px", background: "#fff", borderRadius: "6px", borderLeft: c.sender_email === userEmail ? "2px solid #E8C97A" : "2px solid #e4ebe6" }}>
                <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "2px" }}>{c.sender_name} · {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>{c.message}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <input placeholder="Add a note or question..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment(itemName)} style={{ flex: 1, padding: "5px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.78rem" }} autoFocus />
              <button onClick={() => sendComment(itemName)} style={{ padding: "5px 10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.75rem", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const InvoiceSection = ({ itemName, category }: { itemName: string; category: string }) => {
    const itemInvoices = getItemInvoices(itemName);
    const isActive = addingInvoice?.itemName === itemName;
    return (
      <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px solid #f0f4f1" }}>
        {itemInvoices.map(inv => (
          <div key={inv.id} style={{ background: "#f8faf8", borderRadius: "8px", padding: "8px 10px", marginBottom: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: inv.rejection_note ? "4px" : "0" }}>
              <span style={{ padding: "1px 6px", borderRadius: "10px", background: inv.status === "approved" ? "#4a7c5922" : inv.status === "rejected" ? "#c0392b22" : "#f0f4f1", color: inv.status === "approved" ? "#4a7c59" : inv.status === "rejected" ? "#c0392b" : "#4a5a52", fontSize: "0.68rem", flexShrink: 0 }}>
                {inv.status === "approved" ? "Approved" : inv.status === "rejected" ? "Rejected" : "Pending approval"}
              </span>
              <span style={{ color: "#1B3A2D", flex: 1, fontSize: "0.82rem" }}>{inv.description}</span>
              <span style={{ color: "#E8C97A", fontWeight: 500, fontSize: "0.85rem" }}>{formatCurrency(Number(inv.amount))}</span>
              <a href={inv.file_url} download target="_blank" rel="noopener noreferrer" style={{ color: "#fff", fontSize: "0.72rem", textDecoration: "none", background: "#1B3A2D", padding: "3px 8px", borderRadius: "4px" }}>↓</a>
            </div>
            {inv.rejection_note && <div style={{ fontSize: "0.72rem", color: "#c0392b", marginTop: "4px" }}>Rejected: {inv.rejection_note}</div>}
          </div>
        ))}

        {isActive ? (
          <div style={{ marginTop: "8px", background: "#f8faf8", borderRadius: "10px", padding: "1rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.8rem", color: "#1B3A2D", marginBottom: "10px", fontWeight: 500 }}>Add invoice for {itemName}</div>
            <input
              key={`desc-${addingInvoice?.itemName}`}
              placeholder="Description e.g. Venue deposit invoice"
              defaultValue={newInvoice.description}
              onBlur={e => setNewInvoice(prev => ({...prev, description: e.target.value}))}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem",  marginBottom: "8px", boxSizing: "border-box" as const }}
            />
            <input
              key={`amount-${addingInvoice?.itemName}`}
              placeholder="Amount e.g. 5250"
              defaultValue={newInvoice.amount}
              onBlur={e => setNewInvoice(prev => ({...prev, amount: e.target.value}))}
              style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem",  marginBottom: "8px", boxSizing: "border-box" as const }}
            />
            <div
              onClick={() => document.getElementById(`file-upload-${itemName.replace(/\s/g, "-")}`)?.click()}
              style={{ border: "2px dashed #e4ebe6", borderRadius: "8px", padding: "12px", textAlign: "center" as const, cursor: "pointer", marginBottom: "8px", background: selectedFile ? "#f0faf0" : "#fff" }}
            >
              <input
                id={`file-upload-${itemName.replace(/\s/g, "-")}`}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              />
              {selectedFile ? (
                <div style={{ fontSize: "0.82rem", color: "#4a7c59" }}>✓ {selectedFile.name}</div>
              ) : (
                <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Click to select invoice file (PDF or image)</div>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => { if (selectedFile) { uploadInvoice(selectedFile); setSelectedFile(null); } }}
                disabled={uploadingInvoice || !newInvoice.description.trim() || !selectedFile}
                style={{ padding: "8px 16px", background: selectedFile && newInvoice.description ? "#1B3A2D" : "#d4c5b0", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: selectedFile && newInvoice.description ? "pointer" : "not-allowed" }}
              >
                {uploadingInvoice ? "Uploading..." : "Upload invoice"}
              </button>
              <button onClick={() => { setAddingInvoice(null); setSelectedFile(null); setNewInvoice({ description: "", amount: "" }); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setAddingInvoice({ type: "invoice", itemName, category }); setNewInvoice({ description: "", amount: "" }); setSelectedFile(null); }} style={{ marginTop: "6px", fontSize: "0.78rem", padding: "4px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52" }}>+ Add invoice</button>
        )}
      </div>
    );
  };

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8" style={{ minHeight: "100vh", background: "#f8faf8" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <LoadingView loading={loading || !eventSlug} error={loadError} onRetry={() => setRetry(v => v + 1)} customLoader={<PlanningSkeleton />}>
        <fieldset disabled={saving !== null} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/organizer/planner/${eventSlug}?tab=planning`} style={{ fontSize: "0.85rem", color: "#4a5a52", textDecoration: "none" }}>← Back to planner</Link>
          <h1 style={{ fontSize: "1.8rem", color: "#1B3A2D", fontWeight: "normal", marginTop: "0.5rem" }}>Planning Hub</h1>
          <p style={{ color: "#4a5a52", fontSize: "0.9rem" }}>Decor, refreshments and staffing for this event</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: "12px", marginBottom: "1.5rem" }}>
          {[
            { label: "DECOR BUDGET", value: formatCurrency(totalDecorCost), color: "#E8C97A" },
            { label: "REFRESHMENTS", value: formatCurrency(totalRefreshCost), color: "#4a7c59" },
            { label: "STAFFING COST", value: formatCurrency(totalStaffCost), color: "#5b7fa6" },
          ].map((c, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e4ebe6", minWidth: 0 }}>
              <div style={{ fontSize: "0.7rem", color: "#4a5a52", marginBottom: "4px" }}>{c.label}</div>
              <div style={{ fontSize: "1.3rem", color: c.color, overflowWrap: "anywhere" }}>{c.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "1.5rem" }}>
          {(["decor", "refreshments", "staff"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setAdding(false); setEditing(null); }} style={{ padding: "8px 20px", background: tab === t ? "#1B3A2D" : "#fff", color: tab === t ? "#fff" : "#4a5a52", border: "1px solid " + (tab === t ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.85rem", cursor: "pointer",  textTransform: "capitalize" as const }}>{t}</button>
          ))}
          <button onClick={() => setAdding(!adding)} style={{ marginLeft: "auto", padding: "8px 16px", background: "#E8C97A", color: "#fff", border: "none", borderRadius: "20px", fontSize: "0.85rem", cursor: "pointer" }}>+ Add</button>
        </div>

        {tab === "decor" && (
          <div>
            {adding && (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e4ebe6" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr_1fr] [&>*]:min-w-0" style={{ gap: "8px", marginBottom: "8px" }}>
                  <select value={newDecor.category} onChange={e => setNewDecor({...newDecor, category: e.target.value})} style={inp()}>
                    {DECOR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <input placeholder="Item" value={newDecor.item} onChange={e => setNewDecor({...newDecor, item: e.target.value})} style={inp()} />
                  <input placeholder="Qty" value={newDecor.quantity} onChange={e => setNewDecor({...newDecor, quantity: e.target.value})} style={inp()} />
                  <input placeholder="Unit cost $" value={newDecor.cost} onChange={e => setNewDecor({...newDecor, cost: e.target.value})} style={inp()} />
                  <div style={{ display: "flex", alignItems: "center", padding: "7px 10px", background: "#f8faf8", borderRadius: "8px", fontSize: "0.82rem", color: "#E8C97A", border: "1px solid #e4ebe6" }}>
                    = {formatCurrency((parseFloat(newDecor.quantity) || 0) * (parseFloat(newDecor.cost) || 0))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_2fr] [&>*]:min-w-0" style={{ gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Vendor" value={newDecor.vendor} onChange={e => setNewDecor({...newDecor, vendor: e.target.value})} style={inp()} />
                  <select value={newDecor.status} onChange={e => setNewDecor({...newDecor, status: e.target.value})} style={inp()}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input placeholder="Notes" value={newDecor.notes} onChange={e => setNewDecor({...newDecor, notes: e.target.value})} style={inp()} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addDecor} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>{saving === "add" ? "Saving..." : "Save"}</button>
                  <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
            {DECOR_CATEGORIES.map(cat => {
              const items = decor.filter(d => d.category === cat);
              if (!items.length) return null;
              return (
                <div key={cat} style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "8px" }}>{cat.toUpperCase()}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))", gap: "10px" }}>
                    {items.map(item => (
                      <div key={item.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                          <div style={{ fontSize: "0.9rem", color: "#1B3A2D", fontWeight: 500, minWidth: 0, overflowWrap: "anywhere" }}>
                            {editing === item.id ? <input value={editData.item || ""} onChange={e => setEditData({...editData, item: e.target.value})} style={editInp({ width: "100%", minWidth: 0, boxSizing: "border-box" })} /> : item.item}
                          </div>
                          {editing === item.id ? (
                            <select value={editData.status || ""} onChange={e => setEditData({...editData, status: e.target.value})} style={editInp()}>
                              {STATUSES.map(s => <option key={s}>{s}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: statusColors[item.status]?.bg, color: statusColors[item.status]?.color }}>{item.status}</span>
                          )}
                        </div>
                        {editing === item.id ? (
                          <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                            <div className="grid grid-cols-1 min-[400px]:grid-cols-3 [&>*]:min-w-0" style={{ gap: "4px" }}>
                              <input placeholder="Qty" value={editData.quantity || ""} onChange={e => setEditData({...editData, quantity: e.target.value})} style={editInp()} />
                              <input placeholder="Unit cost" value={editData.unit_cost || ""} onChange={e => setEditData({...editData, unit_cost: e.target.value})} style={editInp()} />
                              <div style={{ padding: "4px 7px", background: "#f8faf8", borderRadius: "6px", fontSize: "12px", color: "#E8C97A" }}>
                                = {formatCurrency((parseFloat(editData.quantity) || 0) * (parseFloat(editData.unit_cost) || 0))}
                              </div>
                            </div>
                            <input placeholder="Decision" value={editData.decision || ""} onChange={e => setEditData({...editData, decision: e.target.value})} style={editInp({ width: "100%" })} />
                            <input placeholder="Vendor" value={editData.vendor || ""} onChange={e => setEditData({...editData, vendor: e.target.value})} style={editInp({ width: "100%" })} />
                            <input placeholder="Notes" value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} style={editInp({ width: "100%" })} />
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => saveEdit("planning_decor", item.id)} style={{ padding: "4px 10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>{saving === "edit" ? "Saving..." : "Save"}</button>
                              <button onClick={() => setEditing(null)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                              <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                                {item.vendor && <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>{item.vendor}{item.quantity > 0 ? ` · Qty ${formatNumber(item.quantity)}` : ""}</div>}
                                {item.decision && item.decision !== "TBD" && <div style={{ fontSize: "0.75rem", color: "#5a4a3a", marginTop: "3px", lineHeight: 1.4 }}>{item.decision}</div>}
                                {item.notes && <div style={{ fontSize: "0.7rem", color: "#aaa", marginTop: "2px", fontStyle: "italic" }}>{item.notes}</div>}
                              </div>
                              <div style={{ fontSize: "0.95rem", color: "#E8C97A", fontWeight: 500, flexShrink: 0, marginLeft: "8px" }}>{formatCurrency(Number(item.cost))}</div>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid #f5f2ee" }}>
                              <button onClick={() => { setEditing(item.id); setEditData({...item, unit_cost: item.quantity > 0 ? (item.cost / item.quantity).toFixed(2) : item.cost}); }} title="Edit" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#4a5a52", fontSize: "14px", padding: "2px" }} onMouseEnter={e => (e.currentTarget.style.color = "#1B3A2D")} onMouseLeave={e => (e.currentTarget.style.color = "#4a5a52")}>✎</button>
                              <button onClick={() => deleteItem("planning_decor", item.id)} title="Remove" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "13px", padding: "2px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                              <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
                                {item.brand_status === "approved" && <span style={{ fontSize: "0.68rem", color: "#4a7c59" }}>✓ Approved</span>}
                                {item.brand_status === "rejected" && <span style={{ fontSize: "0.68rem", color: "#c0392b" }}>✕ Declined</span>}
                                <CommentThread itemName={item.item} table="planning_decor" itemId={item.id} currentStatus={item.brand_status} />
                              </div>
                            </div>
                            <InvoiceSection itemName={item.item} category={cat} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "refreshments" && (
          <div>
            {adding && (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e4ebe6" }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_1fr_1fr] [&>*]:min-w-0" style={{ gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Item" value={newRefresh.item} onChange={e => setNewRefresh({...newRefresh, item: e.target.value})} style={inp()} />
                  <input placeholder="Vendor" value={newRefresh.vendor} onChange={e => setNewRefresh({...newRefresh, vendor: e.target.value})} style={inp()} />
                  <input placeholder="Qty" value={newRefresh.quantity_num} onChange={e => setNewRefresh({...newRefresh, quantity_num: e.target.value})} style={inp()} />
                  <input placeholder="Unit cost $" value={newRefresh.cost} onChange={e => setNewRefresh({...newRefresh, cost: e.target.value})} style={inp()} />
                  <div style={{ display: "flex", alignItems: "center", padding: "7px 10px", background: "#f8faf8", borderRadius: "8px", fontSize: "0.82rem", color: "#4a7c59", border: "1px solid #e4ebe6" }}>
                    = {formatCurrency((parseFloat(newRefresh.quantity_num) || 0) * (parseFloat(newRefresh.cost) || 0))}
                  </div>
                </div>
                <input placeholder="Notes" value={newRefresh.notes} onChange={e => setNewRefresh({...newRefresh, notes: e.target.value})} style={inp({ width: "100%", marginBottom: "8px", boxSizing: "border-box" })} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addRefresh} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>{saving === "add" ? "Saving..." : "Save"}</button>
                  <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e4ebe6", overflow: "hidden" }}>
              {refresh.length === 0 && <p style={{ padding: "1rem", fontSize: "0.85rem", color: "#4a5a52" }}>No refreshments added yet.</p>}
              {refresh.map((item, i) => (
                <div key={item.id} style={{ padding: "12px 16px", borderBottom: i < refresh.length - 1 ? "1px solid #f0f4f1" : "none" }}>
                  {editing === item.id ? (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" as const }}>
                      <input value={editData.item || ""} onChange={e => setEditData({...editData, item: e.target.value})} style={editInp({ flex: "2 1 120px", minWidth: 0 })} />
                      <input value={editData.vendor || ""} onChange={e => setEditData({...editData, vendor: e.target.value})} placeholder="Vendor" style={editInp({ flex: "1 1 100px", minWidth: 0 })} />
                      <input value={editData.quantity_num || ""} onChange={e => setEditData({...editData, quantity_num: e.target.value})} placeholder="Qty" style={editInp({ flex: "0 1 60px", minWidth: 0 })} />
                      <input value={editData.unit_cost || ""} onChange={e => setEditData({...editData, unit_cost: e.target.value})} placeholder="Unit $" style={editInp({ flex: "0 1 70px", minWidth: 0 })} />
                      <input value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} placeholder="Notes" style={editInp({ flex: "1 1 100px", minWidth: 0 })} />
                      <button onClick={() => saveEdit("planning_refreshments", item.id)} style={{ padding: "3px 8px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>{saving === "edit" ? "Saving..." : "Save"}</button>
                      <button onClick={() => setEditing(null)} style={{ padding: "3px 8px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                        <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                          <div style={{ fontSize: "0.9rem", color: "#1B3A2D" }}>{item.item}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: "2px" }}>
                            {item.vendor && item.vendor !== "TBD" && <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>Vendor: {item.vendor}</span>}
                            {item.quantity_num > 0 && <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>Qty: {formatNumber(item.quantity_num)}</span>}
                            {item.cost > 0 && <span style={{ fontSize: "0.85rem", color: "#4a7c59", fontWeight: 500 }}>{formatCurrency(Number(item.cost))}</span>}
                            {item.notes && <span style={{ fontSize: "0.75rem", color: "#aaa", fontStyle: "italic" }}>{item.notes}</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => { setEditing(item.id); setEditData({...item, unit_cost: item.quantity_num > 0 ? (item.cost / item.quantity_num).toFixed(2) : item.cost}); }} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52" }}>Edit</button>
                          <button onClick={() => deleteItem("planning_refreshments", item.id)} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #f0f4f1", borderRadius: "6px", cursor: "pointer", color: "#c0392b" }}>Remove</button>
                        </div>
                      </div>
                      <InvoiceSection itemName={item.item} category="Refreshments" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "staff" && (
          <div>
            {adding && (
              <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e4ebe6" }}>
                <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] [&>*]:min-w-0" style={{ gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Full name" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} style={inp()} />
                  <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} style={inp()}>
                    {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                  <input placeholder="Pay rate $/hr" value={newStaff.pay_rate} onChange={e => setNewStaff({...newStaff, pay_rate: e.target.value})} style={inp()} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 [&>*]:min-w-0" style={{ gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Phone" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} style={inp()} />
                  <input placeholder="Email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} style={inp()} />
                  <input placeholder="Instagram @" value={newStaff.instagram} onChange={e => setNewStaff({...newStaff, instagram: e.target.value})} style={inp()} />
                </div>
                <input placeholder="Notes" value={newStaff.notes} onChange={e => setNewStaff({...newStaff, notes: e.target.value})} style={inp({ width: "100%", marginBottom: "8px", boxSizing: "border-box" })} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addStaff} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>{saving === "add" ? "Saving..." : "Save"}</button>
                  <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: "10px" }}>
              {staff.length === 0 && <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>No staff added yet.</p>}
              {staff.map(member => {
                const totalHours = (member.shifts || []).reduce((h, s) => h + Number(s.hours), 0);
                const totalPay = totalHours * Number(member.pay_rate);
                return (
                  <div key={member.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e4ebe6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "10px" }}>
                      <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        {editing === member.id ? <input value={editData.name || ""} onChange={e => setEditData({...editData, name: e.target.value})} style={editInp({ width: "100%", minWidth: 0, boxSizing: "border-box", marginBottom: "4px" })} /> : <div style={{ fontSize: "1rem", color: "#1B3A2D", fontWeight: 500 }}>{member.name}</div>}
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: (roleColors[member.role] || "#E8C97A") + "22", color: roleColors[member.role] || "#E8C97A" }}>{member.role}</span>
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", flexShrink: 0 }}>
                        <div style={{ textAlign: "right" as const }}>
                          <div style={{ fontSize: "0.85rem", color: "#4a5a52" }}>{formatCurrency(Number(member.pay_rate))}/hr</div>
                          {totalHours > 0 && <div style={{ fontSize: "1rem", color: "#E8C97A", fontWeight: 500 }}>{formatCurrency(totalPay)}</div>}
                          {totalHours > 0 && <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>{formatNumber(totalHours)}hrs total</div>}
                        </div>
                        <div style={{ position: "relative" as const }}>
                          <button onClick={() => setStaffMenu(staffMenu === member.id ? null : member.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#4a5a52", fontSize: "18px", padding: "0 4px", lineHeight: 1 }}>⋯</button>
                          {staffMenu === member.id && (
                            <div style={{ position: "absolute" as const, right: 0, top: "28px", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 20px #00000015", border: "1px solid #e4ebe6", zIndex: 10, minWidth: "160px" }}>
                              <button onClick={() => { setEditing(member.id); setEditData({...member}); setStaffMenu(null); }} style={{ display: "block", width: "100%", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontSize: "0.82rem", color: "#1c1714" }}>✎ Edit</button>
                              <button onClick={() => { setAddingShift(member.id); setNewShift({ shift_date: "", start_time: "", end_time: "" }); setStaffMenu(null); }} style={{ display: "block", width: "100%", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontSize: "0.82rem", color: "#1c1714" }}>+ Add shift</button>
                              <button onClick={() => duplicateStaff(member)} style={{ display: "block", width: "100%", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontSize: "0.82rem", color: "#1c1714" }}>⧉ Duplicate</button>
                              <button onClick={() => { updateBrandStatus("planning_staff", member.id, member.brand_status === "suggested" ? "pending" : "suggested"); setStaffMenu(null); }} style={{ display: "block", width: "100%", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontSize: "0.82rem", color: "#1c1714" }}>{member.brand_status === "suggested" ? "↩ Unshare" : "↑ Share with brand"}</button>
                              <button onClick={() => { deleteItem("planning_staff", member.id); setStaffMenu(null); }} style={{ display: "block", width: "100%", padding: "8px 14px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontSize: "0.82rem", color: "#c0392b",  borderTop: "1px solid #f0f4f1" }}>✕ Remove</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {editing === member.id ? (
                      <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                        <select value={editData.role || ""} onChange={e => setEditData({...editData, role: e.target.value})} style={editInp({ width: "100%" })}>
                          {STAFF_ROLES.map(r => <option key={r}>{r}</option>)}
                        </select>
                        <input placeholder="Pay rate $/hr" value={editData.pay_rate || ""} onChange={e => setEditData({...editData, pay_rate: e.target.value})} style={editInp({ width: "100%" })} />
                        <input placeholder="Phone" value={editData.phone || ""} onChange={e => setEditData({...editData, phone: e.target.value})} style={editInp({ width: "100%" })} />
                        <input placeholder="Email" value={editData.email || ""} onChange={e => setEditData({...editData, email: e.target.value})} style={editInp({ width: "100%" })} />
                        <input placeholder="Notes" value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} style={editInp({ width: "100%" })} />
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => saveEdit("planning_staff", member.id)} style={{ padding: "4px 10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>{saving === "edit" ? "Saving..." : "Save"}</button>
                          <button onClick={() => setEditing(null)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {member.phone && <div style={{ fontSize: "0.78rem", color: "#4a5a52", marginBottom: "2px" }}>📞 {member.phone}</div>}
                        {member.email && <div style={{ fontSize: "0.78rem", color: "#4a5a52", marginBottom: "2px" }}>✉️ {member.email}</div>}
                        {member.notes && <div style={{ fontSize: "0.75rem", color: "#aaa", fontStyle: "italic", marginTop: "4px" }}>{member.notes}</div>}
                        <div style={{ marginTop: "10px", borderTop: "1px solid #f0f4f1", paddingTop: "10px" }}>
                          <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.05em", marginBottom: "6px" }}>SHIFTS</div>
                          {(member.shifts || []).map(shift => (
                            <div key={shift.id} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "2px 8px", padding: "4px 0", borderBottom: "1px solid #f8f5f0", fontSize: "0.8rem" }}>
                              <div style={{ color: "#1B3A2D" }}>{shift.shift_date && shift.shift_date.includes("-") ? new Date(shift.shift_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : shift.shift_date}</div>
                              <div style={{ color: "#4a5a52" }}>{shift.start_time} – {shift.end_time}</div>
                              <div style={{ color: "#E8C97A" }}>{formatNumber(Number(shift.hours))}hrs</div>
                              <button onClick={() => deleteShift(member.id, shift.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px" }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
                            </div>
                          ))}
                          {addingShift === member.id ? (
                            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                              <input type="date" value={newShift.shift_date} onChange={e => setNewShift({...newShift, shift_date: e.target.value})} style={editInp({ width: "100%" })} />
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                                <input placeholder="Start e.g. 10am" value={newShift.start_time} onChange={e => setNewShift({...newShift, start_time: e.target.value})} style={editInp()} />
                                <input placeholder="End e.g. 6pm" value={newShift.end_time} onChange={e => setNewShift({...newShift, end_time: e.target.value})} style={editInp()} />
                              </div>
                              {newShift.start_time && newShift.end_time && (
                                <div style={{ fontSize: "11px", color: "#E8C97A" }}>= {calcHours(newShift.start_time, newShift.end_time)} hrs · {formatCurrency(calcHours(newShift.start_time, newShift.end_time) * Number(member.pay_rate))}</div>
                              )}
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button onClick={() => addShift(member.id)} style={{ padding: "4px 10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>{saving === "shift" ? "Saving..." : "Add shift"}</button>
                                <button onClick={() => setAddingShift(null)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setAddingShift(member.id); setNewShift({ shift_date: "", start_time: "", end_time: "" }); }} style={{ marginTop: "6px", fontSize: "11px", padding: "3px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52" }}>+ Add shift</button>
                          )}
                        </div>
                        <CommentThread itemName={member.name} table="planning_staff" itemId={member.id} currentStatus={member.brand_status} />
                        <InvoiceSection itemName={member.name} category="Staff" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        </fieldset>
        </LoadingView>
      </div>
    </div>
  );
}
