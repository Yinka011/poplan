"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [mode, setMode] = useState<"home" | "brand-login">("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBrandLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }
    window.location.href = "/brand/portal";
  };

  const inp = {
    width: "100%",
    padding: "0.75rem",
    border: "1px solid #e8e0d5",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontFamily: "Georgia, serif",
    background: "#faf8f5",
    outline: "none",
    boxSizing: "border-box" as const,
    marginBottom: "1rem",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", margin: "0.5rem auto" }}></div>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Pop-up planning, beautifully simple</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5" }}>

          {mode === "home" && (
            <div>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Welcome</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>How are you signing in today?</p>
              <a href="/login/organizer/events" style={{ display: "block", padding: "0.85rem", background: "#2c1810", color: "#fff", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", textAlign: "center", textDecoration: "none", marginBottom: "10px" }}>
                I am an Organizer
              </a>
              <button onClick={() => setMode("brand-login")} style={{ width: "100%", padding: "0.85rem", background: "#fff", color: "#2c1810", border: "1px solid #2c1810", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: "pointer" }}>
                I am a Brand
              </button>
            </div>
          )}

          {mode === "brand-login" && (
            <form onSubmit={handleBrandLogin}>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Brand sign in</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>Sign in to access your brand portal</p>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
              {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.85rem", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: "pointer", marginBottom: "10px" }}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
              <button type="button" onClick={() => setMode("home")} style={{ width: "100%", padding: "0.85rem", background: "transparent", color: "#8b7355", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", cursor: "pointer" }}>
                Back
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}