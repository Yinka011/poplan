"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import LoadingView from "@/components/LoadingView";
import PageSkeleton from "@/components/shared/PageSkeleton";

export default function AttendPage() {
  const params = useParams();
  const slug = params.slug as string;
  return <AttendEvent key={slug} slug={slug} />;
}

function AttendEvent({ slug }: { slug: string }) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [brands, setBrands] = useState<{name: string}[]>([]);
  const [eventInfo, setEventInfo] = useState<{name: string; dates_label: string; venue_address: string; city: string} | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [emailFailed, setEmailFailed] = useState(false);
  const submittingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", city: "", country: "",
    heard_from: "", excited_brands: [] as string[],
  });

  useEffect(() => {
    let active = true;
    const fetchEventInfo = async () => {
    setLoading(true);
    setLoadError("");
    try {
    const eventName = slug.split("-").slice(0, -1).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    const [eventRes, brandsRes] = await Promise.all([
      supabase.from("events").select("name, dates_label, city").eq("slug", slug).maybeSingle(),
      supabase.from("brands").select("name").eq("event", eventName).order("name"),
    ]);
    if (eventRes.error || brandsRes.error) throw eventRes.error || brandsRes.error;
    if (!active) return;
    setEventInfo(eventRes.data ? { ...eventRes.data, venue_address: "" } : null);
    if (brandsRes.data) setBrands(brandsRes.data);
    } catch (error) {
      console.error("Could not load event:", error);
      if (active) setLoadError("Could not load event details. Please try again.");
    } finally {
      if (active) setLoading(false);
    }
    };
    void fetchEventInfo();
    return () => { active = false; };
  }, [slug, retry]);

  const toggleBrand = (name: string) => {
    setForm(prev => ({
      ...prev,
      excited_brands: prev.excited_brands.includes(name)
        ? prev.excited_brands.filter(b => b !== name)
        : [...prev.excited_brands, name],
    }));
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!form.name.trim() || !form.email.trim()) { alert("Enter your name and email."); return; }
    submittingRef.current = true;
    setSubmitting(true);
    try {
    const { error } = await supabase.from("shopper_registrations").insert({
      event_slug: slug,
      name: form.name,
      email: form.email,
      phone: form.phone,
      city: form.city,
      country: form.country,
      heard_from: form.heard_from,
      excited_brands: form.excited_brands,
    });
    if (error) throw error;
    // Send confirmation email
    try {
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: form.email,
        subject: `You are registered for ${eventInfo?.name || "the pop-up"}!`,
        html: `<div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 2rem;">
          <h2 style="color: #1B3A2D;">See you there, ${form.name}! 🎉</h2>
          <p style="color: #4a5a52;">You are registered for <strong>${eventInfo?.name || "the pop-up"}</strong>.</p>
          ${eventInfo?.dates_label ? `<p style="color: #4a5a52;">📅 ${eventInfo.dates_label}</p>` : ""}
          <p style="color: #4a5a52;">We will send you updates and reminders as the event approaches.</p>
          <p style="color: #4a5a52; margin-top: 2rem;">— The Nalpop Team</p>
        </div>`,
      }),
    });
    if (!response.ok) throw new Error("Confirmation email failed.");
    } catch (error) {
      console.error("Registration saved but confirmation email failed:", error);
      setEmailFailed(true);
      alert("You are registered, but we could not send your confirmation email.");
    }
    setStep("success");
    } catch (error) {
      console.error("Registration failed:", error);
      alert("Could not complete registration. Please try again.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const inp = (extra?: object) => ({
    width: "100%", padding: "10px 12px", border: "1px solid #e4ebe6",
    borderRadius: "8px", fontSize: "0.88rem",
    boxSizing: "border-box" as const, outline: "none", ...extra,
  });

  if (loading || loadError) return <LoadingView loading={loading} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<PageSkeleton label="Loading event registration" />} page />;

  if (step === "success") return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center",  padding: "2rem" }}>
      <div style={{ textAlign: "center", maxWidth: "420px" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
        <div style={{ fontSize: "1.5rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>You are registered!</div>
        <p style={{ fontSize: "0.88rem", color: "#4a5a52", marginBottom: "1.5rem" }}>{emailFailed ? "Your registration is saved, but we could not send a confirmation email." : "Check your email for confirmation. We will keep you updated as the event approaches."}</p>
        <div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>Powered by <span style={{ color: "#1B3A2D" }}>Nalpop</span></div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8" }}>
      {/* Header */}
      <div style={{ background: "#1B3A2D", padding: "2rem", textAlign: "center" }}>
        <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#fff", marginBottom: "0.5rem" }}>NALPOP</div>
        <div style={{ fontSize: "1.6rem", color: "#E8C97A", marginBottom: "0.25rem" }}>{eventInfo?.name || "Pop-up Event"}</div>
        {eventInfo?.dates_label && <div style={{ fontSize: "0.88rem", color: "#ffffff88" }}>📅 {eventInfo.dates_label}</div>}
        {eventInfo?.city && <div style={{ fontSize: "0.82rem", color: "#ffffff66", marginTop: "4px" }}>📍 {eventInfo.city}</div>}
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>Register to attend</div>
          <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1.5rem" }}>Free entry. Register to get updates and reminders.</p>

          <fieldset disabled={submitting} style={{ display: "flex", flexDirection: "column" as const, gap: "12px", border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>FULL NAME *</div>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" style={inp()} />
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>EMAIL *</div>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="your@email.com" style={inp()} />
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>PHONE (optional)</div>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+1 000 000 0000" style={inp()} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>CITY</div>
                <input value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="Atlanta" style={inp()} />
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>COUNTRY</div>
                <input value={form.country} onChange={e => setForm({...form, country: e.target.value})} placeholder="USA" style={inp()} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "4px" }}>HOW DID YOU HEAR ABOUT US?</div>
              <select value={form.heard_from} onChange={e => setForm({...form, heard_from: e.target.value})} style={inp()}>
                <option value="">Select...</option>
                {["Instagram", "TikTok", "Twitter/X", "Facebook", "Friend or family", "Email", "Google", "Other"].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {brands.length > 0 && (
              <div>
                <div style={{ fontSize: "0.7rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "8px" }}>WHICH BRANDS ARE YOU EXCITED TO SEE? (optional)</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "6px" }}>
                  {brands.map(brand => (
                    <button key={brand.name} onClick={() => toggleBrand(brand.name)} style={{ padding: "5px 12px", borderRadius: "20px", border: "1px solid " + (form.excited_brands.includes(brand.name) ? "#1B3A2D" : "#e4ebe6"), background: form.excited_brands.includes(brand.name) ? "#1B3A2D" : "#fff", color: form.excited_brands.includes(brand.name) ? "#fff" : "#4a5a52", fontSize: "0.78rem", cursor: "pointer" }}>
                      {brand.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleSubmit} disabled={submitting || !form.name.trim() || !form.email.trim()} style={{ width: "100%", padding: "12px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer",  marginTop: "0.5rem" }}>
              {submitting ? "Registering..." : "Register for free →"}
            </button>
          </fieldset>
        </div>
        <div style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.72rem", color: "#4a5a52" }}>Powered by Nalpop · Free entry</div>
      </div>
    </div>
  );
}
