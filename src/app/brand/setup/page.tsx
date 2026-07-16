"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function BrandSetup() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
        setSessionReady(true);
      }
      setSessionChecking(false);
    };
    checkSession();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    window.location.href = "/brand/portal";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", margin: "0.5rem auto" }}></div>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Brand portal access</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5" }}>

          {sessionChecking ? (
            <div style={{ textAlign: "center", color: "#8b7355", fontSize: "0.9rem" }}>Verifying your access...</div>
          ) : !sessionReady ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔗</div>
              <h2 style={{ fontSize: "1.2rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.75rem" }}>Your invite link has expired</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Invite links expire after 24 hours for security. Please contact AO Curates on WhatsApp to request a new invite link.
              </p>
              <div style={{ background: "#faf8f5", borderRadius: "10px", padding: "1rem", border: "1px solid #f0ebe4", fontSize: "0.85rem", color: "#8b7355" }}>
                Already have a password? <Link href="/" style={{ color: "#b87333", textDecoration: "none" }}>Sign in here →</Link>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Set your password</h2>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>Welcome to Poplan. Set a password to access your brand portal.</p>
              {email && <p style={{ fontSize: "0.8rem", color: "#b87333", textAlign: "center", marginBottom: "1rem" }}>{email}</p>}
              <form onSubmit={handleSetup}>
                <input
                  type="password"
                  placeholder="Choose a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#faf8f5", outline: "none", boxSizing: "border-box" as const, marginBottom: "1rem" }}
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#faf8f5", outline: "none", boxSizing: "border-box" as const, marginBottom: "1rem" }}
                />
                {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", padding: "0.85rem", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: "pointer" }}
                >
                  {loading ? "Setting up..." : "Access my portal"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}