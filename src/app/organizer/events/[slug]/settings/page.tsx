"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatEventName } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import { DEFAULT_FEATURES, resolveProfileFeatures, type Features } from "@/lib/features";

const FEATURE_LIST = [
  {
    key: "brands",
    label: "Brand Management",
    desc: "Invite brands, send access links and track their progress",
  },
  {
    key: "payment_tracker",
    label: "Payment Tracker",
    desc: "Collect and track participation fees from brands",
  },
  {
    key: "inventory",
    label: "Inventory Review",
    desc: "Brands upload products, you approve before the event",
  },
  {
    key: "shipments",
    label: "Shipments",
    desc: "Track brand shipments and deliveries to your venue",
  },
  {
    key: "messages",
    label: "Messaging",
    desc: "Message brands directly from the platform",
  },
  {
    key: "sales",
    label: "Sales & Payouts",
    desc: "Square sales data and brand payout calculations",
  },
  {
    key: "checklist",
    label: "Event Checklist",
    desc: "60+ planning items across venue, brands and logistics",
  },
  {
    key: "marketing",
    label: "Marketing Plans",
    desc: "Track marketing deadlines across all channels",
  },
  {
    key: "planning",
    label: "Planning Hub",
    desc: "Decor, refreshments and staffing in one place",
  },
  {
    key: "brand_organizer_hub",
    label: "Brand Organizer Hub",
    desc: "For brands running their own pop-ups across multiple cities",
  },
  {
    key: "attendees",
    label: "Attendee Registration",
    desc: "Collect shopper RSVPs and own your audience data",
  },
  {
    key: "notifications",
    label: "Notifications",
    desc: "Brand activity log and alerts",
  },
];

type FAQ = { id?: number; question: string; answer: string };

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [activeTab, setActiveTab] = useState<"features" | "payments" | "faqs">("features");
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [profileFeatureValues, setProfileFeatureValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [loadedSlug, setLoadedSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [eventCity, setEventCity] = useState("");
  const [eventName, setEventName] = useState(
    slug.charAt(0).toUpperCase() + slug.slice(1),
  );
  const [collectPayments, setCollectPayments] = useState(true);
  const [savingPayments, setSavingPayments] = useState(false);
  const [savedPayments, setSavedPayments] = useState(false);

  // FAQ state
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });
  const [addingFaq, setAddingFaq] = useState(false);
  const [savingFaq, setSavingFaq] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user?.email) throw new Error("Please sign in to view settings.");

        const [eventRes, profileRes, faqRes] = await Promise.all([
          supabase.from("events").select("city, name, collect_payments").eq("slug", slug).maybeSingle(),
          supabase.from("profiles").select("default_features").eq("id", user.id).maybeSingle(),
          supabase.from("event_faqs").select("*").eq("event", formatEventName(slug)).eq("organizer_email", user.email).order("id"),
        ]);
        const error = eventRes.error || profileRes.error || faqRes.error;
        if (error) throw error;

        const profileDefaults: unknown = profileRes.data?.default_features;
        if (profileDefaults != null && (typeof profileDefaults !== "object" || Array.isArray(profileDefaults))) {
          throw new Error("Profile default features must be an object.");
        }
        const merged = resolveProfileFeatures(profileDefaults);

        if (!active) return;
        setFeatures(merged);
        setProfileFeatureValues(profileDefaults ? { ...profileDefaults } : {});
        setEventCity(eventRes.data?.city || "");
        setEventName(eventRes.data?.name || slug.charAt(0).toUpperCase() + slug.slice(1));
        setCollectPayments(eventRes.data?.collect_payments !== false);
        setFaqs((faqRes.data ?? []).map((r) => ({
          id: r.id,
          question: r.question,
          answer: r.answer,
        })));
      } catch (error) {
        console.error("Could not load event settings:", error);
        if (active) setLoadError("Could not load event settings. Please try again.");
      } finally {
        if (active) {
          setLoadedSlug(slug);
          setLoading(false);
        }
      }
    };
    void fetchAll();
    return () => { active = false; };
  }, [slug, retry]);

  const toggleFeature = (key: keyof Features) => {
    if (saving) return;
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const saveFeatures = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please sign in to save settings.");
      const { error } = await supabase
        .from("profiles")
        .update({ default_features: { ...profileFeatureValues, ...features } })
        .eq("id", user.id)
        .select("id")
        .single();
      if (error) throw error;
      setSaved(true);
    } catch (error) {
      console.error("Could not save dashboard features:", error);
      alert("Could not save dashboard features. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const savePaymentSettings = async () => {
    setSavingPayments(true);
    await supabase
      .from("events")
      .update({ collect_payments: collectPayments })
      .eq("slug", slug);
    setSavingPayments(false);
    setSavedPayments(true);
  };

  const addFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    setSavingFaq(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSavingFaq(false);
      return;
    }
    const { data } = await supabase
      .from("event_faqs")
      .insert({
        event: formatEventName(slug),
        organizer_email: user.email,
        question: newFaq.question.trim(),
        answer: newFaq.answer.trim(),
      })
      .select()
      .single();
    if (data)
      setFaqs((prev) => [
        ...prev,
        { id: data.id, question: data.question, answer: data.answer },
      ]);
    setNewFaq({ question: "", answer: "" });
    setAddingFaq(false);
    setSavingFaq(false);
  };

  const deleteFaq = async (id: number) => {
    await supabase.from("event_faqs").delete().eq("id", id);
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  const inp = (extra?: any) => ({
    padding: "8px 12px",
    border: "1px solid #e4ebe6",
    borderRadius: "8px",
    fontSize: "0.84rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
    ...extra,
  });

  return (
    <div
      className="[overflow-wrap:anywhere]"
      style={{ minHeight: "100vh", background: "#f8faf8" }}
    >
      <div
        style={{
          background: "#1B3A2D",
          padding: "1rem 2rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <Link
          href={`/organizer/events/${slug}`}
          style={{
            fontSize: "0.8rem",
            color: "#E8C97A",
            textDecoration: "none",
          }}
        >
          ← Back to event
        </Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>
          Settings — {eventName}
        </div>
      </div>

      <div
        style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        <LoadingView loading={loading || loadedSlug !== slug} error={loadError} onRetry={() => setRetry((value) => value + 1)}>
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0",
            marginBottom: "1.5rem",
            borderBottom: "2px solid #e4ebe6",
          }}
        >
          {(
            [
              ["features", "Dashboard features"],
              ["payments", "Payment settings"],
              ["faqs", "Brand portal FAQs"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "10px 20px",
                border: "none",
                background: "transparent",
                fontSize: "0.85rem",
                color: activeTab === key ? "#1B3A2D" : "#4a5a52",
                borderBottom:
                  activeTab === key
                    ? "2px solid #1B3A2D"
                    : "2px solid transparent",
                marginBottom: "-2px",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "features" && (
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "1.5rem",
              border: "1px solid #e4ebe6",
            }}
          >
            <p
              style={{
                fontSize: "0.82rem",
                color: "#4a5a52",
                marginBottom: "1.5rem",
                marginTop: 0,
              }}
            >
              Choose which features appear in your dashboards. These settings
              are saved to your profile and apply across your events.
            </p>
            {FEATURE_LIST.map((feature) => (
              <div
                key={feature.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid #f0f4f1",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>
                    {feature.label}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>
                    {feature.desc}
                  </div>
                </div>
                <div
                  onClick={() => toggleFeature(feature.key as keyof Features)}
                  style={{
                    width: "44px",
                    height: "24px",
                    borderRadius: "12px",
                    background: features[feature.key as keyof Features]
                      ? "#1B3A2D"
                      : "#e4ebe6",
                    cursor: "pointer",
                    position: "relative" as const,
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      background: "#fff",
                      position: "absolute" as const,
                      top: "3px",
                      left: features[feature.key as keyof Features]
                        ? "23px"
                        : "3px",
                      transition: "left 0.2s",
                    }}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={saveFeatures}
              disabled={saving}
              style={{
                marginTop: "1.5rem",
                width: "100%",
                padding: "10px",
                background: "#1B3A2D",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save settings"}
            </button>
          </div>
        )}

        {activeTab === "payments" && (
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "1.5rem",
              border: "1px solid #e4ebe6",
            }}
          >
            <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1.5rem", marginTop: 0 }}>
              Control whether this event collects participation fees from brands. When turned off, payment badges and fee tracking are hidden from your brands.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 0",
                borderBottom: "1px solid #f0f4f1",
              }}
            >
              <div>
                <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>Collect participation fees</div>
                <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>
                  {collectPayments
                    ? "Brands will see payment status and fee tracker"
                    : "Payment badges and fee tracker are hidden from brands"}
                </div>
              </div>
              <div
                onClick={() => { setCollectPayments((v) => !v); setSavedPayments(false); }}
                style={{
                  width: "44px",
                  height: "24px",
                  borderRadius: "12px",
                  background: collectPayments ? "#1B3A2D" : "#e4ebe6",
                  cursor: "pointer",
                  position: "relative" as const,
                  transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: "#fff",
                    position: "absolute" as const,
                    top: "3px",
                    left: collectPayments ? "23px" : "3px",
                    transition: "left 0.2s",
                  }}
                />
              </div>
            </div>
            <button
              onClick={savePaymentSettings}
              disabled={savingPayments}
              style={{
                marginTop: "1.5rem",
                width: "100%",
                padding: "10px",
                background: "#1B3A2D",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              {savingPayments ? "Saving..." : savedPayments ? "✓ Saved" : "Save settings"}
            </button>
          </div>
        )}

        {activeTab === "faqs" && (
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "1.5rem",
              border: "1px solid #e4ebe6",
            }}
          >
            <p
              style={{
                fontSize: "0.82rem",
                color: "#4a5a52",
                marginBottom: "1.5rem",
                marginTop: 0,
              }}
            >
              These FAQs appear in your brands' portal under the FAQ section.
              Add answers to common questions before your event.
            </p>

            {faqs.length === 0 && !addingFaq && (
              <div
                style={{
                  textAlign: "center" as const,
                  padding: "2rem",
                  color: "#4a5a52",
                  fontSize: "0.82rem",
                }}
              >
                No FAQs yet. Add your first one below.
              </div>
            )}

            {faqs.map((faq, i) => (
              <div
                key={faq.id ?? i}
                style={{ padding: "12px 0", borderBottom: "1px solid #f0f4f1" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#1B3A2D",
                        fontWeight: 500,
                        marginBottom: "4px",
                      }}
                    >
                      Q: {faq.question}
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                      A: {faq.answer}
                    </div>
                  </div>
                  <button
                    onClick={() => faq.id && deleteFaq(faq.id)}
                    style={{
                      padding: "3px 8px",
                      background: "transparent",
                      border: "1px solid #f0ebe4",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      color: "#c0392b",
                      flexShrink: 0,
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {addingFaq ? (
              <div
                style={{
                  padding: "12px 0",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "8px",
                }}
              >
                <input
                  placeholder="Question (e.g. What should I bring on the day?)"
                  value={newFaq.question}
                  onChange={(e) =>
                    setNewFaq({ ...newFaq, question: e.target.value })
                  }
                  style={inp()}
                />
                <textarea
                  placeholder="Answer"
                  value={newFaq.answer}
                  onChange={(e) =>
                    setNewFaq({ ...newFaq, answer: e.target.value })
                  }
                  rows={3}
                  style={{ ...inp(), resize: "vertical" as const }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={addFaq}
                    disabled={
                      savingFaq ||
                      !newFaq.question.trim() ||
                      !newFaq.answer.trim()
                    }
                    style={{
                      padding: "7px 16px",
                      background: "#1B3A2D",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    {savingFaq ? "..." : "Add FAQ"}
                  </button>
                  <button
                    onClick={() => {
                      setAddingFaq(false);
                      setNewFaq({ question: "", answer: "" });
                    }}
                    style={{
                      padding: "7px 12px",
                      background: "transparent",
                      border: "1px solid #e4ebe6",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingFaq(true)}
                style={{
                  marginTop: "1rem",
                  width: "100%",
                  padding: "10px",
                  background: "transparent",
                  color: "#1B3A2D",
                  border: "1px dashed #1B3A2D44",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                + Add FAQ
              </button>
            )}
          </div>
        )}
        </LoadingView>
      </div>
    </div>
  );
}
