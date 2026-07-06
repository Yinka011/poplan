"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BrandLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [mode, setMode] = useState<"login" | "magic">("login");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Invalid email or password. Try a magic link instead.");
      setLoading(false);
      return;
    }

    window.location.href = "/brand";
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: "https://poplan.vercel.app/brand" }
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
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

  const btn = (bg: string, color: string = "#fff") => ({
    width: "100%",
    padding: "0.85rem",
    background: bg,
    color,
    border: bg === "#fff" ? "1px solid #2c1810" : "none",
    borderRadius: "8px",
    fontSize: "0.95rem",
    fontFamily: "Georgia, serif",
    cursor: "pointer",
    letterSpacing: "0.05em",
    marginBottom: "10px",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>

        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", margin: "0.5rem auto" }}></div>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Brand portal access</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5" }}>

          {sent ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📬</div>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.75rem" }}>Check your email</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", lineHeight: 1.7 }}>We sent a magic link to <strong>{email}</strong>. Click it to access your brand portal. No password needed</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Brand sign in</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>Access your AO Curates brand portal</p>

              <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem" }}>
                <button onClick={() => setMode("login")} style={{ flex: 1, padding: "8px", background: mode === "login" ? "#2c1810" : "#fff", color: mode === "login" ? "#fff" : "#8b7355", border: "1px solid " + (mode === "login" ? "#2c1810" : "#e8e0d5"), borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Password</button>
                <button onClick={() => setMode("magic")} style={{ flex: 1, padding: "8px", background: mode === "magic" ? "#2c1810" : "#fff", color: mode === "magic" ? "#fff" : "#8b7355", border: "1px solid " + (mode === "magic" ? "#2c1810" : "#e8e0d5"), borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Magic link</button>
              </div>

              {mode === "login" && (
                <form onSubmit={handleLogin}>
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
                  <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
                  {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
                  <button type="submit" disabled={loading} style={btn("#2c1810")}>{loading ? "Signing in..." : "Sign in"}</button>
                </form>
              )}

              {mode === "magic" && (
                <form onSubmit={handleMagicLink}>
                  <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1rem", lineHeight: 1.6 }}>Enter your email and we'll send you a link to sign in instantly. No password needed</p>
                  <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
                  {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
                  <button type="submit" disabled={loading} style={btn("#2c1810")}>{loading ? "Sending..." : "Send magic link"}</button>
                </form>
              )}

              <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                <Link href="/" style={{ fontSize: "0.8rem", color: "#8b7355", textDecoration: "none" }}>← Back to main login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}