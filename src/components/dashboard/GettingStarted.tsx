"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Step = {
  key: string;
  title: string;
  desc: string;
  manual?: boolean;
};

const STEPS: Step[] = [
  {
    key: "created_event",
    title: "Create your first event",
    desc: "Add your event name, city and dates. This is the foundation everything else lives under.",
  },
  {
    key: "added_brand",
    title: "Add a brand",
    desc: "Go into your event dashboard and add your first brand from the Brands tab.",
  },
  {
    key: "sent_invite",
    title: "Send a brand their portal link",
    desc: "From the Brands tab, copy and send the brand their personal portal link so they can upload products, track tasks and message you.",
    manual: true,
  },
  {
    key: "set_venue",
    title: "Set your venue address",
    desc: "From your event dashboard, add the venue address. Brands will see this in their portal.",
  },
  {
    key: "set_spots",
    title: "Set how many spots you have",
    desc: "On your event dashboard, set the total number of brand spots so you can track how many are filled.",
  },
];

export default function GettingStarted({
  myEventsCount,
  onDismiss,
}: {
  myEventsCount: number;
  onDismiss: () => void;
}) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProgress();
  }, [myEventsCount]);

  const loadProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const checks: Record<string, boolean> = {};
    checks["created_event"] = myEventsCount > 0;

    if (checks["created_event"]) {
      const [brandsRes, venueRes, spotsRes] = await Promise.all([
        supabase.from("brands").select("id").eq("organizer_email", user.email).limit(1),
        supabase.from("event_settings").select("venue_address").eq("organizer_email", user.email).not("venue_address", "is", null).limit(1),
        supabase.from("event_settings").select("spots_to_fill").eq("organizer_email", user.email).gt("spots_to_fill", 0).limit(1),
      ]);
      checks["added_brand"] = (brandsRes.data?.length || 0) > 0;
      checks["set_venue"] = (venueRes.data?.length || 0) > 0 && (venueRes.data?.[0]?.venue_address || "").trim() !== "";
      checks["set_spots"] = (spotsRes.data?.length || 0) > 0;
    }

    const { data: profile } = await supabase.from("profiles").select("getting_started").eq("email", user.email).maybeSingle();
    if (profile?.getting_started?.sent_invite) checks["sent_invite"] = true;
    if (profile?.getting_started?.dismissed) { setDismissed(true); onDismiss(); return; }

    setCompleted(checks);
    setLoaded(true);
  };

  const markStep = async (key: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const next = { ...completed, [key]: true };
    setCompleted(next);
    const { data: profile } = await supabase.from("profiles").select("getting_started").eq("email", user.email).maybeSingle();
    const existing = profile?.getting_started || {};
    await supabase.from("profiles").update({ getting_started: { ...existing, [key]: true } }).eq("email", user.email);
  };

  const handleDismiss = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("getting_started").eq("email", user.email).maybeSingle();
      const existing = profile?.getting_started || {};
      await supabase.from("profiles").update({ getting_started: { ...existing, dismissed: true } }).eq("email", user.email);
    }
    setDismissed(true);
    onDismiss();
    setSaving(false);
  };

  if (!loaded || dismissed) return null;

  const completedCount = STEPS.filter(s => completed[s.key]).length;
  const allDone = completedCount === STEPS.length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e4ebe6", marginBottom: "2rem", overflow: "hidden" }}>
      <div style={{ background: "#1B3A2D", padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.65rem", color: "#E8C97A", letterSpacing: "0.12em", marginBottom: "4px" }}>GETTING STARTED</div>
          <div style={{ fontSize: "1rem", color: "#fff" }}>
            {allDone ? "You're all set 🎉" : `${completedCount} of ${STEPS.length} steps complete`}
          </div>
        </div>
        <button
          onClick={handleDismiss}
          disabled={saving}
          style={{ background: "transparent", border: "1px solid #ffffff33", color: "#ffffff88", padding: "4px 12px", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer", fontFamily: "Georgia, serif" }}
        >
          {allDone ? "Dismiss" : "Hide"}
        </button>
      </div>

      <div style={{ height: "3px", background: "#e4ebe6" }}>
        <div style={{ height: "100%", background: "#E8C97A", width: `${progress}%`, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ padding: "0.5rem 1.5rem 1rem" }}>
        {STEPS.map((step, i) => {
          const done = !!completed[step.key];
          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                padding: "12px 0",
                borderBottom: i < STEPS.length - 1 ? "1px solid #f0f4f1" : "none",
                opacity: done ? 0.45 : 1,
              }}
            >
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: `2px solid ${done ? "#4a7c59" : "#e4ebe6"}`,
                  background: done ? "#4a7c59" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                  transition: "all 0.2s",
                }}
              >
                {done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.88rem", color: "#1B3A2D", marginBottom: "3px", textDecoration: done ? "line-through" : "none" }}>
                  {step.title}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#4a5a52", lineHeight: 1.6 }}>{step.desc}</div>
                {step.manual && !done && (
                  <button
                    onClick={() => markStep(step.key)}
                    style={{ marginTop: "6px", fontSize: "0.72rem", padding: "3px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52", fontFamily: "Georgia, serif" }}
                  >
                    Mark as done
                  </button>
                )}
              </div>

              {!done && (
                <div style={{ fontSize: "0.65rem", color: "#d4c5b0", flexShrink: 0, marginTop: "3px" }}>
                  {i + 1}/{STEPS.length}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
