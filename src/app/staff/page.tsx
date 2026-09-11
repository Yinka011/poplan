"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "next/navigation";

function StaffPortalInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [staff, setStaff] = useState<any>(null);
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"setup" | "portal">("portal");
  const [form, setForm] = useState({ name: "", payment_method: "Zelle", payment_details: "" });
  const [newEntry, setNewEntry] = useState({ work_date: "", hours: "", description: "" });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (token) fetchStaff(); }, [token]);

  const fetchStaff = async () => {
    const { data } = await supabase.from("event_staff").select("*").eq("invite_token", token).maybeSingle();
    if (data) {
      setStaff(data);
      if (!data.joined) setStep("setup");
      const { data: h } = await supabase.from("staff_hours").select("*").eq("staff_email", data.staff_email).eq("event", data.event).order("work_date", { ascending: false });
      if (h) setHours(h);
    }
    setLoading(false);
  };

  const completeSetup = async () => {
    if (!form.name.trim() || !form.payment_details.trim()) return;
    setSaving(true);
    await supabase.from("event_staff").update({ name: form.name, payment_method: form.payment_method, payment_details: form.payment_details, joined: true }).eq("invite_token", token);
    setStaff((prev: any) => prev ? { ...prev, ...form, joined: true } : null);
    setStep("portal");
    setSaving(false);
  };

  const addHours = async () => {
    if (!newEntry.work_date || !newEntry.hours || !staff) return;
    setSaving(true);
    const { data } = await supabase.from("staff_hours").insert({ event: staff.event, staff_email: staff.staff_email, work_date: newEntry.work_date, hours: parseFloat(newEntry.hours), description: newEntry.description }).select().single();
    if (data) setHours((prev: any[]) => [data, ...prev]);
    setNewEntry({ work_date: "", hours: "", description: "" });
    setAdding(false);
    setSaving(false);
  };

  const totalHours = hours.reduce((s: number, h: any) => s + Number(h.hours), 0);
  const totalPay = staff ? totalHours * Number(staff.hourly_rate) : 0;
  const approvedHours = hours.filter((h: any) => h.approved).reduce((s: number, h: any) => s + Number(h.hours), 0);

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>;

  if (!staff) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center" as const }}>
        <div style={{ fontSize: "1rem", color: "#1B3A2D" }}>Invalid or expired link</div>
        <div style={{ fontSize: "0.82rem", color: "#4a5a52", marginTop: "4px" }}>Contact your organizer for a new invite.</div>
      </div>
    </div>
  );

  if (step === "setup") return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: "2rem" }}>
      <div style={{ maxWidth: "480px", width: "100%", background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e4ebe6" }}>
        <div style={{ fontSize: "1.1rem", letterSpacing: "0.15em", color: "#1B3A2D", marginBottom: "0.5rem" }}>NALPOP</div>
        <div style={{ fontSize: "1.2rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>Welcome to the team</div>
        <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1.5rem" }}>Invited as <strong>{staff.role}</strong> for {staff.event}.</p>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px" }}>
          <div>
            <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "4px" }}>YOUR NAME</div>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full name" style={{ width: "100%", padding: "10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.88rem", fontFamily: "Georgia, serif", boxSizing: "border-box" as const }} />
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "4px" }}>PAYMENT METHOD</div>
            <select value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})} style={{ width: "100%", padding: "10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.88rem", fontFamily: "Georgia, serif", boxSizing: "border-box" as const }}>
              {["Zelle","Bank Transfer","Cash App","PayPal","Venmo"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "4px" }}>PAYMENT DETAILS</div>
            <input value={form.payment_details} onChange={e => setForm({...form, payment_details: e.target.value})} placeholder="Phone, email or account number" style={{ width: "100%", padding: "10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.88rem", fontFamily: "Georgia, serif", boxSizing: "border-box" as const }} />
          </div>
          <button onClick={completeSetup} disabled={saving} style={{ width: "100%", padding: "12px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
            {saving ? "Saving..." : "Complete setup →"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "#E8C97A", letterSpacing: "0.15em" }}>NALPOP STAFF</div>
          <div style={{ fontSize: "1rem", color: "#fff" }}>{staff.name} · {staff.role}</div>
        </div>
        <div style={{ fontSize: "0.78rem", color: "#ffffff66" }}>{staff.event}</div>
      </div>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {([["TOTAL HOURS", totalHours + "h"], ["APPROVED", approvedHours + "h"], ["EST. PAY", "$" + totalPay.toFixed(2)]] as [string,string][]).map(([label, value]) => (
            <div key={label} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "1.5rem", color: "#1B3A2D" }}>{value}</div>
              <div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.08em" }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e4ebe6", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.62rem", color: "#4a5a52", marginBottom: "2px" }}>PAYMENT</div>
            <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>{staff.payment_method} · {staff.payment_details}</div>
          </div>
          <div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>Rate: ${Number(staff.hourly_rate).toFixed(2)}/hr</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.12em" }}>HOURS LOG</div>
            <button onClick={() => setAdding(true)} style={{ padding: "6px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Log hours</button>
          </div>
          {adding && (
            <div style={{ border: "1px solid #e4ebe6", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                <div>
                  <div style={{ fontSize: "0.62rem", color: "#4a5a52", marginBottom: "3px" }}>DATE</div>
                  <input type="date" value={newEntry.work_date} onChange={e => setNewEntry({...newEntry, work_date: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif", boxSizing: "border-box" as const }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.62rem", color: "#4a5a52", marginBottom: "3px" }}>HOURS</div>
                  <input type="number" placeholder="0" value={newEntry.hours} onChange={e => setNewEntry({...newEntry, hours: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif", boxSizing: "border-box" as const }} />
                </div>
              </div>
              <div style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "0.62rem", color: "#4a5a52", marginBottom: "3px" }}>DESCRIPTION</div>
                <input placeholder="e.g. Event setup, customer service" value={newEntry.description} onChange={e => setNewEntry({...newEntry, description: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={addHours} disabled={saving} style={{ flex: 1, padding: "8px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>{saving ? "Saving..." : "Save"}</button>
                <button onClick={() => setAdding(false)} style={{ padding: "8px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}
          {hours.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "2rem", color: "#4a5a52", fontSize: "0.82rem" }}>No hours logged yet.</div>
          ) : hours.map((h: any) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f4f1" }}>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>{h.description || "Work session"}</div>
                <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>{new Date(h.work_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>{h.hours}h · ${(Number(h.hours) * Number(staff.hourly_rate)).toFixed(2)}</span>
                <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "10px", background: h.approved ? "#4a7c5922" : "#f0f4f1", color: h.approved ? "#4a7c59" : "#4a5a52" }}>{h.approved ? "✓ Approved" : "Pending"}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StaffPortal() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>}>
      <StaffPortalInner />
    </Suspense>
  );
}
