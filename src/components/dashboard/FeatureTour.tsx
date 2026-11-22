"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { resolveProfileFeatures } from "@/lib/features";

// Each step declares which feature key enables it (undefined = always shown)
const ALL_STEPS = [
  {
    featureKey: undefined,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-4 0v2M12 12v4M10 14h4"/>
      </svg>
    ),
    title: "Brand portals — free for them",
    body: "Every brand you add gets their own private portal. Send them one link and they can upload their product catalogue, view their tasks and deadlines, track their payout, and message you directly. No app download, no account needed.",
  },
  {
    featureKey: "payment_tracker",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    title: "Payment tracking",
    body: "Track who has paid, who owes, and who is overdue — all from your Brands tab. Mark payments received, add notes, and stop chasing brands across WhatsApp. Everything is in one place and on record.",
  },
  {
    featureKey: "brands",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    title: "Tasks & deadlines",
    body: "Create tasks for yourself or assign them to specific brands — things like \"send logo by Friday\" or \"confirm table size\". Brands see their tasks in their portal and can mark them done. You see everything from your Planning tab.",
  },
  {
    featureKey: "messages",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    title: "Direct messaging",
    body: "Message any brand from your Messages tab. They reply from their portal. All conversations are threaded, searchable, and on record — no more scattered DMs across three platforms.",
  },
  {
    featureKey: "sales",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: "Post-event insights",
    body: "After the event, see which brands generated the most revenue and which products sold fastest. Know who to invite back, who deserves better placement, and which categories your shoppers want more of.",
  },
];

export default function FeatureTour({ slug }: { slug: string }) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState(ALL_STEPS);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("Please sign in to view the feature tour.");

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("feature_tour_seen, default_features")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (profile?.feature_tour_seen) return;

        const features = resolveProfileFeatures(profile?.default_features);
        const filtered = ALL_STEPS.filter(s =>
          s.featureKey === undefined || features[s.featureKey] !== false
        );
        if (active) {
          setSteps(filtered);
          setStep(0);
          setShow(true);
        }
      } catch (error) {
        console.error("Could not load the feature tour:", error);
      }
    };
    void init();
    return () => { active = false; };
  }, [slug]);

  const dismiss = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ feature_tour_seen: true })
        .eq("email", user.email);
    }
    setShow(false);
    setSaving(false);
  };

  if (!show) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,34,25,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "480px",
          overflow: "hidden",
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        <div style={{ background: "#1B3A2D", padding: "1.5rem 1.75rem 1.25rem" }}>
          <div style={{ fontSize: "0.6rem", color: "#E8C97A", letterSpacing: "0.16em", marginBottom: "4px" }}>
            QUICK TOUR — {step + 1} of {steps.length}
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  height: "3px",
                  flex: 1,
                  borderRadius: "2px",
                  background: i <= step ? "#E8C97A" : "rgba(255,255,255,0.15)",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "2rem 1.75rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "rgba(27,58,45,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1B3A2D",
              marginBottom: "1.25rem",
            }}
          >
            {current.icon}
          </div>

          <h2
            style={{

              fontWeight: "normal",
              fontSize: "1.3rem",
              color: "#1B3A2D",
              margin: "0 0 12px",
              lineHeight: 1.3,
            }}
          >
            {current.title}
          </h2>

          <p style={{ fontSize: "0.9rem", color: "#4a5a52", lineHeight: 1.75, margin: 0 }}>
            {current.body}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "1rem 1.75rem 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #e4ebe6",
          }}
        >
          <button
            onClick={dismiss}
            disabled={saving}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "0.8rem",
              color: "#9aaa9f",
              cursor: "pointer",
              padding: "6px 0",
            }}
          >
            Skip tour
          </button>

          <div style={{ display: "flex", gap: "8px" }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  background: "transparent",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  color: "#4a5a52",
                }}
              >
                ← Back
              </button>
            )}
            <button
              onClick={isLast ? dismiss : () => setStep(s => s + 1)}
              disabled={saving}
              style={{
                background: "#1B3A2D",
                border: "none",
                borderRadius: "8px",
                padding: "8px 20px",
                fontSize: "0.82rem",
                cursor: "pointer",
                color: "#fff",
              }}
            >
              {isLast ? "Got it →" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
