"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const FEATURES = [
  { key: "brands", icon: "🏷", title: "Brand Management", desc: "Invite brands, send access links and track their progress all in one place." },
  { key: "payment_tracker", icon: "💳", title: "Payment Tracker", desc: "Collect and track participation fees from brands. See who has paid, who owes and how much." },
  { key: "inventory", icon: "📦", title: "Inventory Review", desc: "Brands upload their full product catalogue. You approve before connecting to your POS." },
  { key: "shipments", icon: "🚚", title: "Shipments", desc: "Track brand deliveries to your venue. Brands add courier and tracking — you mark received." },
  { key: "messages", icon: "💬", title: "Messaging", desc: "Message brands directly from the platform. No WhatsApp, no email threads." },
  { key: "sales", icon: "💰", title: "Sales & Payouts", desc: "Sync with Square POS after the event. Automatic payout calculations per brand." },
  { key: "checklist", icon: "✅", title: "Event Checklist", desc: "60+ planning items across venue, brands, decor, staff, marketing and logistics." },
  { key: "marketing", icon: "📣", title: "Marketing Plans", desc: "Track marketing deadlines across Instagram, TikTok, Email and more." },
  { key: "planning", icon: "🏗", title: "Planning Hub", desc: "Decor, refreshments and staffing in one place. Assign costs and track spend." },
  { key: "brand_organizer_hub", icon: "🌍", title: "Brand Organizer Hub", desc: "For brands running their own pop-ups across multiple cities. Budget, planning and team access per city." },
  { key: "attendees", icon: "👥", title: "Attendee Registration", desc: "Collect shopper RSVPs and own your audience data." },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<"role" | "welcome" | "features">("role");
  const [selected, setSelected] = useState<"organizer" | "brand_organizer" | "planner" | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [features, setFeatures] = useState<Record<string, boolean>>({
    brands: true, payment_tracker: true, inventory: true, shipments: true,
    messages: true, sales: false, checklist: true, marketing: false,
    planning: false, brand_organizer_hub: false, attendees: false,
  });

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setChecking(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_email", user.email).limit(1);
      const role = roles?.[0]?.role;
      if (role === "brand_organizer") { router.push("/brand-organizer"); return; }
      if (role === "organizer" || role === "planner") { router.push("/login/organizer/events"); return; }
      setChecking(false);
    };
    checkRole();
  }, []);

  const handleRoleContinue = async () => {
    if (!selected || !name.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    await Promise.all([
      supabase.from("user_roles").upsert({ user_email: user.email, role: selected }),
      supabase.from("profiles").upsert({ email: user.email, name, organizer_mode: selected }),
    ]);
    if (selected === "brand_organizer") { router.push("/brand-organizer"); return; }
    if (selected === "planner") { router.push("/login/organizer/events"); return; }
    setStep("welcome");
    setLoading(false);
  };

  const handleFeaturesSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    // Save features to profile so they persist across devices
    await supabase.from("profiles").update({ default_features: features }).eq("email", user.email);
    // Also store in localStorage as backup
    localStorage.setItem("nalpop_onboarding_features", JSON.stringify(features));
    router.push("/login/organizer/events");
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>
  );

  // STEP: WELCOME
  if (step === "welcome") return (
    <div style={{ minHeight: "100vh", background: "#1B3A2D", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "4rem 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <div style={{ fontSize: "1.2rem", letterSpacing: "0.2em", color: "#E8C97A", marginBottom: "1rem" }}>NALPOP</div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", color: "#fff", fontWeight: "normal", lineHeight: 1.2, marginBottom: "1rem" }}>
            Welcome, {name.split(" ")[0]}. 🌿
          </h1>
          <p style={{ fontSize: "1rem", color: "#ffffff88", maxWidth: "560px", margin: "0 auto", lineHeight: 1.8 }}>
            Nalpop is the platform built for pop-up culture. Here is everything you and your brands get.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "3rem" }}>
          {/* For organizer */}
          <div style={{ background: "#ffffff11", borderRadius: "16px", padding: "2rem", border: "1px solid #ffffff22" }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.15em", color: "#E8C97A", marginBottom: "1.25rem" }}>FOR YOU AS THE ORGANIZER</div>
            {[
              "Invite brands and send them access links",
              "Collect and track participation fees",
              "Review brand inventory before the event",
              "Track shipments — know what is arriving and when",
              "Plan decor, refreshments and staffing",
              "Sync with Square POS and calculate payouts",
              "Collect shopper RSVPs and own your audience",
              "Message brands directly — no WhatsApp needed",
            ].map(item => (
              <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#E8C97A", marginTop: "7px", flexShrink: 0 }} />
                <div style={{ fontSize: "0.85rem", color: "#ffffffcc", lineHeight: 1.5 }}>{item}</div>
              </div>
            ))}
          </div>

          {/* For brands */}
          <div style={{ background: "#ffffff11", borderRadius: "16px", padding: "2rem", border: "1px solid #ffffff22" }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.15em", color: "#E8C97A", marginBottom: "1.25rem" }}>WHAT YOUR BRANDS GET</div>
            {[
              "Their own branded portal — always free",
              "Upload their full product catalogue with photos",
              "Add shipment tracking details",
              "See tasks and deadlines from you",
              "Message you directly from their portal",
              "View their sales and payout after the event",
              "Upload files — logo, lookbook, marketing assets",
              "Get email notifications for every update",
            ].map(item => (
              <div key={item} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4a7c59", marginTop: "7px", flexShrink: 0 }} />
                <div style={{ fontSize: "0.85rem", color: "#ffffffcc", lineHeight: 1.5 }}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={() => setStep("features")} style={{ padding: "14px 48px", background: "#E8C97A", color: "#1B3A2D", border: "none", borderRadius: "10px", fontSize: "1rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
            Choose my features →
          </button>
          <div style={{ fontSize: "0.78rem", color: "#ffffff44", marginTop: "1rem" }}>You can change these at any time in Settings</div>
        </div>
      </div>
    </div>
  );

  // STEP: FEATURES
  if (step === "features") return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1B3A2D", padding: "1.5rem 2rem", textAlign: "center" }}>
        <div style={{ fontSize: "1rem", letterSpacing: "0.2em", color: "#fff" }}>NALPOP</div>
      </div>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "3rem 2rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "1.8rem", color: "#1B3A2D", fontWeight: "normal", marginBottom: "0.5rem" }}>Build your dashboard</h1>
          <p style={{ fontSize: "0.9rem", color: "#4a5a52" }}>Choose what you need. You can always change this later in Settings.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2.5rem" }}>
          {FEATURES.map(feature => (
            <div key={feature.key} onClick={() => setFeatures(prev => ({ ...prev, [feature.key]: !prev[feature.key] }))} style={{ background: "#fff", borderRadius: "14px", padding: "1.25rem", border: `2px solid ${features[feature.key] ? "#1B3A2D" : "#e4ebe6"}`, cursor: "pointer", transition: "all 0.15s", position: "relative" as const }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{feature.icon}</div>
                <div style={{ width: "40px", height: "22px", borderRadius: "11px", background: features[feature.key] ? "#1B3A2D" : "#e4ebe6", position: "relative" as const, transition: "background 0.2s", flexShrink: 0 }}>
                  <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute" as const, top: "3px", left: features[feature.key] ? "21px" : "3px", transition: "left 0.2s" }} />
                </div>
              </div>
              <div style={{ fontSize: "0.92rem", color: "#1B3A2D", marginBottom: "4px" }}>{feature.title}</div>
              <div style={{ fontSize: "0.78rem", color: "#4a5a52", lineHeight: 1.5 }}>{feature.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={handleFeaturesSave} disabled={loading} style={{ padding: "14px 48px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "1rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
            {loading ? "Setting up..." : "Build my dashboard →"}
          </button>
          <div style={{ fontSize: "0.78rem", color: "#4a5a52", marginTop: "1rem" }}>
            {Object.values(features).filter(Boolean).length} features selected
          </div>
        </div>
      </div>
    </div>
  );

  // STEP: ROLE (default)
  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: "620px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#1B3A2D" }}>NALPOP</div>
          <div style={{ width: "2rem", height: "1px", background: "#E8C97A", margin: "0.5rem auto 1rem" }}></div>
          <h1 style={{ fontSize: "1.5rem", color: "#1B3A2D", fontWeight: "normal", margin: "0 0 0.5rem" }}>Welcome. Let us get you set up.</h1>
          <p style={{ color: "#4a5a52", fontSize: "0.9rem" }}>Tell us how you use Nalpop so we can personalise your experience.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e4ebe6", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "1rem" }}>YOUR NAME OR ORGANISATION NAME</div>
          <input type="text" placeholder="e.g. AO Curates" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "0.85rem", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#f8faf8", outline: "none", boxSizing: "border-box" as const }} />
        </div>

        <div style={{ fontSize: "0.8rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "1rem", textAlign: "center" as const }}>WHAT BEST DESCRIBES YOU?</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { key: "organizer", icon: "🏪", title: "I host pop-ups for multiple brands", desc: "You curate and manage events, inviting brands to participate." },
            { key: "brand_organizer", icon: "✈️", title: "I run my own brand across multiple cities", desc: "You take your brand to pop-ups in different locations worldwide." },
            { key: "planner", icon: "📋", title: "I plan pop-ups on behalf of brands", desc: "You are hired by brands to organize and manage their pop-up events." },
          ].map(role => (
            <button key={role.key} onClick={() => setSelected(role.key as any)} style={{ padding: "1.5rem", background: selected === role.key ? "#1B3A2D" : "#fff", color: selected === role.key ? "#fff" : "#1B3A2D", border: `2px solid ${selected === role.key ? "#1B3A2D" : "#e4ebe6"}`, borderRadius: "14px", cursor: "pointer", textAlign: "left" as const, fontFamily: "Georgia, serif" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{role.icon}</div>
              <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>{role.title}</div>
              <div style={{ fontSize: "0.75rem", color: selected === role.key ? "#d4c87a" : "#4a5a52", lineHeight: 1.5 }}>{role.desc}</div>
            </button>
          ))}
        </div>

        <button onClick={handleRoleContinue} disabled={!selected || !name.trim() || loading} style={{ width: "100%", padding: "1rem", background: selected && name.trim() ? "#1B3A2D" : "#d4c5b0", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: selected && name.trim() ? "pointer" : "not-allowed" }}>
          {loading ? "Setting up..." : "Continue →"}
        </button>
      </div>
    </div>
  );
}
