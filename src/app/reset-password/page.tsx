"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
    setLoading(false);
    setTimeout(() => { window.location.href = "/"; }, 2000);
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
        </div>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5" }}>
          {done ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✅</div>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem" }}>Password updated!</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>Redirecting you to sign in...</p>
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Set new password</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>Choose a strong password for your account</p>
              <input type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
              <input type="password" placeholder="Confirm password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inp} />
              {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.85rem", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: "pointer" }}>
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}