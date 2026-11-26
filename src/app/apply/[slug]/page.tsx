"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";

type EventInfo = {
  name: string;
  city: string;
  dates_label: string;
  venue_name: string;
  venue_address: string;
  spots: number | null;
  has_participation_fee: boolean;
  has_commission: boolean;
  applications_open: boolean;
};

type FormData = {
  brand_name: string;
  contact_name: string;
  email: string;
  phone: string;
  instagram: string;
  website: string;
  category: string;
  description: string;
  heard_from: string;
};

const CATEGORIES = [
  "Fashion & Apparel",
  "Jewellery & Accessories",
  "Beauty & Skincare",
  "Home & Lifestyle",
  "Food & Beverage",
  "Art & Prints",
  "Kids & Baby",
  "Other",
];

const HEARD_FROM = [
  "Instagram",
  "Word of mouth",
  "Previous event",
  "Google",
  "Other",
];

export default function ApplyPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [closed, setClosed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormData>({
    brand_name: "", contact_name: "", email: "", phone: "",
    instagram: "", website: "", category: "", description: "", heard_from: "",
  });

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from("events")
        .select("name, city, dates_label, venue_name, venue_address, spots, has_participation_fee, has_commission, applications_open")
        .eq("slug", slug)
        .maybeSingle();

      if (!data) { setNotFound(true); setLoading(false); return; }
      if (!data.applications_open) { setClosed(true); }
      setEvent(data);
      setLoading(false);
    };
    fetchEvent();
  }, [slug]);

  const set = (key: keyof FormData, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand_name.trim() || !form.contact_name.trim() || !form.email.trim() || !form.category || !form.description.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    const { error: dbError } = await supabase.from("brand_applications").insert({
      event_slug: slug,
      brand_name: form.brand_name.trim(),
      contact_name: form.contact_name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      instagram: form.instagram.trim() || null,
      website: form.website.trim() || null,
      category: form.category,
      description: form.description.trim(),
      heard_from: form.heard_from || null,
      status: "pending",
    });
    if (dbError) {
      if (dbError.message?.includes("duplicate") || dbError.message?.includes("unique")) {
        setError("An application from this email already exists for this event.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
  };

  const inp = (extra?: any) => ({
    padding: "10px 14px",
    border: "1px solid #e4ebe6",
    borderRadius: "10px",
    fontSize: "0.88rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    background: "#fff",
    ...extra,
  });

  const label = (text: string, required = false) => (
    <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "5px" }}>
      {text}{required && <span style={{ color: "#c0392b" }}> *</span>}
    </div>
  );

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", color: "#4a5a52" }}>
      Loading…
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "#4a5a52" }}>
        <div style={{ fontSize: "1.2rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>Event not found</div>
        <div style={{ fontSize: "0.85rem" }}>This apply link may be invalid or the event no longer exists.</div>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: "480px", width: "100%", textAlign: "center" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#1B3A2D", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", fontSize: "1.5rem" }}>✓</div>
        <div style={{ fontSize: "1.3rem", color: "#1B3A2D", marginBottom: "0.75rem" }}>Application received</div>
        <div style={{ fontSize: "0.88rem", color: "#4a5a52", lineHeight: 1.7 }}>
          Thanks for applying to <strong>{event?.name}</strong>. The organiser will review your application and be in touch via email.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8" }}>
      {/* Header */}
      <div style={{ background: "#1B3A2D", padding: "1.5rem 2rem" }}>
        <div style={{ fontSize: "1.2rem", letterSpacing: "0.2em", color: "#E8C97A" }}>NALPOP</div>
        <div style={{ fontSize: "0.72rem", color: "#ffffff66", letterSpacing: "0.08em" }}>THE POP-UP MANAGEMENT PLATFORM</div>
      </div>

      <div style={{ maxWidth: "620px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Event card */}
        <div style={{ background: "#1B3A2D", borderRadius: "16px", padding: "1.5rem 2rem", marginBottom: "2rem", color: "#fff" }}>
          <div style={{ fontSize: "0.7rem", color: "#E8C97A", letterSpacing: "0.1em", marginBottom: "6px" }}>BRAND APPLICATION</div>
          <div style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>{event?.name}</div>
          <div style={{ fontSize: "0.82rem", color: "#ffffff99", marginBottom: "1rem" }}>
            {event?.city}{event?.dates_label ? ` · ${event.dates_label}` : ""}
            {event?.venue_name ? ` · ${event.venue_name}` : ""}
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {event?.has_participation_fee && (
              <div style={{ background: "#ffffff18", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", color: "#E8C97A" }}>
                Participation fee applies
              </div>
            )}
            {event?.has_commission && (
              <div style={{ background: "#ffffff18", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", color: "#E8C97A" }}>
                Commission applies
              </div>
            )}
            {!event?.has_participation_fee && !event?.has_commission && (
              <div style={{ background: "#ffffff18", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", color: "#ffffff99" }}>
                No fee · No commission
              </div>
            )}
            {event?.spots && (
              <div style={{ background: "#ffffff18", borderRadius: "20px", padding: "4px 12px", fontSize: "0.75rem", color: "#ffffff99" }}>
                {event.spots} brand spots
              </div>
            )}
          </div>
        </div>

        {closed ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "2rem", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
            <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>Applications are closed</div>
            <div style={{ fontSize: "0.85rem", color: "#4a5a52" }}>This event is not currently accepting brand applications.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6", display: "flex", flexDirection: "column" as const, gap: "16px" }}>
              <div style={{ fontSize: "0.85rem", color: "#4a5a52", lineHeight: 1.6, marginBottom: "4px" }}>
                Tell us about your brand. The organiser will review your application and reach out via email.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  {label("BRAND NAME", true)}
                  <input value={form.brand_name} onChange={e => set("brand_name", e.target.value)} placeholder="Your brand name" style={inp()} />
                </div>
                <div>
                  {label("YOUR NAME", true)}
                  <input value={form.contact_name} onChange={e => set("contact_name", e.target.value)} placeholder="Full name" style={inp()} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  {label("EMAIL", true)}
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="hello@yourbrand.com" style={inp()} />
                </div>
                <div>
                  {label("PHONE")}
                  <input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Optional" style={inp()} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  {label("INSTAGRAM")}
                  <input value={form.instagram} onChange={e => set("instagram", e.target.value)} placeholder="@yourbrand" style={inp()} />
                </div>
                <div>
                  {label("WEBSITE")}
                  <input value={form.website} onChange={e => set("website", e.target.value)} placeholder="yourbrand.com" style={inp()} />
                </div>
              </div>

              <div>
                {label("CATEGORY", true)}
                <select value={form.category} onChange={e => set("category", e.target.value)} style={inp()}>
                  <option value="">Select a category</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                {label("TELL US ABOUT YOUR BRAND", true)}
                <textarea
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  placeholder="What do you sell? What makes your brand special? Why do you want to join this event?"
                  rows={4}
                  style={{ ...inp(), resize: "vertical" as const }}
                />
              </div>

              <div>
                {label("HOW DID YOU HEAR ABOUT THIS EVENT?")}
                <select value={form.heard_from} onChange={e => set("heard_from", e.target.value)} style={inp()}>
                  <option value="">Select one</option>
                  {HEARD_FROM.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 14px", fontSize: "0.82rem", color: "#c0392b" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{ padding: "12px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.9rem", cursor: submitting ? "wait" : "pointer", marginTop: "4px" }}
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
