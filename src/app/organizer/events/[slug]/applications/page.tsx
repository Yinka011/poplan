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
  status: "pending" | "approved" | "declined";
  created_at: string;
};

export default function ApplicationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "declined">("pending");
  const [selected, setSelected] = useState<Application | null>(null);
  const [actioning, setActioning] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [slug]);

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("brand_applications")
      .select("*")
      .eq("event_slug", slug)
      .order("created_at", { ascending: false });
    if (err) setError("Could not load applications.");
    else setApplications(data ?? []);
    setLoading(false);
  };

  const approve = async (app: Application) => {
    setActioning(app.id);
    try {
      // Send invite email via existing invite API
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: app.email }),
      });
      const json = await res.json();
      if (!res.ok && !json.already_registered) throw new Error(json.error || "Invite failed");

      // Update application status
      await supabase.from("brand_applications").update({ status: "approved" }).eq("id", app.id);

      // Send approval notification email
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: app.email,
          subject: `You're approved for ${slug.charAt(0).toUpperCase() + slug.slice(1)}!`,
          html: approvalEmail(app, slug),
        }),
      });

      setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "approved" } : a));
      if (selected?.id === app.id) setSelected({ ...selected, status: "approved" });
    } catch (e: any) {
      alert(e.message || "Something went wrong approving this application.");
    }
    setActioning(null);
  };

  const decline = async (app: Application) => {
    if (!confirm(`Decline ${app.brand_name}'s application?`)) return;
    setActioning(app.id);
    await supabase.from("brand_applications").update({ status: "declined" }).eq("id", app.id);
    // Send decline email
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: app.email,
        subject: `Your application to ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
        html: declineEmail(app, slug),
      }),
    });
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: "declined" } : a));
    if (selected?.id === app.id) setSelected({ ...selected, status: "declined" });
    setActioning(null);
  };

  const copyApplyLink = async () => {
    if (copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(`https://nalpop.com/apply/${slug}`);
    } catch { alert("Could not copy link."); }
    setTimeout(() => setCopying(false), 1500);
  };

  const filtered = applications.filter(a => filter === "all" || a.status === filter);
  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    approved: applications.filter(a => a.status === "approved").length,
    declined: applications.filter(a => a.status === "declined").length,
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, any> = {
      pending: { background: "#fef9ec", color: "#b7791f", border: "1px solid #f6e096" },
      approved: { background: "#f0f7f2", color: "#1B3A2D", border: "1px solid #c3ddd0" },
      declined: { background: "#fef2f2", color: "#c0392b", border: "1px solid #fecaca" },
    };
    return (
      <span style={{ ...styles[status], padding: "2px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 500 }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(140px, 100%), 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {(["pending", "approved", "declined"] as const).map(s => (
            <div key={s} onClick={() => setFilter(s)} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: filter === s ? "1px solid #1B3A2D" : "1px solid #e4ebe6", textAlign: "center" as const, cursor: "pointer" }}>
              <div style={{ fontSize: "1.8rem", color: "#1B3A2D" }}>{counts[s]}</div>
              <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.1em" }}>{s.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0", marginBottom: "1rem", borderBottom: "2px solid #e4ebe6" }}>
          {(["all", "pending", "approved", "declined"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "8px 16px", border: "none", background: "transparent", fontSize: "0.82rem", color: filter === f ? "#1B3A2D" : "#4a5a52", borderBottom: filter === f ? "2px solid #1B3A2D" : "2px solid transparent", marginBottom: "-2px", cursor: "pointer" }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#4a5a52" }}>Loading…</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#c0392b" }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", textAlign: "center" as const, border: "1px solid #e4ebe6" }}>
            <div style={{ color: "#1B3A2D", marginBottom: "0.5rem" }}>No {filter === "all" ? "" : filter} applications yet</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Share your apply link to start receiving applications.</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {filtered.map(app => (
              <div key={app.id} onClick={() => setSelected(app)} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e4ebe6", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
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
          <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: "min(440px, 100vw)", background: "#fff", zIndex: 21, overflowY: "auto", padding: "1.5rem", boxShadow: "-4px 0 24px #00000022" }}>
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

            {selected.status === "pending" && (
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => approve(selected)}
                  disabled={actioning === selected.id}
                  style={{ flex: 1, padding: "11px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.88rem", cursor: "pointer" }}
                >
                  {actioning === selected.id ? "Approving…" : "✓ Approve"}
                </button>
                <button
                  onClick={() => decline(selected)}
                  disabled={actioning === selected.id}
                  style={{ flex: 1, padding: "11px", background: "transparent", color: "#c0392b", border: "1px solid #fecaca", borderRadius: "10px", fontSize: "0.88rem", cursor: "pointer" }}
                >
                  Decline
                </button>
              </div>
            )}
            {selected.status === "approved" && (
              <div style={{ background: "#f0f7f2", borderRadius: "10px", padding: "12px", fontSize: "0.82rem", color: "#1B3A2D", textAlign: "center" as const }}>
                ✓ Approved — invite email sent
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

function approvalEmail(app: Application, slug: string) {
  const eventName = slug.charAt(0).toUpperCase() + slug.slice(1);
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:Georgia,serif">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e4ebe6">
    <div style="background:#1B3A2D;padding:2rem 2.5rem">
      <div style="font-size:1.3rem;letter-spacing:0.2em;color:#E8C97A">NALPOP</div>
    </div>
    <div style="padding:2rem 2.5rem">
      <h2 style="color:#1B3A2D;font-weight:normal;font-size:1.3rem;margin:0 0 0.75rem">You're in, ${app.brand_name}!</h2>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1rem">
        Your application to <strong>${eventName}</strong> has been approved. Welcome aboard.
      </p>
      <p style="color:#4a5a52;font-size:0.9rem;line-height:1.8;margin:0 0 1.5rem">
        Check your inbox for a separate email to set your password and access your brand portal, where you'll find all event details and next steps.
      </p>
      <p style="color:#4a5a52;font-size:0.85rem;margin:0">
        Questions? Reply to this email and we'll be in touch.
      </p>
    </div>
    <div style="padding:1.5rem 2.5rem;background:#f8faf8;font-size:0.75rem;color:#4a5a52">
      Nalpop · The Pop-Up Management Platform
    </div>
  </div>
</body></html>`;
}

function declineEmail(app: Application, slug: string) {
  const eventName = slug.charAt(0).toUpperCase() + slug.slice(1);
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
        After reviewing your application, we're unable to offer you a spot at this event. We appreciate you taking the time to apply and hope to see you at a future event.
      </p>
    </div>
    <div style="padding:1.5rem 2.5rem;background:#f8faf8;font-size:0.75rem;color:#4a5a52">
      Nalpop · The Pop-Up Management Platform
    </div>
  </div>
</body></html>`;
}
