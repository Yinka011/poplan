"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [mode, setMode] = useState<"home" | "login" | "signup">("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role === "brand") {
      window.location.href = "/brand";
    } else {
      window.location.href = "/organizer";
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        email,
        full_name: name,
        role: "organizer",
      });
      window.location.href = "/organizer";
    }
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
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Welcome back</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>How would you like to continue?</p>
              <button style={btn("#2c1810")} onClick={() => setMode("login")}>Sign in</button>
              <button style={btn("#fff", "#2c1810")} onClick={() => setMode("signup")}>Create organizer account</button>
              <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
                <a href="/brand/login" style={{ fontSize: "0.8rem", color: "#8b7355", textDecoration: "none" }}>Joining as a brand? Click here</a>
              </div>
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLogin}>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "1.5rem", textAlign: "center" }}>Sign in</h2>
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
              {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
              <button type="submit" disabled={loading} style={btn("#2c1810")}>{loading ? "Signing in..." : "Sign in"}</button>
              <button type="button" onClick={() => setMode("home")} style={btn("#fff", "#8b7355")}>← Back</button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignup}>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "1.5rem", textAlign: "center" }}>Create account</h2>
              <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} required style={inp} />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
              <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
              {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
              <button type="submit" disabled={loading} style={btn("#2c1810")}>{loading ? "Creating account..." : "Create account"}</button>
              <button type="button" onClick={() => setMode("home")} style={btn("#fff", "#8b7355")}>← Back</button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}