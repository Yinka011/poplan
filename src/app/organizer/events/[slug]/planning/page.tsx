/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useOrganizer } from "@/context/OrganizerContext";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatEventName } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import Link from "next/link";
import PlanningSkeleton from "./PlanningSkeleton";

type DecorItem = {
  id: number;
  category: string;
  item: string;
  decision: string;
  vendor: string;
  cost: number;
  quantity: number;
  status: string;
  notes: string;
};
type RefreshItem = {
  id: number;
  item: string;
  vendor: string;
  quantity: string;
  quantity_num: number;
  cost: number;
  notes: string;
};
type StaffItem = {
  id: number;
  name: string;
  role: string;
  hours: string;
  pay_rate: number;
  phone: string;
  email: string;
  instagram: string;
  notes: string;
  shifts?: StaffShift[];
};
type StaffShift = {
  id: number;
  staff_id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  hours: number;
};

const DECOR_CATEGORIES = [
  "Theme",
  "Furniture",
  "Florals",
  "Lighting",
  "Signage",
  "Props",
];
const STAFF_ROLES = [
  "Cashier",
  "Stylist",
  "Runner",
  "Check-in",
  "Security",
  "Inventory",
  "Brand liaison",
  "Photographer",
];
const STATUSES = ["Pending", "In Progress", "Confirmed", "Cancelled"];

const statusColors: Record<string, { bg: string; color: string }> = {
  Confirmed: { bg: "#4a7c5922", color: "#4a7c59" },
  "In Progress": { bg: "#E8C97A22", color: "#E8C97A" },
  Pending: { bg: "#4a5a5222", color: "#4a5a52" },
  Cancelled: { bg: "#c0392b22", color: "#c0392b" },
};

const roleColors: Record<string, string> = {
  Cashier: "#E8C97A",
  Stylist: "#4a7c59",
  Runner: "#5b7fa6",
  "Check-in": "#8b6ab0",
  Security: "#c0392b",
  Inventory: "#2c7873",
  "Brand liaison": "#a0522d",
  Photographer: "#6b8e23",
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

function nonNegativeAmount(
  value: string | number | null | undefined,
): number | null {
  const parsed =
    value == null || String(value).trim() === "" ? 0 : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export default function PlanningHub() {
  const { organizerEmail, loading: organizerLoading } = useOrganizer();
  const params = useParams();
  const slug = params.slug as string;
  const fallbackEventName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const [eventName, setEventName] = useState(fallbackEventName);
  const [tab, setTab] = useState<"decor" | "refreshments" | "staff">("decor");
  const [decor, setDecor] = useState<DecorItem[]>([]);
  const [refresh, setRefresh] = useState<RefreshItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [staffHours, setStaffHours] = useState<any[]>([]);
  const [eventStaff, setEventStaff] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [addingShift, setAddingShift] = useState<number | null>(null);
  const [newShift, setNewShift] = useState({
    shift_date: "",
    start_time: "",
    end_time: "",
  });
  const [eventDays] = useState<string[]>([]);
  const [eventCity, setEventCity] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState<"add" | "edit" | "shift" | null>(null);
  const loadKey = `${slug}:${organizerEmail}`;
  const [newDecor, setNewDecor] = useState({
    category: "Theme",
    item: "",
    decision: "",
    vendor: "",
    cost: "",
    quantity: "",
    status: "Pending",
    notes: "",
  });
  const [newRefresh, setNewRefresh] = useState({
    item: "",
    vendor: "",
    quantity: "",
    quantity_num: "",
    cost: "",
    notes: "",
  });
  const [newStaff, setNewStaff] = useState({
    name: "",
    role: "Cashier",
    pay_rate: "",
    phone: "",
    email: "",
    instagram: "",
    notes: "",
  });

  useEffect(() => {
    if (organizerLoading) return;
    let active = true;
    const fetchAll = async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (!organizerEmail)
          throw new Error("Please sign in to view planning.");
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("name, city")
          .eq("slug", slug)
          .maybeSingle();
        if (eventError) throw eventError;
        const resolvedCity = eventData?.city;
        if (!resolvedCity) throw new Error("Event not found.");
        const [d, r, s, sh, hours, es] = await Promise.all([
          supabase
            .from("planning_decor")
            .select("*")
            .eq("event", formatEventName(slug))
            .order("category"),
          supabase
            .from("planning_refreshments")
            .select("*")
            .eq("event", formatEventName(slug)),
          supabase
            .from("planning_staff")
            .select("*")
            .eq("event", formatEventName(slug)),
          supabase
            .from("planning_staff_shifts")
            .select("*")
            .eq("event", formatEventName(slug)),
          supabase
            .from("staff_hours")
            .select("*")
            .eq("event", formatEventName(slug))
            .order("work_date", { ascending: false }),
          supabase
            .from("event_staff")
            .select("*")
            .eq("event", formatEventName(slug)),
        ]);
        const error =
          d.error || r.error || s.error || sh.error || hours.error || es.error;
        if (error) throw error;
        if (!active) return;
        setEventCity(resolvedCity);
        setEventName(eventData?.name || resolvedCity || fallbackEventName);
        setDecor(d.data ?? []);
        setRefresh(r.data ?? []);
        setStaffHours(hours.data ?? []);
        setEventStaff(es.data ?? []);
        const shifts = sh.data ?? [];
        const staffWithShifts = (s.data ?? []).map((member) => ({
          ...member,
          shifts: shifts.filter(
            (shift: StaffShift) => shift.staff_id === member.id,
          ),
        }));
        setStaff(staffWithShifts);
        setLoadedFor(loadKey);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load planning:", error);
        setLoadError(
          error instanceof Error &&
            (error.message === "Please sign in to view planning." ||
              error.message === "Event not found.")
            ? error.message
            : "Could not load planning. Please try again.",
        );
        setLoadedFor(loadKey);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchAll();
    return () => {
      active = false;
    };
  }, [slug, organizerEmail, organizerLoading, loadKey, retry, fallbackEventName]);

  const addDecor = async () => {
    if (saving) return;
    if (!newDecor.item.trim()) {
      alert("Enter an item.");
      return;
    }
    const qty = nonNegativeAmount(newDecor.quantity);
    const unitCost = nonNegativeAmount(newDecor.cost);
    if (qty === null || unitCost === null) {
      alert("Enter valid non-negative amounts.");
      return;
    }
    const totalCost = qty > 0 ? qty * unitCost : unitCost;
    setSaving("add");
    try {
      const { data, error } = await supabase
        .from("planning_decor")
        .insert({
          organizer_email: organizerEmail,
          ...newDecor,
          cost: totalCost,
          quantity: qty,
          event: formatEventName(slug),
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("The saved decor item was not returned.");
      setDecor((prev) => [...prev, data]);
      setNewDecor({
        category: "Theme",
        item: "",
        decision: "",
        vendor: "",
        cost: "",
        quantity: "",
        status: "Pending",
        notes: "",
      });
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
    if (!newRefresh.item.trim()) {
      alert("Enter an item.");
      return;
    }
    const qty = nonNegativeAmount(newRefresh.quantity_num);
    const unitCost = nonNegativeAmount(newRefresh.cost);
    if (qty === null || unitCost === null) {
      alert("Enter valid non-negative amounts.");
      return;
    }
    const totalCost = qty > 0 ? qty * unitCost : unitCost;
    setSaving("add");
    try {
      const { data, error } = await supabase
        .from("planning_refreshments")
        .insert({
          organizer_email: organizerEmail,
          item: newRefresh.item,
          vendor: newRefresh.vendor,
          quantity: newRefresh.quantity,
          quantity_num: qty,
          cost: totalCost,
          notes: newRefresh.notes,
          event: formatEventName(slug),
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("The saved refreshment was not returned.");
      setRefresh((prev) => [...prev, data]);
      setNewRefresh({
        item: "",
        vendor: "",
        quantity: "",
        quantity_num: "",
        cost: "",
        notes: "",
      });
      setAdding(false);
    } catch (error) {
      console.error("Failed to add refreshments:", error);
      alert("Could not add refreshments. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const approveHours = async (hourId: number) => {
    await supabase
      .from("staff_hours")
      .update({ approved: true })
      .eq("id", hourId);
    setStaffHours((prev) =>
      prev.map((h) => (h.id === hourId ? { ...h, approved: true } : h)),
    );
  };

  const inviteStaff = async (
    staffEmail: string,
    staffRole: string,
    staffName: string,
  ) => {
    if (!staffEmail) return;
    const token =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Delete existing record if any, then insert fresh
    await supabase
      .from("event_staff")
      .delete()
      .eq("staff_email", staffEmail)
      .eq("event", formatEventName(slug));
    const { error } = await supabase.from("event_staff").insert({
      organizer_email: organizerEmail,
      event: formatEventName(slug),
      staff_email: staffEmail,
      name: staffName || "",
      role: staffRole,
      hourly_rate: 0,
      invite_token: token,
      joined: false,
    });
    if (error) {
      console.error("Staff invite error:", error);
      alert("Failed to save invite: " + error.message);
      return;
    }
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: staffEmail,
        subject: `You have been invited to join the ${slug} event staff`,
        html: `<div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:2rem">
          <h2 style="color:#1B3A2D">You are on the team!</h2>
          <p style="color:#4a5a52">You have been invited as <strong>${staffRole}</strong> for the <strong>${formatEventName(slug)}</strong> pop-up event.</p>
          <p style="color:#4a5a52">Click below to set up your staff profile and start logging your hours.</p>
          <a href="https://nalpop.com/staff?token=${token}" style="display:inline-block;padding:12px 24px;background:#1B3A2D;color:#fff;text-decoration:none;border-radius:8px;margin:1rem 0">Set up my profile</a>
          <p style="color:#4a5a52;font-size:0.85rem">If the button does not work, copy this link: https://nalpop.com/staff?token=${token}</p>
        </div>`,
      }),
    });
    alert("Invite sent to " + staffEmail);
  };

  const addStaff = async () => {
    if (saving) return;
    if (!newStaff.name.trim()) {
      alert("Enter a staff name.");
      return;
    }
    const payRate = nonNegativeAmount(newStaff.pay_rate);
    if (payRate === null) {
      alert("Enter a valid non-negative pay rate.");
      return;
    }
    setSaving("add");
    try {
      const { data, error } = await supabase
        .from("planning_staff")
        .insert({
          organizer_email: organizerEmail,
          name: newStaff.name,
          role: newStaff.role,
          pay_rate: payRate,
          phone: newStaff.phone,
          email: newStaff.email,
          instagram: newStaff.instagram,
          notes: newStaff.notes,
          event: formatEventName(slug),
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("The saved staff member was not returned.");
      setStaff((prev) => [...prev, { ...data, shifts: [] }]);
      setNewStaff({
        name: "",
        role: "Cashier",
        pay_rate: "",
        phone: "",
        email: "",
        instagram: "",
        notes: "",
      });
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
    if (!newShift.start_time || !newShift.end_time) {
      alert("Enter a start and end time.");
      return;
    }
    const hours = calcHours(newShift.start_time, newShift.end_time);
    if (hours <= 0) {
      alert("Enter a valid start and end time, with the end after the start.");
      return;
    }
    setSaving("shift");
    try {
      const { data, error } = await supabase
        .from("planning_staff_shifts")
        .insert({
          organizer_email: organizerEmail,
          staff_id: staffId,
          event: formatEventName(slug),
          shift_date: newShift.shift_date,
          start_time: newShift.start_time,
          end_time: newShift.end_time,
          hours,
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("The saved shift was not returned.");
      {
        setStaff((prev) =>
          prev.map((m) =>
            m.id === staffId
              ? { ...m, shifts: [...(m.shifts || []), data] }
              : m,
          ),
        );
      }
      setNewShift({
        shift_date: eventDays[0] || "",
        start_time: "",
        end_time: "",
      });
      setAddingShift(null);
    } catch (error) {
      console.error("Failed to add shift:", error);
      alert("Could not add shift. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const deleteShift = async (staffId: number, shiftId: number) => {
    await supabase.from("planning_staff_shifts").delete().eq("id", shiftId);
    setStaff((prev) =>
      prev.map((m) =>
        m.id === staffId
          ? { ...m, shifts: (m.shifts || []).filter((s) => s.id !== shiftId) }
          : m,
      ),
    );
  };

  const saveEdit = async (
    table: "planning_decor" | "planning_refreshments" | "planning_staff",
    id: number,
  ) => {
    if (saving) return;
    if (!(table === "planning_staff" ? editData.name : editData.item)?.trim()) {
      alert(
        table === "planning_staff" ? "Enter a staff name." : "Enter an item.",
      );
      return;
    }
    const qty =
      table === "planning_staff"
        ? 0
        : nonNegativeAmount(
            table === "planning_decor"
              ? editData.quantity
              : editData.quantity_num,
          );
    const amount = nonNegativeAmount(
      table === "planning_staff" ? editData.pay_rate : editData.unit_cost,
    );
    if (qty === null || amount === null) {
      alert("Enter valid non-negative amounts.");
      return;
    }
    const saveId = id;
    setSaving("edit");
    try {
      if (table === "planning_decor") {
        const unitCost = amount;
        const totalCost = qty > 0 ? qty * unitCost : unitCost;
        const { data, error } = await supabase
          .from(table)
          .update({
            item: editData.item,
            decision: editData.decision,
            vendor: editData.vendor,
            cost: totalCost,
            quantity: qty,
            status: editData.status,
            notes: editData.notes,
          })
          .eq("id", saveId)
          .eq("event", formatEventName(slug))
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error("The updated decor item was not returned.");
        setDecor((prev) => prev.map((i) => (i.id === saveId ? data : i)));
      } else if (table === "planning_refreshments") {
        const unitCost = amount;
        const totalCost = qty > 0 ? qty * unitCost : unitCost;
        const { data, error } = await supabase
          .from(table)
          .update({
            item: editData.item,
            vendor: editData.vendor,
            quantity: editData.quantity,
            quantity_num: qty,
            cost: totalCost,
            notes: editData.notes,
          })
          .eq("id", saveId)
          .eq("event", formatEventName(slug))
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error("The updated refreshment was not returned.");
        setRefresh((prev) => prev.map((i) => (i.id === saveId ? data : i)));
      } else if (table === "planning_staff") {
        const { data, error } = await supabase
          .from(table)
          .update({
            name: editData.name,
            role: editData.role,
            pay_rate: amount,
            phone: editData.phone,
            email: editData.email,
            instagram: editData.instagram,
            notes: editData.notes,
          })
          .eq("id", saveId)
          .eq("event", formatEventName(slug))
          .select()
          .single();
        if (error) throw error;
        if (!data)
          throw new Error("The updated staff member was not returned.");
        setStaff((prev) =>
          prev.map((i) => (i.id === saveId ? { ...i, ...data } : i)),
        );
      }
      setEditing(null);
    } catch (error) {
      console.error("Failed to update planning item:", error);
      alert("Could not save changes. Please try again.");
    } finally {
      setSaving(null);
    }
  };

  const deleteItem = async (table: string, id: number) => {
    if (!confirm("Remove this item?")) return;
    await supabase.from(table).delete().eq("id", id);
    if (table === "planning_decor")
      setDecor((prev) => prev.filter((i) => i.id !== id));
    if (table === "planning_refreshments")
      setRefresh((prev) => prev.filter((i) => i.id !== id));
    if (table === "planning_staff")
      setStaff((prev) => prev.filter((i) => i.id !== id));
  };

  const inp = (style?: any) => ({
    padding: "7px 10px",
    border: "1px solid #e4ebe6",
    borderRadius: "8px",
    fontSize: "0.82rem",
    minWidth: 0,
    maxWidth: "100%",
    ...style,
  });
  const editInp = (style?: any) => ({
    padding: "4px 7px",
    border: "1px solid #E8C97A",
    borderRadius: "6px",
    fontSize: "12px",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box" as const,
    ...style,
  });

  const totalStaffCost = staff.reduce((s, m) => {
    const totalHours = (m.shifts || []).reduce(
      (h, sh) => h + Number(sh.hours),
      0,
    );
    // Add hours from planning shifts
    const shiftHours = (m.shifts || []).reduce(
      (h: number, sh: any) => h + Number(sh.hours),
      0,
    );
    // Add approved hours from staff portal
    const portalHours = staffHours
      .filter((h: any) => h.staff_email === m.email && h.approved)
      .reduce((h: number, sh: any) => h + Number(sh.hours), 0);
    return s + (shiftHours + portalHours) * Number(m.pay_rate);
  }, 0);
  const totalRefreshCost = refresh.reduce((s, x) => s + Number(x.cost), 0);
  const totalDecorCost = decor.reduce((s, x) => s + Number(x.cost), 0);

  return (
    <div
      className="[overflow-wrap:anywhere]"
      style={{
        minHeight: "100vh",
        background: "#f8faf8",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <LoadingView
          loading={organizerLoading || loading || loadedFor !== loadKey}
          error={loadError}
          onRetry={() => setRetry((value) => value + 1)}
          customLoader={<PlanningSkeleton />}
        >
          <fieldset
            disabled={saving !== null}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <div style={{ marginBottom: "1.5rem" }}>
              <Link
                href={`/organizer/events/${slug}`}
                style={{
                  fontSize: "0.85rem",
                  color: "#4a5a52",
                  textDecoration: "none",
                }}
              >
                ← Back to {eventName}
              </Link>
              <h1
                style={{
                  fontSize: "1.8rem",
                  color: "#1B3A2D",
                  fontWeight: "normal",
                  marginTop: "0.5rem",
                }}
              >
                Planning Hub
              </h1>
              <p style={{ color: "#4a5a52", fontSize: "0.9rem" }}>
                Decor, refreshments and staffing for {eventName}
              </p>
            </div>

            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              style={{
                marginBottom: "1.5rem",
              }}
            >
              {[
                {
                  label: "DECOR BUDGET",
                  value: formatCurrency(totalDecorCost),
                  color: "#E8C97A",
                },
                {
                  label: "REFRESHMENTS",
                  value: formatCurrency(totalRefreshCost),
                  color: "#4a7c59",
                },
                {
                  label: "STAFFING COST",
                  value: formatCurrency(totalStaffCost),
                  color: "#5b7fa6",
                },
              ].map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    padding: "1rem 1.25rem",
                    border: "1px solid #e4ebe6",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#4a5a52",
                      marginBottom: "4px",
                    }}
                  >
                    {c.label}
                  </div>
                  <div style={{ fontSize: "1.3rem", color: c.color }}>
                    {c.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "1.5rem",
              }}
            >
              {(["decor", "refreshments", "staff"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setAdding(false);
                    setEditing(null);
                  }}
                  style={{
                    padding: "8px 20px",
                    background: tab === t ? "#1B3A2D" : "#fff",
                    color: tab === t ? "#fff" : "#4a5a52",
                    border: "1px solid " + (tab === t ? "#1B3A2D" : "#e4ebe6"),
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    textTransform: "capitalize" as const,
                  }}
                >
                  {t}
                </button>
              ))}
              <button
                onClick={() => setAdding(!adding)}
                style={{
                  marginLeft: "auto",
                  padding: "8px 16px",
                  background: "#E8C97A",
                  color: "#fff",
                  border: "none",
                  borderRadius: "20px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                + Add
              </button>
            </div>

            {tab === "decor" && (
              <div>
                {adding && (
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      border: "1px solid #e4ebe6",
                    }}
                  >
                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr_1fr] [&>*]:min-w-0"
                      style={{
                        marginBottom: "8px",
                      }}
                    >
                      <select
                        value={newDecor.category}
                        onChange={(e) =>
                          setNewDecor({ ...newDecor, category: e.target.value })
                        }
                        style={inp()}
                      >
                        {DECOR_CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        placeholder="Item"
                        value={newDecor.item}
                        onChange={(e) =>
                          setNewDecor({ ...newDecor, item: e.target.value })
                        }
                        style={inp()}
                      />
                      <input
                        placeholder="Qty"
                        value={newDecor.quantity}
                        onChange={(e) =>
                          setNewDecor({ ...newDecor, quantity: e.target.value })
                        }
                        style={inp()}
                      />
                      <input
                        placeholder="Unit cost $"
                        value={newDecor.cost}
                        onChange={(e) =>
                          setNewDecor({ ...newDecor, cost: e.target.value })
                        }
                        style={inp()}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          padding: "7px 10px",
                          background: "#f8faf8",
                          borderRadius: "8px",
                          fontSize: "0.82rem",
                          color: "#E8C97A",
                          border: "1px solid #e4ebe6",
                        }}
                      >
                        ={" "}
                        {formatCurrency(
                          (parseFloat(newDecor.quantity) || 0) *
                            (parseFloat(newDecor.cost) || 0),
                        )}
                      </div>
                    </div>
                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-3 [&>*]:min-w-0"
                      style={{
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        placeholder="Vendor"
                        value={newDecor.vendor}
                        onChange={(e) =>
                          setNewDecor({ ...newDecor, vendor: e.target.value })
                        }
                        style={inp()}
                      />
                      <select
                        value={newDecor.status}
                        onChange={(e) =>
                          setNewDecor({ ...newDecor, status: e.target.value })
                        }
                        style={inp()}
                      >
                        {STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                      <input
                        placeholder="Notes"
                        value={newDecor.notes}
                        onChange={(e) =>
                          setNewDecor({ ...newDecor, notes: e.target.value })
                        }
                        style={inp()}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={addDecor}
                        style={{
                          padding: "7px 16px",
                          background: "#1B3A2D",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        {saving === "add" ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setAdding(false)}
                        style={{
                          padding: "7px 16px",
                          background: "transparent",
                          border: "1px solid #e4ebe6",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {DECOR_CATEGORIES.map((cat) => {
                  const items = decor.filter((d) => d.category === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat} style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#4a5a52",
                          letterSpacing: "0.08em",
                          marginBottom: "8px",
                        }}
                      >
                        {cat.toUpperCase()}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
                          gap: "10px",
                        }}
                      >
                        {items.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              background: "#fff",
                              borderRadius: "12px",
                              padding: "1rem",
                              border: "1px solid #e4ebe6",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                flexWrap: "wrap",
                                gap: "6px",
                                marginBottom: "8px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "0.9rem",
                                  color: "#1B3A2D",
                                  fontWeight: 500,
                                  minWidth: 0,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {editing === item.id ? (
                                  <input
                                    value={editData.item || ""}
                                    onChange={(e) =>
                                      setEditData({
                                        ...editData,
                                        item: e.target.value,
                                      })
                                    }
                                    style={editInp({ width: "120px" })}
                                  />
                                ) : (
                                  item.item
                                )}
                              </div>
                              {editing === item.id ? (
                                <select
                                  value={editData.status || ""}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      status: e.target.value,
                                    })
                                  }
                                  style={editInp()}
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s}>{s}</option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  style={{
                                    fontSize: "11px",
                                    padding: "2px 8px",
                                    borderRadius: "20px",
                                    background: statusColors[item.status]?.bg,
                                    color: statusColors[item.status]?.color,
                                  }}
                                >
                                  {item.status}
                                </span>
                              )}
                            </div>
                            {editing === item.id ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column" as const,
                                  gap: "6px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(2, minmax(0, 1fr))",
                                    gap: "4px",
                                  }}
                                >
                                  <input
                                    placeholder="Qty"
                                    value={editData.quantity || ""}
                                    onChange={(e) =>
                                      setEditData({
                                        ...editData,
                                        quantity: e.target.value,
                                      })
                                    }
                                    style={editInp({ width: "100%" })}
                                  />
                                  <input
                                    placeholder="Unit cost"
                                    value={editData.unit_cost || ""}
                                    onChange={(e) =>
                                      setEditData({
                                        ...editData,
                                        unit_cost: e.target.value,
                                      })
                                    }
                                    style={editInp({ width: "100%" })}
                                  />
                                  <div
                                    style={{
                                      padding: "4px 7px",
                                      background: "#f8faf8",
                                      borderRadius: "6px",
                                      fontSize: "12px",
                                      color: "#E8C97A",
                                      gridColumn: "1 / -1",
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    ={" "}
                                    {formatCurrency(
                                      (parseFloat(editData.quantity) || 0) *
                                        (parseFloat(editData.unit_cost) || 0),
                                    )}
                                  </div>
                                </div>
                                <input
                                  placeholder="Decision"
                                  value={editData.decision || ""}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      decision: e.target.value,
                                    })
                                  }
                                  style={editInp({ width: "100%" })}
                                />
                                <input
                                  placeholder="Vendor"
                                  value={editData.vendor || ""}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      vendor: e.target.value,
                                    })
                                  }
                                  style={editInp({ width: "100%" })}
                                />
                                <input
                                  placeholder="Notes"
                                  value={editData.notes || ""}
                                  onChange={(e) =>
                                    setEditData({
                                      ...editData,
                                      notes: e.target.value,
                                    })
                                  }
                                  style={editInp({ width: "100%" })}
                                />
                                <div style={{ display: "flex", gap: "6px" }}>
                                  <button
                                    onClick={() =>
                                      saveEdit("planning_decor", item.id)
                                    }
                                    style={{
                                      padding: "4px 10px",
                                      background: "#1B3A2D",
                                      color: "#fff",
                                      border: "none",
                                      borderRadius: "6px",
                                      fontSize: "11px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {saving === "edit" ? "Saving..." : "Save"}
                                  </button>
                                  <button
                                    onClick={() => setEditing(null)}
                                    style={{
                                      padding: "4px 10px",
                                      background: "transparent",
                                      border: "1px solid #e4ebe6",
                                      borderRadius: "6px",
                                      fontSize: "11px",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {item.quantity > 0 && (
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#4a5a52",
                                    }}
                                  >
                                    Qty: {item.quantity}
                                  </div>
                                )}
                                {item.decision && item.decision !== "TBD" && (
                                  <div
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "#1B3A2D",
                                      marginBottom: "4px",
                                    }}
                                  >
                                    → {item.decision}
                                  </div>
                                )}
                                {item.vendor && (
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#4a5a52",
                                    }}
                                  >
                                    Vendor: {item.vendor}
                                  </div>
                                )}
                                {item.cost > 0 && (
                                  <div
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "#E8C97A",
                                      fontWeight: 500,
                                      marginTop: "4px",
                                    }}
                                  >
                                    {formatCurrency(Number(item.cost))}
                                  </div>
                                )}
                                {item.notes && (
                                  <div
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#aaa",
                                      marginTop: "4px",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    {item.notes}
                                  </div>
                                )}
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "6px",
                                    marginTop: "10px",
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      setEditing(item.id);
                                      setEditData({
                                        ...item,
                                        unit_cost:
                                          item.quantity > 0
                                            ? (
                                                item.cost / item.quantity
                                              ).toFixed(2)
                                            : item.cost,
                                      });
                                    }}
                                    style={{
                                      fontSize: "11px",
                                      padding: "3px 8px",
                                      background: "transparent",
                                      border: "1px solid #e4ebe6",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      color: "#4a5a52",
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() =>
                                      deleteItem("planning_decor", item.id)
                                    }
                                    style={{
                                      fontSize: "11px",
                                      padding: "3px 8px",
                                      background: "transparent",
                                      border: "1px solid #f0f4f1",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      color: "#c0392b",
                                    }}
                                  >
                                    Remove
                                  </button>
                                </div>
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
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      border: "1px solid #e4ebe6",
                    }}
                  >
                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_1fr_1fr] [&>*]:min-w-0"
                      style={{
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        placeholder="Item"
                        value={newRefresh.item}
                        onChange={(e) =>
                          setNewRefresh({ ...newRefresh, item: e.target.value })
                        }
                        style={inp()}
                      />
                      <input
                        placeholder="Vendor"
                        value={newRefresh.vendor}
                        onChange={(e) =>
                          setNewRefresh({
                            ...newRefresh,
                            vendor: e.target.value,
                          })
                        }
                        style={inp()}
                      />
                      <input
                        placeholder="Qty"
                        value={newRefresh.quantity_num}
                        onChange={(e) =>
                          setNewRefresh({
                            ...newRefresh,
                            quantity_num: e.target.value,
                          })
                        }
                        style={inp()}
                      />
                      <input
                        placeholder="Unit cost $"
                        value={newRefresh.cost}
                        onChange={(e) =>
                          setNewRefresh({ ...newRefresh, cost: e.target.value })
                        }
                        style={inp()}
                      />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "7px 10px",
                          background: "#f8faf8",
                          borderRadius: "8px",
                          fontSize: "0.82rem",
                          color: "#4a7c59",
                          border: "1px solid #e4ebe6",
                        }}
                      >
                        ={" "}
                        {formatCurrency(
                          (parseFloat(newRefresh.quantity_num) || 0) *
                            (parseFloat(newRefresh.cost) || 0),
                        )}
                      </div>
                    </div>
                    <input
                      placeholder="Notes"
                      value={newRefresh.notes}
                      onChange={(e) =>
                        setNewRefresh({ ...newRefresh, notes: e.target.value })
                      }
                      style={inp({
                        width: "100%",
                        marginBottom: "8px",
                        boxSizing: "border-box",
                      })}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={addRefresh}
                        style={{
                          padding: "7px 16px",
                          background: "#1B3A2D",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        {saving === "add" ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setAdding(false)}
                        style={{
                          padding: "7px 16px",
                          background: "transparent",
                          border: "1px solid #e4ebe6",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e4ebe6",
                    overflow: "hidden",
                  }}
                >
                  {refresh.length === 0 && (
                    <p
                      style={{
                        padding: "1rem",
                        fontSize: "0.85rem",
                        color: "#4a5a52",
                      }}
                    >
                      No refreshments added yet.
                    </p>
                  )}
                  {refresh.map((item, i) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 16px",
                        borderBottom:
                          i < refresh.length - 1 ? "1px solid #f0f4f1" : "none",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#4a7c59",
                          flexShrink: 0,
                        }}
                      />
                      {editing === item.id ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            flex: 1,
                            flexWrap: "wrap" as const,
                            minWidth: 0,
                          }}
                        >
                          <input
                            value={editData.item || ""}
                            onChange={(e) =>
                              setEditData({ ...editData, item: e.target.value })
                            }
                            style={editInp({ width: "120px" })}
                          />
                          <input
                            value={editData.vendor || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                vendor: e.target.value,
                              })
                            }
                            placeholder="Vendor"
                            style={editInp({ width: "100px" })}
                          />
                          <input
                            value={editData.quantity_num || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                quantity_num: e.target.value,
                              })
                            }
                            placeholder="Qty"
                            style={editInp({ width: "50px" })}
                          />
                          <input
                            value={editData.unit_cost || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                unit_cost: e.target.value,
                              })
                            }
                            placeholder="Unit $"
                            style={editInp({ width: "60px" })}
                          />
                          <div
                            style={{
                              padding: "4px 7px",
                              background: "#f8faf8",
                              borderRadius: "6px",
                              fontSize: "12px",
                              color: "#4a7c59",
                              maxWidth: "100%",
                              overflowWrap: "anywhere",
                            }}
                          >
                            ={" "}
                            {formatCurrency(
                              (parseFloat(editData.quantity_num) || 0) *
                                (parseFloat(editData.unit_cost) || 0),
                            )}
                          </div>
                          <input
                            value={editData.notes || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                notes: e.target.value,
                              })
                            }
                            placeholder="Notes"
                            style={editInp({ width: "100px" })}
                          />
                          <button
                            onClick={() =>
                              saveEdit("planning_refreshments", item.id)
                            }
                            style={{
                              padding: "3px 8px",
                              background: "#1B3A2D",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            {saving === "edit" ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            style={{
                              padding: "3px 8px",
                              background: "transparent",
                              border: "1px solid #e4ebe6",
                              borderRadius: "6px",
                              fontSize: "11px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                            <div
                              style={{ fontSize: "0.9rem", color: "#1B3A2D" }}
                            >
                              {item.item}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "12px",
                                marginTop: "2px",
                              }}
                            >
                              {item.vendor && item.vendor !== "TBD" && (
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#4a5a52",
                                  }}
                                >
                                  Vendor: {item.vendor}
                                </span>
                              )}
                              {item.quantity_num > 0 && (
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#4a5a52",
                                  }}
                                >
                                  Qty: {item.quantity_num}
                                </span>
                              )}
                              {item.cost > 0 && (
                                <span
                                  style={{
                                    fontSize: "0.85rem",
                                    color: "#4a7c59",
                                    fontWeight: 500,
                                  }}
                                >
                                  {formatCurrency(Number(item.cost))}
                                </span>
                              )}
                              {item.notes && (
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#aaa",
                                    fontStyle: "italic",
                                  }}
                                >
                                  {item.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => {
                                setEditing(item.id);
                                setEditData({
                                  ...item,
                                  unit_cost:
                                    item.quantity_num > 0
                                      ? (item.cost / item.quantity_num).toFixed(
                                          2,
                                        )
                                      : item.cost,
                                });
                              }}
                              style={{
                                fontSize: "11px",
                                padding: "3px 8px",
                                background: "transparent",
                                border: "1px solid #e4ebe6",
                                borderRadius: "6px",
                                cursor: "pointer",
                                color: "#4a5a52",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                deleteItem("planning_refreshments", item.id)
                              }
                              style={{
                                fontSize: "11px",
                                padding: "3px 8px",
                                background: "transparent",
                                border: "1px solid #f0f4f1",
                                borderRadius: "6px",
                                cursor: "pointer",
                                color: "#c0392b",
                              }}
                            >
                              Remove
                            </button>
                          </div>
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
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      border: "1px solid #e4ebe6",
                    }}
                  >
                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-3 [&>*]:min-w-0"
                      style={{
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        placeholder="Full name"
                        value={newStaff.name}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, name: e.target.value })
                        }
                        style={inp()}
                      />
                      <select
                        value={newStaff.role}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, role: e.target.value })
                        }
                        style={inp()}
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                      <input
                        placeholder="Pay rate $/hr"
                        value={newStaff.pay_rate}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, pay_rate: e.target.value })
                        }
                        style={inp()}
                      />
                    </div>
                    <div
                      className="grid grid-cols-1 gap-2 sm:grid-cols-3 [&>*]:min-w-0"
                      style={{
                        marginBottom: "8px",
                      }}
                    >
                      <input
                        placeholder="Phone"
                        value={newStaff.phone}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, phone: e.target.value })
                        }
                        style={inp()}
                      />
                      <input
                        placeholder="Email"
                        value={newStaff.email}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, email: e.target.value })
                        }
                        style={inp()}
                      />
                      <input
                        placeholder="Instagram @"
                        value={newStaff.instagram}
                        onChange={(e) =>
                          setNewStaff({
                            ...newStaff,
                            instagram: e.target.value,
                          })
                        }
                        style={inp()}
                      />
                    </div>
                    <input
                      placeholder="Notes"
                      value={newStaff.notes}
                      onChange={(e) =>
                        setNewStaff({ ...newStaff, notes: e.target.value })
                      }
                      style={inp({
                        width: "100%",
                        marginBottom: "8px",
                        boxSizing: "border-box",
                      })}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={addStaff}
                        style={{
                          padding: "7px 16px",
                          background: "#1B3A2D",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        {saving === "add" ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setAdding(false)}
                        style={{
                          padding: "7px 16px",
                          background: "transparent",
                          border: "1px solid #e4ebe6",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
                    gap: "10px",
                  }}
                >
                  {staff.length === 0 && (
                    <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>
                      No staff added yet.
                    </p>
                  )}
                  {staff.map((member) => {
                    const totalHours = (member.shifts || []).reduce(
                      (h, s) => h + Number(s.hours),
                      0,
                    );
                    const totalPay = totalHours * Number(member.pay_rate);
                    return (
                      <div
                        key={member.id}
                        style={{
                          background: "#fff",
                          borderRadius: "12px",
                          padding: "1rem 1.25rem",
                          border: "1px solid #e4ebe6",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            flexWrap: "wrap",
                            gap: "6px",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{ minWidth: 0, overflowWrap: "anywhere" }}
                          >
                            {editing === member.id ? (
                              <input
                                value={editData.name || ""}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    name: e.target.value,
                                  })
                                }
                                style={editInp({
                                  width: "140px",
                                  marginBottom: "4px",
                                })}
                              />
                            ) : (
                              <div
                                style={{
                                  fontSize: "1rem",
                                  color: "#1B3A2D",
                                  fontWeight: 500,
                                }}
                              >
                                {member.name}
                              </div>
                            )}
                            <span
                              style={{
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "20px",
                                background:
                                  (roleColors[member.role] || "#E8C97A") + "22",
                                color: roleColors[member.role] || "#E8C97A",
                              }}
                            >
                              {member.role}
                            </span>
                          </div>
                          <div
                            style={{
                              textAlign: "right" as const,
                              minWidth: 0,
                              overflowWrap: "anywhere",
                            }}
                          >
                            <div
                              style={{ fontSize: "0.85rem", color: "#4a5a52" }}
                            >
                              {formatCurrency(Number(member.pay_rate))}/hr
                            </div>
                            {totalHours > 0 && (
                              <div
                                style={{
                                  fontSize: "1rem",
                                  color: "#E8C97A",
                                  fontWeight: 500,
                                }}
                              >
                                {formatCurrency(totalPay)}
                              </div>
                            )}
                            {totalHours > 0 && (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#4a5a52",
                                }}
                              >
                                {totalHours}hrs total
                              </div>
                            )}
                          </div>
                        </div>

                        {editing === member.id ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column" as const,
                              gap: "6px",
                            }}
                          >
                            <select
                              value={editData.role || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  role: e.target.value,
                                })
                              }
                              style={editInp({ width: "100%" })}
                            >
                              {STAFF_ROLES.map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                            <input
                              placeholder="Pay rate $/hr"
                              value={editData.pay_rate || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  pay_rate: e.target.value,
                                })
                              }
                              style={editInp({ width: "100%" })}
                            />
                            <input
                              placeholder="Phone"
                              value={editData.phone || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  phone: e.target.value,
                                })
                              }
                              style={editInp({ width: "100%" })}
                            />
                            <input
                              placeholder="Email"
                              value={editData.email || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  email: e.target.value,
                                })
                              }
                              style={editInp({ width: "100%" })}
                            />
                            <input
                              placeholder="Instagram @"
                              value={editData.instagram || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  instagram: e.target.value,
                                })
                              }
                              style={editInp({ width: "100%" })}
                            />
                            <input
                              placeholder="Notes"
                              value={editData.notes || ""}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  notes: e.target.value,
                                })
                              }
                              style={editInp({ width: "100%" })}
                            />
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                onClick={() =>
                                  saveEdit("planning_staff", member.id)
                                }
                                style={{
                                  padding: "4px 10px",
                                  background: "#1B3A2D",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                }}
                              >
                                {saving === "edit" ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={() => setEditing(null)}
                                style={{
                                  padding: "4px 10px",
                                  background: "transparent",
                                  border: "1px solid #e4ebe6",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {member.phone && (
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  color: "#4a5a52",
                                  marginBottom: "2px",
                                }}
                              >
                                📞 {member.phone}
                              </div>
                            )}
                            {member.email && (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "6px",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "2px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.78rem",
                                    color: "#4a5a52",
                                  }}
                                >
                                  ✉️ {member.email}
                                </div>
                                <button
                                  onClick={() =>
                                    inviteStaff(
                                      member.email,
                                      member.role,
                                      member.name,
                                    )
                                  }
                                  style={{
                                    fontSize: "0.68rem",
                                    padding: "2px 8px",
                                    background: "#1B3A2D",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  Send invite
                                </button>
                              </div>
                            )}
                            {member.instagram && (
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  color: "#4a5a52",
                                  marginBottom: "2px",
                                }}
                              >
                                📸 {member.instagram}
                              </div>
                            )}
                            {member.notes && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#aaa",
                                  fontStyle: "italic",
                                  marginTop: "4px",
                                }}
                              >
                                {member.notes}
                              </div>
                            )}

                            {/* Payment info from staff portal */}
                            {(() => {
                              const es = eventStaff.find(
                                (e) => e.staff_email === member.email,
                              );
                              const memberHours = staffHours.filter(
                                (h) => h.staff_email === member.email,
                              );
                              const approvedHours = memberHours
                                .filter((h) => h.approved)
                                .reduce(
                                  (s: number, h: any) => s + Number(h.hours),
                                  0,
                                );
                              const totalFees =
                                approvedHours * Number(member.pay_rate);
                              return es ? (
                                <div
                                  style={{
                                    marginTop: "8px",
                                    background: "#f8faf8",
                                    borderRadius: "8px",
                                    padding: "8px 10px",
                                    fontSize: "0.78rem",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "6px",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                    }}
                                  >
                                    <div style={{ color: "#4a5a52" }}>
                                      💳 {es.payment_method} ·{" "}
                                      <strong style={{ color: "#1B3A2D" }}>
                                        {es.payment_details}
                                      </strong>
                                    </div>
                                    {approvedHours > 0 && (
                                      <div style={{ color: "#4a7c59" }}>
                                        Total:{" "}
                                        <strong>
                                          {formatCurrency(totalFees)}
                                        </strong>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : null;
                            })()}

                            {/* Hours logged via staff portal */}
                            {staffHours.filter(
                              (h) => h.staff_email === member.email,
                            ).length > 0 && (
                              <div
                                style={{
                                  marginTop: "10px",
                                  borderTop: "1px solid #f0f4f1",
                                  paddingTop: "10px",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "#4a5a52",
                                    letterSpacing: "0.05em",
                                    marginBottom: "6px",
                                  }}
                                >
                                  HOURS FROM PORTAL
                                </div>
                                {staffHours
                                  .filter((h) => h.staff_email === member.email)
                                  .map((h: any) => (
                                    <div
                                      key={h.id}
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "6px",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "4px 0",
                                        borderBottom: "1px solid #f8f5f0",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      <div style={{ color: "#1B3A2D" }}>
                                        {new Date(
                                          h.work_date,
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </div>
                                      <div style={{ color: "#4a5a52" }}>
                                        {h.description || "Work session"}
                                      </div>
                                      <div style={{ color: "#E8C97A" }}>
                                        {h.hours}hrs ·{" "}
                                        {formatCurrency(
                                          Number(h.hours) *
                                            Number(member.pay_rate),
                                        )}
                                      </div>
                                      {!h.approved ? (
                                        <button
                                          onClick={() => approveHours(h.id)}
                                          style={{
                                            padding: "2px 8px",
                                            background: "#1B3A2D",
                                            color: "#fff",
                                            border: "none",
                                            borderRadius: "4px",
                                            fontSize: "0.68rem",
                                            cursor: "pointer",
                                          }}
                                        >
                                          Approve
                                        </button>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: "0.68rem",
                                            color: "#4a7c59",
                                          }}
                                        >
                                          ✓{" "}
                                          {formatCurrency(
                                            Number(h.hours) *
                                              Number(member.pay_rate),
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}

                            <div
                              style={{
                                marginTop: "10px",
                                borderTop: "1px solid #f0f4f1",
                                paddingTop: "10px",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#4a5a52",
                                  letterSpacing: "0.05em",
                                  marginBottom: "6px",
                                }}
                              >
                                SHIFTS
                              </div>
                              {(member.shifts || []).map((shift) => (
                                <div
                                  key={shift.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "4px 0",
                                    borderBottom: "1px solid #f8f5f0",
                                    fontSize: "0.8rem",
                                  }}
                                >
                                  <div style={{ color: "#1B3A2D" }}>
                                    {shift.shift_date}
                                  </div>
                                  <div style={{ color: "#4a5a52" }}>
                                    {shift.start_time} – {shift.end_time}
                                  </div>
                                  <div style={{ color: "#E8C97A" }}>
                                    {shift.hours}hrs
                                  </div>
                                  <button
                                    onClick={() =>
                                      deleteShift(member.id, shift.id)
                                    }
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      color: "#c8bfb5",
                                      fontSize: "11px",
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.color = "#c0392b")
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.color = "#c8bfb5")
                                    }
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                              {addingShift === member.id ? (
                                <div
                                  style={{
                                    marginTop: "8px",
                                    display: "flex",
                                    flexDirection: "column" as const,
                                    gap: "6px",
                                  }}
                                >
                                  {eventDays.length > 0 ? (
                                    <select
                                      value={newShift.shift_date}
                                      onChange={(e) =>
                                        setNewShift({
                                          ...newShift,
                                          shift_date: e.target.value,
                                        })
                                      }
                                      style={editInp({ width: "100%" })}
                                    >
                                      {eventDays.map((d) => (
                                        <option key={d}>{d}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      placeholder="e.g. Sat Oct 11"
                                      value={newShift.shift_date}
                                      onChange={(e) =>
                                        setNewShift({
                                          ...newShift,
                                          shift_date: e.target.value,
                                        })
                                      }
                                      style={editInp({ width: "100%" })}
                                    />
                                  )}
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(2, minmax(0, 1fr))",
                                      gap: "6px",
                                    }}
                                  >
                                    <input
                                      placeholder="Start e.g. 10am"
                                      value={newShift.start_time}
                                      onChange={(e) =>
                                        setNewShift({
                                          ...newShift,
                                          start_time: e.target.value,
                                        })
                                      }
                                      style={editInp({ width: "100%" })}
                                    />
                                    <input
                                      placeholder="End e.g. 6pm"
                                      value={newShift.end_time}
                                      onChange={(e) =>
                                        setNewShift({
                                          ...newShift,
                                          end_time: e.target.value,
                                        })
                                      }
                                      style={editInp({ width: "100%" })}
                                    />
                                  </div>
                                  {newShift.start_time && newShift.end_time && (
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        color: "#E8C97A",
                                      }}
                                    >
                                      ={" "}
                                      {calcHours(
                                        newShift.start_time,
                                        newShift.end_time,
                                      )}{" "}
                                      hrs ·{" "}
                                      {formatCurrency(
                                        calcHours(
                                          newShift.start_time,
                                          newShift.end_time,
                                        ) * Number(member.pay_rate),
                                      )}
                                    </div>
                                  )}
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    <button
                                      onClick={() => addShift(member.id)}
                                      style={{
                                        padding: "4px 10px",
                                        background: "#1B3A2D",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      {saving === "shift"
                                        ? "Saving..."
                                        : "Add shift"}
                                    </button>
                                    <button
                                      onClick={() => setAddingShift(null)}
                                      style={{
                                        padding: "4px 10px",
                                        background: "transparent",
                                        border: "1px solid #e4ebe6",
                                        borderRadius: "6px",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setAddingShift(member.id);
                                    setNewShift({
                                      shift_date: eventDays[0] || "",
                                      start_time: "",
                                      end_time: "",
                                    });
                                  }}
                                  style={{
                                    marginTop: "6px",
                                    fontSize: "11px",
                                    padding: "3px 10px",
                                    background: "transparent",
                                    border: "1px solid #e4ebe6",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    color: "#4a5a52",
                                  }}
                                >
                                  + Add shift
                                </button>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: "6px",
                                marginTop: "10px",
                              }}
                            >
                              <button
                                onClick={() => {
                                  setEditing(member.id);
                                  setEditData({ ...member });
                                }}
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 8px",
                                  background: "transparent",
                                  border: "1px solid #e4ebe6",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  color: "#4a5a52",
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  deleteItem("planning_staff", member.id)
                                }
                                style={{
                                  fontSize: "11px",
                                  padding: "3px 8px",
                                  background: "transparent",
                                  border: "1px solid #f0f4f1",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  color: "#c0392b",
                                }}
                              >
                                Remove
                              </button>
                            </div>
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
