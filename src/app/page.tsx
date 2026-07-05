"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"organizer" | "brand" | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    if (role === "organizer") {
      window.location.href = "/login/organizer/events";
    } else {
      window.location.href = "/login/brand";
    }
  };

  if (!role) {
    return (
      <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
            <div style={{ width: "2rem", height: "1px", background: "#b87333", margin: "0.5rem auto" }}></div>
            <p style={{ color: "#8b7355", fontSize: "0.9rem", marginTop: "0.5rem" }}>Pop-up planning, beautifully simple</p>
          </div>
          <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5" }}>
            <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "1.5rem", textAlign: "center" }}>Welcome back</h2>
            <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>How would you like to sign in?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button onClick={() => setRole("organizer")} style={{ width: "100%", padding: "1rem", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem", fontFamily: "Georgia, serif", cursor: "pointer", letterSpacing: "0.05em" }}>
                Sign in as Organizer
              </button>
              <button onClick={() => setRole("brand")} style={{ width: "100%", padding: "1rem", background: "#fff", color: "#2c1810", border: "1px solid #2c1810", borderRadius: "8px", fontSize: "1rem", fontFamily: "Georgia, serif", cursor: "pointer", letterSpacing: "0.05em" }}>
                Sign in as Brand
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", margin: "0.5rem auto" }}></div>
          <p style={{ color: "#8b7355", fontSize: "0.9rem", marginTop: "0.5rem" }}>{role === "organizer" ? "Organizer login" : "Brand login"}</p>
        </div>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5" }}>
          <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "1.5rem", textAlign: "center" }}>Welcome back</h2>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#8b7355", display: "block", marginBottom: "0.4rem" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#faf8f5", outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ fontSize: "0.8rem", color: "#8b7355", display: "block", marginBottom: "0.4rem" }}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: "100%", padding: "0.75rem", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#faf8f5", outline: "none", boxSizing: "border-box" as const }} />
            </div>
            {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
            <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.85rem", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "1rem", fontFamily: "Georgia, serif", cursor: "pointer", letterSpacing: "0.05em" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <button type="button" onClick={() => setRole(null)} style={{ width: "100%", padding: "0.75rem", background: "transparent", color: "#8b7355", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", cursor: "pointer", marginTop: "8px" }}>
              ← Back
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}