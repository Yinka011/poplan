"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

const FEATURE_LIST = [
  { key: "brands", label: "Brand Management", desc: "Invite brands, send access links and track their progress" },
  { key: "payment_tracker", label: "Payment Tracker", desc: "Collect and track participation fees from brands" },
  { key: "inventory", label: "Inventory Review", desc: "Brands upload products, you approve before the event" },
  { key: "shipments", label: "Shipments", desc: "Track brand shipments and deliveries to your venue" },
  { key: "messages", label: "Messaging", desc: "Message brands directly from the platform" },
  { key: "sales", label: "Sales & Payouts", desc: "Square sales data and brand payout calculations" },
  { key: "checklist", label: "Event Checklist", desc: "60+ planning items across venue, brands and logistics" },
  { key: "marketing", label: "Marketing Plans", desc: "Track marketing deadlines across all channels" },
  { key: "planning", label: "Planning Hub", desc: "Decor, refreshments and staffing in one place" },
  { key: "brand_organizer_hub", label: "Brand Organizer Hub", desc: "For brands running their own pop-ups across multiple cities" },
  { key: "attendees", label: "Attendee Registration", desc: "Collect shopper RSVPs and own your audience data" },
  { key: "notifications", label: "Notifications", desc: "Brand activity log and alerts" },
];

type Features = Record<string, boolean>;
const DEFAULT_FEATURES: Features = {
  brands: true, payment_tracker: true, inventory: true, shipments: true,
  messages: true, sales: true, checklist: true, marketing: true,
  planning: true, brand_organizer_hub: false, attendees: true, notifications: true,
};

type FAQ = { id?: number; question: string; answer: string };

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<"features" | "faqs">("features");
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);
  const [eventCity, setEventCity] = useState("");
  const [eventName, setEventName] = useState(slug.charAt(0).toUpperCase() + slug.slice(1));

  // FAQ state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [addingFaq, setAddingFaq] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);

  useEffect(() => { fetchAll(); }, [slug]);

  const fetchAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const orgEmail = user.email || "";

    // Resolve event city from slug
    const { data: eventRow } = await supabase.from("events").select("city, name").eq("slug", slug).maybeSingle();
    const city = eventRow?.city || "";
    setEventCity(city);
    if (eventRow?.name) setEventName(eventRow.name);

    const [featRes, faqRes] = await Promise.all([
      supabase.from("organizer_features").select("*").eq("organizer_email", orgEmail).eq("event_slug", slug).maybeSingle(),
      supabase.from("event_faqs").select("*").eq("event", city).eq("organizer_email", orgEmail).order("id"),
    ]);

    if (featRes.data) {
      const f = featRes.data;
      const merged: Features = { ...DEFAULT_FEATURES };
      for (const key of Object.keys(DEFAULT_FEATURES)) {
        if (f[key] !== undefined) merged[key] = f[key];
      }
      setFeatures(merged);
      setRecordId(f.id);
    }

    if (faqRes.data) {
      setFaqs(faqRes.data.map((r: any) => ({ id: r.id, question: r.question, answer: r.answer })));
    }
  };

  const toggleFeature = (key: keyof Features) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const saveFeatures = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload: any = { organizer_email: user.email, event_slug: slug };
    for (const key of Object.keys(DEFAULT_FEATURES)) {
      payload[key] = features[key];
    }
    await supabase.from("organizer_features").upsert(payload, { onConflict: "organizer_email,event_slug" });
    setSaving(false);
    setSaved(true);
  };

  const addFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    setSavingFaq(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingFaq(false); return; }
    const { data } = await supabase.from("event_faqs").insert({
      event: eventCity,
      organizer_email: user.email,
      question: newFaq.question.trim(),
      answer: newFaq.answer.trim(),
    }).select().single();
    if (data) setFaqs(prev => [...prev, { id: data.id, question: data.question, answer: data.answer }]);
    setNewFaq({ question: "", answer: "" });
    setAddingFaq(false);
    setSavingFaq(false);
  };

  const deleteFaq = async (id: number) => {
    await supabase.from("event_faqs").delete().eq("id", id);
    setFaqs(prev => prev.filter(f => f.id !== id));
  };

  const inp = (extra?: any) => ({ padding: "8px 12px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.84rem", fontFamily: "Georgia, serif", outline: "none", width: "100%", boxSizing: "border-box" as const, ...extra });

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back to event</Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>Settings — {eventName}</div>
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "0", marginBottom: "1.5rem", borderBottom: "2px solid #e4ebe6" }}>
          {([["features", "Dashboard features"], ["faqs", "Brand portal FAQs"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{ padding: "10px 20px", border: "none", background: "transparent", fontSize: "0.85rem", color: activeTab === key ? "#1B3A2D" : "#4a5a52", borderBottom: activeTab === key ? "2px solid #1B3A2D" : "2px solid transparent", marginBottom: "-2px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "features" && (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1.5rem", marginTop: 0 }}>Choose which features appear in your event dashboard. You can change this at any time.</p>
            {FEATURE_LIST.map(feature => (
              <div key={feature.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f4f1" }}>
                <div>
                  <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{feature.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{feature.desc}</div>
                </div>
                <div onClick={() => toggleFeature(feature.key as keyof Features)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: features[feature.key as keyof Features] ? "#1B3A2D" : "#e4ebe6", cursor: "pointer", position: "relative" as const, transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#fff", position: "absolute" as const, top: "3px", left: features[feature.key as keyof Features] ? "23px" : "3px", transition: "left 0.2s" }} />
                </div>
              </div>
            ))}
            <button onClick={saveFeatures} disabled={saving} style={{ marginTop: "1.5rem", width: "100%", padding: "10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.88rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save settings"}
            </button>
          </div>
        )}

        {activeTab === "faqs" && (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1.5rem", marginTop: 0 }}>These FAQs appear in your brands' portal under the FAQ section. Add answers to common questions before your event.</p>

            {faqs.length === 0 && !addingFaq && (
              <div style={{ textAlign: "center" as const, padding: "2rem", color: "#4a5a52", fontSize: "0.82rem" }}>
                No FAQs yet. Add your first one below.
              </div>
            )}

            {faqs.map((faq, i) => (
              <div key={faq.id ?? i} style={{ padding: "12px 0", borderBottom: "1px solid #f0f4f1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", color: "#1B3A2D", fontWeight: 500, marginBottom: "4px" }}>Q: {faq.question}</div>
                    <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>A: {faq.answer}</div>
                  </div>
                  <button onClick={() => faq.id && deleteFaq(faq.id)} style={{ padding: "3px 8px", background: "transparent", border: "1px solid #f0ebe4", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer", color: "#c0392b", flexShrink: 0 }}>Remove</button>
                </div>
              </div>
            ))}

            {addingFaq ? (
              <div style={{ padding: "12px 0", display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                <input placeholder="Question (e.g. What should I bring on the day?)" value={newFaq.question} onChange={e => setNewFaq({ ...newFaq, question: e.target.value })} style={inp()} />
                <textarea placeholder="Answer" value={newFaq.answer} onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })} rows={3} style={{ ...inp(), resize: "vertical" as const }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={addFaq} disabled={savingFaq || !newFaq.question.trim() || !newFaq.answer.trim()} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>{savingFaq ? "..." : "Add FAQ"}</button>
                  <button onClick={() => { setAddingFaq(false); setNewFaq({ question: "", answer: "" }); }} style={{ padding: "7px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddingFaq(true)} style={{ marginTop: "1rem", width: "100%", padding: "10px", background: "transparent", color: "#1B3A2D", border: "1px dashed #1B3A2D44", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add FAQ</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
