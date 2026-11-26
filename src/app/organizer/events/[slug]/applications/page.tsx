"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type Application = {
  id: number;
  brand_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  category: string;
  description: string;
  heard_from: string | null;
  status: string;
  created_at: string;
  response_token: string | null;
  payment_details_sent: boolean;
  deposit_confirmed: boolean;
};

type EventInfo = {
  name: string;
  brand_brief_url: string | null;
};

export default function ApplicationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [applications, setApplications] = useState<Application[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo>({ name: "", brand_brief_url: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("pending");
  const [selected, setSelected] = useState<Application | null>(null);
  const [actioning, setActioning] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  useEffect(() => {
    fetchAll();
  }, [slug]);

  const fetchAll = async () => {
    setLoading(true);
    const [appRes, eventRes] = await Promise.all([
      supabase.from("brand_applications").select("*").eq("event_slug", slug).order("created_at", { ascending: false }),
      supabase.from("events").select("name, brand_brief_url").eq("slug", slug).maybeSingle(),
    ]);
    if (appRes.error) setError("Could not load applications.");
    else setApplications(appRes.data ?? []);
    if (eventRes.data) setEventInfo(eventRes.data);
    setLoading(false);
  };

  const generateToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

  const approve = async (app: Application) => {
    setActioning(app.id);
    try {
      const token = generateToken();

      // Update application with token and status
      await supabase.from("brand_applications")
        .update({ status: "approved", response_token: token })
        .eq("id", app.id);

      // Build response URLs
      const baseUrl = "https://nalpop.com";
      const interestedUrl = `${baseUrl}/respond/${token}?action=interested`;
      const notInterestedUrl = `${baseUrl}/respond/${token}?action=not_interested`;

      // Send approval email with brief attached if available
      const emailPayload: any = {
        to: app.email,
        subject: `You've been approved — ${eventInfo.name || slug}`,
        html: approvalEmail(app, slug, eventInfo.name, interestedUrl, notInterestedUrl),
      };
      if (eventInfo.brand_brief_url) {
        emailPayload.attachments = [{ filename: "Brand_Brief.pdf", url: eventInfo.brand_brief_url }];
      }

      const emailEndpoint = eventInfo.brand_brief_url ? "/api/send-email-with-attachment" : "/api/send-email";
      await fetch(emailEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });

      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "approved", response_token: token } : a));
      if (selected?.id === app.id) setSelected({ ...selected, status: "approved", response_token: token });
    } catch (e: any) {
      alert(e.message || "Something went wrong approving this application.");
    }
    setActioning(null);
  };

  const decline = async (app: Application) => {
    if (!confirm(`Decline ${app.brand_name}'s application?`)) return;
    setActioning(app.id);
    await supabase.from("brand_applications").update({ status: "declined" }).eq("id", app.id);
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: app.email,
        subject: `Your application to ${eventInfo.name || slug}`,
        html: declineEmail(app, eventInfo.name || slug),
      }),
    });
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "declined" } : a));
    if (selected?.id === app.id) setSelected({ ...selected, status: "declined" });
    setActioning(null);
  };

  const sendPaymentDetails = async (app: Application) => {
    if (!paymentNote.trim()) { alert("Please add payment instructions."); return; }
    setActioning(app.id);
    await supabase.from("brand_applications").update({ payment_details_sent: true, status: "awaiting_deposit" }).eq("id", app.id);
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: app.email,
        subject: `Payment details — ${eventInfo.name || slug}`,
        html: paymentEmail(app, eventInfo.name || slug, paymentNote),
      }),
    });
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "awaiting_deposit", payment_details_sent: true } : a));
    if (selected?.id === app.id) setSelected({ ...selected, status: "awaiting_deposit", payment_details_sent: true });
    setPaymentNote("");
    setShowPaymentForm(false);
    setActioning(null);
  };

  const confirmDeposit = async (app: Application) => {
    setActioning(app.id);
    try {
      // Create brand portal entry using event name (not slug) to match brands table schema
      const eventNameForBrands = eventInfo.name || slug;
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("brands").upsert({
        email: app.email,
        name: app.brand_name,
        event: eventNameForBrands,
        organizer_email: user?.email || "",
        status: "Active",
      }, { onConflict: "email,event" });

      await supabase.from("brand_applications").update({ status: "confirmed", deposit_confirmed: true }).eq("id", app.id);

      // Send sign-up invite so they can access their portal
      await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: app.email }),
      });

      // Send confirmation email
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: app.email,
          subject: `Deposit confirmed — you're locked in for ${eventInfo.name || slug}!`,
          html: confirmedEmail(app, eventInfo.name || slug),
        }),
      });

      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "confirmed", deposit_confirmed: true } : a));
      if (selected?.id === app.id) setSelected({ ...selected, status: "confirmed", deposit_confirmed: true });
    } catch (e: any) {
      alert(e.message || "Something went wrong.");
    }
    setActioning(null);
  };

  const paymentNotSeen = async (app: Application) => {
    setActioning(app.id);
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: app.email,
        subject: `Payment not received — ${eventInfo.name || slug}`,
        html: notSeenEmail(app, eventInfo.name || slug),
      }),
    });
    setActioning(null);
    alert("Reminder sent to " + app.email);
  };

  const copyApplyLink = async () => {
    if (copying) return;
    setCopying(true);
    try { await navigator.clipboard.writeText(`https://nalpop.com/apply/${slug}`); }
    catch { alert("Could not copy link."); }
    setTimeout(() => setCopying(false), 1500);
  };

  const ALL_STATUSES = ["pending", "approved", "interested", "not_interested", "awaiting_deposit", "confirmed", "declined"];
  const filtered = filter === "all" ? applications : applications.filter(a => a.status === filter);

  const counts: Record<string, number> = { all: applications.length };
  for (const s of ALL_STATUSES) counts[s] = applications.filter(a => a.status === s).length;

  const statusBadge = (status: string) => {
    const map: Record<string, any> = {
      pending: { bg: "#fef9ec", color: "#b7791f", border: "#f6e096", label: "Pending" },
      approved: { bg: "#f0f7f2", color: "#1B3A2D", border: "#c3ddd0", label: "Approved" },
      interested: { bg: "#f0f4ff", color: "#3730a3", border: "#c7d2fe", label: "Interested" },
      not_interested: { bg: "#fef2f2", color: "#c0392b", border: "#fecaca", label: "Not interested" },
      awaiting_deposit: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa", label: "Awaiting deposit" },
      confirmed: { bg: "#f0f7f2", color: "#1B3A2D", border: "#1B3A2D44", label: "✓ Confirmed" },
      declined: { bg: "#fef2f2", color: "#c0392b", border: "#fecaca", label: "Declined" },
    };
    const s = map[status] || { bg: "#f8faf8", color: "#4a5a52", border: "#e4ebe6", label: status };
    return (
      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: "2px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 500 }}>
        {s.label}
      </span>
    );
  };

  const FILTER_TABS = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "interested", label: "Interested" },
    { key: "awaiting_deposit", label: "Awaiting deposit" },
    { key: "confirmed", label: "Confirmed" },
    { key: "approved", label: "Approved" },
    { key: "declined", label: "Declined" },
  ];

  return (
    <div className="[overflow-wrap:anywhere]" style={{ minHeight: "100vh", background: "#f8faf8" }}>
      {/* Header */}
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href={`/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back</Link>
          <div style={{ fontSize: "1rem", color: "#fff" }}>Brand Applications</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <code style={{ fontSize: "0.75rem", color: "#E8C97A", background: "#ffffff11", padding: "4px 8px", borderRadius: "6px" }}>nalpop.com/apply/{slug}</code>
          <button onClick={copyApplyLink} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #ffffff44", borderRadius: "6px", color: "#fff", fontSize: "0.75rem", cursor: "pointer" }}>
            {copying ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(130px, 100%), 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { key: "pending", label: "PENDING" },
            { key: "interested", label: "INTERESTED" },
            { key: "awaiting_deposit", label: "AWAITING DEPOSIT" },
            { key: "confirmed", label: "CONFIRMED" },
          ].map(({ key, label }) => (
            <div key={key} onClick={() => setFilter(key)} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: filter === key ? "1px solid #1B3A2D" : "1px solid #e4ebe6", textAlign: "center" as const, cursor: "pointer" }}>
              <div style={{ fontSize: "1.8rem", color: "#1B3A2D" }}>{counts[key]}</div>
              <div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.08em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0", marginBottom: "1rem", borderBottom: "2px solid #e4ebe6", overflowX: "auto" }}>
          {FILTER_TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)} style={{ padding: "8px 14px", border: "none", background: "transparent", fontSize: "0.78rem", whiteSpace: "nowrap" as const, color: filter === key ? "#1B3A2D" : "#4a5a52", borderBottom: filter === key ? "2px solid #1B3A2D" : "2px solid transparent", marginBottom: "-2px", cursor: "pointer" }}>
              {label} ({key === "all" ? counts.all : counts[key] ?? 0})
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#4a5a52" }}>Loading…</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#c0392b" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", textAlign: "center" as const, border: "1px solid #e4ebe6" }}>
            <div style={{ color: "#1B3A2D", marginBottom: "0.5rem" }}>No applications here yet</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Share your apply link to start receiving applications.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {filtered.map(app => (
              <div key={app.id} onClick={() => { setSelected(app); setShowPaymentForm(false); setPaymentNote(""); }} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e4ebe6", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9rem", color: "#1B3A2D", fontWeight: 500 }}>{app.brand_name}</div>
                  <div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>{app.contact_name} · {app.category}</div>
                  <div style={{ fontSize: "0.75rem", color: "#4a5a52", marginTop: "2px" }}>{app.email}{app.instagram ? ` · ${app.instagram}` : ""}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  {statusBadge(app.status)}
                  <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>
                    {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "#00000055", zIndex: 20 }} />
          <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(460px, 100vw)", background: "#fff", zIndex: 21, overflowY: "auto", padding: "1.5rem", boxShadow: "-4px 0 24px #00000022" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ fontSize: "1.1rem", color: "#1B3A2D", fontWeight: 500 }}>{selected.brand_name}</div>
                <div style={{ fontSize: "0.78rem", color: "#4a5a52", marginTop: "2px" }}>{selected.category}</div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {statusBadge(selected.status)}
                <button onClick={() => setSelected(null)} style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "#4a5a52" }}>✕</button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" as const, gap: "12px", marginBottom: "1.5rem" }}>
              {[
                ["Contact", selected.contact_name],
                ["Email", selected.email],
                ["Phone", selected.phone],
                ["Instagram", selected.instagram],
                ["Website", selected.website],
                ["Heard from", selected.heard_from],
                ["Applied", new Date(selected.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string}>
                  <div style={{ fontSize: "0.68rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "2px" }}>{(k as string).toUpperCase()}</div>
                  <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>{v}</div>
                </div>
              ))}
              <div>
                <div style={{ fontSize: "0.68rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>ABOUT THE BRAND</div>
                <div style={{ fontSize: "0.85rem", color: "#1B3A2D", lineHeight: 1.6 }}>{selected.description}</div>
              </div>
            </div>

            {/* Action area by status */}
            {selected.status === "pending" && (
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => approve(selected)} disabled={actioning === selected.id} style={{ flex: 1, padding: "11px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.88rem", cursor: "pointer" }}>
                  {actioning === selected.id ? "Approving…" : "✓ Approve"}
                </button>
                <button onClick={() => decline(selected)} disabled={actioning === selected.id} style={{ flex: 1, padding: "11px", background: "transparent", color: "#c0392b", border: "1px solid #fecaca", borderRadius: "10px", fontSize: "0.88rem", cursor: "pointer" }}>
                  Decline
                </button>
              </div>
            )}

            {selected.status === "approved" && (
              <div style={{ background: "#f0f7f2", borderRadius: "10px", padding: "12px", fontSize: "0.82rem", color: "#1B3A2D", textAlign: "center" as const }}>
                ✓ Approved — awaiting brand response
                {eventInfo.brand_brief_url && <div style={{ fontSize: "0.75rem", color: "#4a5a52", marginTop: "4px" }}>Brief was attached to the email</div>}
              </div>
            )}

            {selected.status === "interested" && (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                <div style={{ background: "#f0f4ff", borderRadius: "10px", padding: "12px", fontSize: "0.82rem", color: "#3730a3", textAlign: "center" as const }}>
                  🎉 {selected.brand_name} is interested!
                </div>
                {!showPaymentForm ? (
                  <button onClick={() => setShowPaymentForm(true)} style={{ width: "100%", padding: "11px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.88rem", cursor: "pointer" }}>
                    Send payment details
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.08em" }}>PAYMENT INSTRUCTIONS</div>
                    <textarea
                      value={paymentNote}
                      onChange={e => setPaymentNote(e.target.value)}
                      placeholder="e.g. Please send $200 deposit via Zelle to payments@nalpop.com. Reference your brand name."
                      rows={4}
                      style={{ padding: "10px 12px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.84rem", resize: "vertical" as const, fontFamily: "inherit" }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => sendPaymentDetails(selected)} disabled={actioning === selected.id} style={{ flex: 1, padding: "10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                        {actioning === selected.id ? "Sending…" : "Send"}
                      </button>
                      <button onClick={() => { setShowPaymentForm(false); setPaymentNote(""); }} style={{ padding: "10px 14px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {selected.status === "awaiting_deposit" && (
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "10px" }}>
                <div style={{ background: "#fff7ed", borderRadius: "10px", padding: "12px", fontSize: "0.82rem", color: "#c2410c", textAlign: "center" as const }}>
                  Payment details sent — awaiting deposit
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => confirmDeposit(selected)} disabled={actioning === selected.id} style={{ flex: 1, padding: "11px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer" }}>
                    {actioning === selected.id ? "Confirming…" : "✓ Deposit received"}
                  </button>
                  <button onClick={() => paymentNotSeen(selected)} disabled={actioning === selected.id} style={{ flex: 1, padding: "11px", background: "transparent", color: "#c2410c", border: "1px solid #fed7aa", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer" }}>
                    Not seen — nudge
                  </button>
                </div>
              </div>
            )}

            {selected.status === "confirmed" && (
              <div style={{ background: "#f0f7f2", borderRadius: "10px", padding: "14px", fontSize: "0.85rem", color: "#1B3A2D", textAlign: "center" as const }}>
                ✓ Confirmed — brand portal created
              </div>
            )}

            {selected.status === "not_interested" && (
              <div style={{ background: "#fef2f2", borderRadius: "10px", padding: "12px", fontSize: "0.82rem", color: "#c0392b", textAlign: "center" as const }}>
                Brand declined this event
              </div>
            )}

            {selected.status === "declined" && (
              <div style={{ background: "#fef2f2", borderRadius: "10px", padding: "12px", fontSize: "0.82rem", color: "#c0392b", textAlign: "center" as const }}>
                Application declined
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function approvalEmail(app: Application, slug: string, eventName: string, interestedUrl: string, notInterestedUrl: string) {
  const name = eventName || slug.charAt(0).toUpperCase() + slug.slice(1);
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4ebe6">
    <div style="background:#1B3A2D;padding:2rem 2.5rem">
      <div style="font-size:1.3rem;letter-spacing:0.2em;color:#E8C97A">NALPOP</div>
    </div>
    <div style="padding:2rem 2.5rem">
      <h2 style="color:#1B3A2D;font-weight:normal;font-size:1.3rem;margin:0 0 0.75rem">You've been approved, ${app.brand_name}!</h2>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1rem">
        Your application to <strong>${name}</strong> has been reviewed and approved. Please find the brand brief attached — it covers everything you need to know about the event.
      </p>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1.5rem">
        Please let us know if you'd like to secure your spot:
      </p>
      <div style="display:flex;gap:12px;margin-bottom:1.5rem">
        <a href="${interestedUrl}" style="flex:1;display:block;text-align:center;padding:12px;background:#1B3A2D;color:#E8C97A;border-radius:10px;text-decoration:none;font-size:0.9rem">
          Yes, I'm interested
        </a>
        <a href="${notInterestedUrl}" style="flex:1;display:block;text-align:center;padding:12px;background:#f8faf8;color:#4a5a52;border-radius:10px;text-decoration:none;font-size:0.9rem;border:1px solid #e4ebe6">
          Not this time
        </a>
      </div>
      <p style="color:#4a5a52;font-size:0.82rem;margin:0">
        Questions? Reply to this email and we'll be in touch.
      </p>
    </div>
    <div style="padding:1.5rem 2.5rem;background:#f8faf8;font-size:0.75rem;color:#4a5a52">
      Nalpop · The Pop-Up Management Platform
    </div>
  </div>
</body></html>`;
}

function declineEmail(app: Application, eventName: string) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4ebe6">
    <div style="background:#1B3A2D;padding:2rem 2.5rem">
      <div style="font-size:1.3rem;letter-spacing:0.2em;color:#E8C97A">NALPOP</div>
    </div>
    <div style="padding:2rem 2.5rem">
      <h2 style="color:#1B3A2D;font-weight:normal;font-size:1.3rem;margin:0 0 0.75rem">Thank you for applying</h2>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1rem">
        Hi ${app.contact_name}, thank you for your interest in <strong>${eventName}</strong>.
      </p>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0">
        After reviewing your application, we're unable to offer you a spot at this event. We appreciate you taking the time to apply and hope to see you at a future pop-up.
      </p>
    </div>
    <div style="padding:1.5rem 2.5rem;background:#f8faf8;font-size:0.75rem;color:#4a5a52">
      Nalpop · The Pop-Up Management Platform
    </div>
  </div>
</body></html>`;
}

function paymentEmail(app: Application, eventName: string, instructions: string) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4ebe6">
    <div style="background:#1B3A2D;padding:2rem 2.5rem">
      <div style="font-size:1.3rem;letter-spacing:0.2em;color:#E8C97A">NALPOP</div>
    </div>
    <div style="padding:2rem 2.5rem">
      <h2 style="color:#1B3A2D;font-weight:normal;font-size:1.3rem;margin:0 0 0.75rem">Secure your spot — ${eventName}</h2>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1rem">
        Hi ${app.contact_name}, we're excited to have ${app.brand_name} at <strong>${eventName}</strong>! To confirm your spot, please send your deposit using the details below:
      </p>
      <div style="background:#f8faf8;border-radius:10px;padding:1rem 1.25rem;margin-bottom:1.25rem;font-size:0.88rem;color:#1B3A2D;line-height:1.8;white-space:pre-wrap">${instructions}</div>
      <p style="color:#4a5a52;font-size:0.85rem;margin:0">
        Once we confirm receipt of your deposit, you'll receive access to your brand portal with all event details and next steps.
      </p>
    </div>
    <div style="padding:1.5rem 2.5rem;background:#f8faf8;font-size:0.75rem;color:#4a5a52">
      Nalpop · The Pop-Up Management Platform
    </div>
  </div>
</body></html>`;
}

function confirmedEmail(app: Application, eventName: string) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4ebe6">
    <div style="background:#1B3A2D;padding:2rem 2.5rem">
      <div style="font-size:1.3rem;letter-spacing:0.2em;color:#E8C97A">NALPOP</div>
    </div>
    <div style="padding:2rem 2.5rem">
      <h2 style="color:#1B3A2D;font-weight:normal;font-size:1.3rem;margin:0 0 0.75rem">You're locked in! 🎉</h2>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1rem">
        Hi ${app.contact_name}, your deposit has been received and ${app.brand_name} is officially confirmed for <strong>${eventName}</strong>.
      </p>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1.5rem">
        Click below to set up your account and access your brand portal, where you'll find all event details and next steps.
      </p>
      <a href="https://nalpop.com/brand/setup" style="display:block;text-align:center;padding:14px;background:#1B3A2D;color:#E8C97A;border-radius:10px;text-decoration:none;font-size:0.95rem;margin-bottom:1.5rem">
        Set up my account →
      </a>
      <p style="color:#4a5a52;font-size:0.85rem;margin:0">
        Already have an account? <a href="https://nalpop.com/login" style="color:#1B3A2D">Sign in here</a>. Questions? Reply to this email and we'll help you out.
      </p>
    </div>
    <div style="padding:1.5rem 2.5rem;background:#f8faf8;font-size:0.75rem;color:#4a5a52">
      Nalpop · The Pop-Up Management Platform
    </div>
  </div>
</body></html>`;
}

function notSeenEmail(app: Application, eventName: string) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4ebe6">
    <div style="background:#1B3A2D;padding:2rem 2.5rem">
      <div style="font-size:1.3rem;letter-spacing:0.2em;color:#E8C97A">NALPOP</div>
    </div>
    <div style="padding:2rem 2.5rem">
      <h2 style="color:#1B3A2D;font-weight:normal;font-size:1.3rem;margin:0 0 0.75rem">Payment not yet received</h2>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1rem">
        Hi ${app.contact_name}, just a quick note — we haven't received your deposit for <strong>${eventName}</strong> yet.
      </p>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0">
        If you've already sent it, please reply to this email with your payment confirmation and we'll sort it out. If you need the payment details resent, just let us know.
      </p>
    </div>
    <div style="padding:1.5rem 2.5rem;background:#f8faf8;font-size:0.75rem;color:#4a5a52">
      Nalpop · The Pop-Up Management Platform
    </div>
  </div>
</body></html>`;
}
