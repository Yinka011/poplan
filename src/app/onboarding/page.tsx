"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const [selected, setSelected] = useState<"multi_brand" | "own_brand" | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleContinue = async () => {
    if (!selected || !name.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/"); return; }
    await supabase.from("profiles").upsert({ email: user.email, name: name, organizer_mode: selected });
    router.push("/login/organizer/events");
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div style={{ maxWidth: "560px", width: "100%" }}>
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

        <div style={{ fontSize: "0.8rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "1rem", textAlign: "center" }}>HOW DO YOU USE POPLAN?</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          <button onClick={() => setSelected("multi_brand")} style={{ padding: "1.5rem", background: selected === "multi_brand" ? "#2c1810" : "#fff", color: selected === "multi_brand" ? "#fff" : "#2c1810", border: "2px solid " + (selected === "multi_brand" ? "#2c1810" : "#e8e0d5"), borderRadius: "14px", cursor: "pointer", textAlign: "left" as const, fontFamily: "Georgia, serif" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>🏪</div>
            <div style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>I organize pop-ups for multiple brands</div>
            <div style={{ fontSize: "0.78rem", color: selected === "multi_brand" ? "#c8b89a" : "#8b7355", lineHeight: 1.5 }}>You host events and invite brands to participate. Like a market or curated pop-up.</div>
          </button>

          <button onClick={() => setSelected("own_brand")} style={{ padding: "1.5rem", background: selected === "own_brand" ? "#2c1810" : "#fff", color: selected === "own_brand" ? "#fff" : "#2c1810", border: "2px solid " + (selected === "own_brand" ? "#2c1810" : "#e8e0d5"), borderRadius: "14px", cursor: "pointer", textAlign: "left" as const, fontFamily: "Georgia, serif" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>✈️</div>
            <div style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>I run my own brand across multiple cities</div>
            <div style={{ fontSize: "0.78rem", color: selected === "own_brand" ? "#c8b89a" : "#8b7355", lineHeight: 1.5 }}>You take your brand to pop-ups in different locations. You manage logistics, staff and shipments.</div>
          </button>
        </div>

        <button onClick={handleContinue} disabled={!selected || !name.trim() || loading} style={{ width: "100%", padding: "1rem", background: selected && name.trim() ? "#2c1810" : "#d4c5b0", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: selected && name.trim() ? "pointer" : "not-allowed" }}>
          {loading ? "Setting up..." : "Continue →"}
        </button>
      </div>
    </div>
  );
}
