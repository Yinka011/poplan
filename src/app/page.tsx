"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [mode, setMode] = useState<"home" | "organizer-login" | "brand-login" | "forgot">("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleOrganizerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("organizer_mode").eq("email", email).single();
    if (!profile) {
      window.location.href = "/onboarding";
    } else if (profile.organizer_mode === "own_brand") {
      window.location.href = "/brand-organizer";
    } else {
      window.location.href = "/login/organizer/events";
    }
  };

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
    const { data: ownEvents } = await supabase.from("events").select("id").eq("organizer_email", email).limit(1);
    if (ownEvents && ownEvents.length > 0) {
      window.location.href = "/brand-hub";
    } else {
      window.location.href = "/brand/portal";
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://poplan.vercel.app/reset-password",
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
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Pop-up planning, beautifully simple</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5" }}>

          {mode === "home" && (
            <div>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Welcome</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>How are you signing in today?</p>
              <button onClick={() => { setMode("organizer-login"); setError(""); setEmail(""); setPassword(""); }} style={btn("#2c1810")}>
                I am an Organizer
              </button>
              <button onClick={() => { setMode("brand-login"); setError(""); setEmail(""); setPassword(""); }} style={btn("#fff", "#2c1810")}>
                I am a Brand
              </button>
            </div>
          )}

          {mode === "organizer-login" && (
            <form onSubmit={handleOrganizerLogin}>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Organizer sign in</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>Sign in to manage your events</p>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
              {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
              <button type="submit" disabled={loading} style={btn("#2c1810")}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }} style={{ width: "100%", padding: "0.5rem", background: "transparent", color: "#8b7355", border: "none", fontSize: "0.85rem", fontFamily: "Georgia, serif", cursor: "pointer", marginBottom: "6px" }}>
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode("home")} style={{ width: "100%", padding: "0.5rem", background: "transparent", color: "#8b7355", border: "none", fontSize: "0.85rem", fontFamily: "Georgia, serif", cursor: "pointer" }}>
                Back
              </button>
            </form>
          )}

          {mode === "brand-login" && (
            <form onSubmit={handleBrandLogin}>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Brand sign in</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>Sign in to access your brand portal</p>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
              {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
              <button type="submit" disabled={loading} style={btn("#2c1810")}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }} style={{ width: "100%", padding: "0.5rem", background: "transparent", color: "#8b7355", border: "none", fontSize: "0.85rem", fontFamily: "Georgia, serif", cursor: "pointer", marginBottom: "6px" }}>
                Forgot password?
              </button>
              <button type="button" onClick={() => setMode("home")} style={{ width: "100%", padding: "0.5rem", background: "transparent", color: "#8b7355", border: "none", fontSize: "0.85rem", fontFamily: "Georgia, serif", cursor: "pointer" }}>
                Back
              </button>
            </form>
          )}

          {mode === "forgot" && (
            sent ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📬</div>
                <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.75rem" }}>Check your email</h2>
                <p style={{ fontSize: "0.85rem", color: "#8b7355", lineHeight: 1.7, marginBottom: "1.5rem" }}>We sent a reset link to <strong>{email}</strong>. Click it to set a new password.</p>
                <button onClick={() => { setMode("home"); setSent(false); setEmail(""); }} style={btn("#2c1810")}>
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword}>
                <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Reset password</h2>
                <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>Enter your email and we will send you a reset link</p>
                <input type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
                {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
                <button type="submit" disabled={loading} style={btn("#2c1810")}>
                  {loading ? "Sending..." : "Send reset link"}
                </button>
                <button type="button" onClick={() => setMode("home")} style={{ width: "100%", padding: "0.5rem", background: "transparent", color: "#8b7355", border: "none", fontSize: "0.85rem", fontFamily: "Georgia, serif", cursor: "pointer" }}>
                  Back
                </button>
              </form>
            )
          )}

        </div>
      </div>
    </div>
  );
}
