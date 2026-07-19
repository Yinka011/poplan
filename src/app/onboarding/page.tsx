"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Onboarding() {
  const [selected, setSelected] = useState<"organizer" | "brand_organizer" | "planner" | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_email", user.email).single();
      if (role?.role === "brand_organizer") { window.location.href = "/brand-organizer"; return; }
      if (role?.role === "organizer") { window.location.href = "/login/organizer/events"; return; }
      if (role?.role === "planner") { window.location.href = "/login/organizer/events"; return; }
    };
    checkRole();
  }, []);

  const handleContinue = async () => {
    if (!selected || !name.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/"; return; }

    await Promise.all([
      supabase.from("user_roles").upsert({ user_email: user.email, role: selected }),
      supabase.from("profiles").upsert({ email: user.email, name: name, organizer_mode: selected }),
    ]);

    if (selected === "brand_organizer") {
      window.location.href = "/brand-organizer";
    } else {
      window.location.href = "/login/organizer/events";
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: "620px", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", margin: "0.5rem auto 1rem" }}></div>
          <h1 style={{ fontSize: "1.5rem", color: "#2c1810", fontWeight: "normal", margin: "0 0 0.5rem" }}>Welcome. Lets get you set up.</h1>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Tell us how you use Poplan so we can personalise your experience.</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem" }}>YOUR NAME OR BRAND NAME</div>
          <input type="text" placeholder="e.g. Wanni Fuga or AO Curates" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: "0.85rem", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#faf8f5", outline: "none", boxSizing: "border-box" as const }} />
        </div>

        <div style={{ fontSize: "0.8rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem", textAlign: "center" }}>WHAT BEST DESCRIBES YOU?</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          <button onClick={() => setSelected("organizer")} style={{ padding: "1.5rem", background: selected === "organizer" ? "#2c1810" : "#fff", color: selected === "organizer" ? "#fff" : "#2c1810", border: "2px solid " + (selected === "organizer" ? "#2c1810" : "#e8e0d5"), borderRadius: "14px", cursor: "pointer", textAlign: "left" as const, fontFamily: "Georgia, serif" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🏪</div>
            <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>I host pop-ups for multiple brands</div>
            <div style={{ fontSize: "0.75rem", color: selected === "organizer" ? "#c8b89a" : "#8b7355", lineHeight: 1.5 }}>Like AO Curates — you curate and manage events, inviting brands to participate.</div>
          </button>

          <button onClick={() => setSelected("brand_organizer")} style={{ padding: "1.5rem", background: selected === "brand_organizer" ? "#2c1810" : "#fff", color: selected === "brand_organizer" ? "#fff" : "#2c1810", border: "2px solid " + (selected === "brand_organizer" ? "#2c1810" : "#e8e0d5"), borderRadius: "14px", cursor: "pointer", textAlign: "left" as const, fontFamily: "Georgia, serif" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>✈️</div>
            <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>I run my own brand across multiple cities</div>
            <div style={{ fontSize: "0.75rem", color: selected === "brand_organizer" ? "#c8b89a" : "#8b7355", lineHeight: 1.5 }}>Like Wanni Fuga — you take your brand to pop-ups in different locations worldwide.</div>
          </button>

          <button onClick={() => setSelected("planner")} style={{ padding: "1.5rem", background: selected === "planner" ? "#2c1810" : "#fff", color: selected === "planner" ? "#fff" : "#2c1810", border: "2px solid " + (selected === "planner" ? "#2c1810" : "#e8e0d5"), borderRadius: "14px", cursor: "pointer", textAlign: "left" as const, fontFamily: "Georgia, serif" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>📋</div>
            <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>I plan pop-ups on behalf of brands</div>
            <div style={{ fontSize: "0.75rem", color: selected === "planner" ? "#c8b89a" : "#8b7355", lineHeight: 1.5 }}>You are hired by brands to organize and manage their pop-up events in specific cities.</div>
          </button>
        </div>

        <button onClick={handleContinue} disabled={!selected || !name.trim() || loading} style={{ width: "100%", padding: "1rem", background: selected && name.trim() ? "#2c1810" : "#d4c5b0", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: selected && name.trim() ? "pointer" : "not-allowed" }}>
          {loading ? "Setting up..." : "Continue →"}
        </button>

      </div>
    </div>
  );
}
