"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function BrandSetupInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
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
    window.location.href = next === "onboarding" ? "/onboarding" : "/brand/portal";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#1B3A2D" }}>NALPOP</div>
          <div style={{ width: "2rem", height: "1px", background: "#E8C97A", margin: "0.5rem auto" }}></div>
          <p style={{ color: "#4a5a52", fontSize: "0.9rem" }}>Brand portal access</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e4ebe6" }}>

          {sessionChecking ? (
            <div style={{ textAlign: "center", color: "#4a5a52", fontSize: "0.9rem" }}>Verifying your access...</div>
          ) : !sessionReady ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔗</div>
              <h2 style={{ fontSize: "1.2rem", color: "#1B3A2D", fontWeight: "normal", marginBottom: "0.75rem" }}>Your invite link has expired</h2>
              <p style={{ fontSize: "0.85rem", color: "#4a5a52", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Invite links expire after 24 hours for security. Please contact AO Curates on WhatsApp to request a new invite link.
              </p>
              <div style={{ background: "#f8faf8", borderRadius: "10px", padding: "1rem", border: "1px solid #f0f4f1", fontSize: "0.85rem", color: "#4a5a52" }}>
                Already have a password? <Link href="/" style={{ color: "#E8C97A", textDecoration: "none" }}>Sign in here →</Link>
              </div>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "1.3rem", color: "#1B3A2D", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Set your password</h2>
              <p style={{ fontSize: "0.85rem", color: "#4a5a52", textAlign: "center", marginBottom: "1.5rem" }}>Welcome to Nalpop. Set a password to access your brand portal.</p>
              {email && <p style={{ fontSize: "0.8rem", color: "#E8C97A", textAlign: "center", marginBottom: "1rem" }}>{email}</p>}
              <form onSubmit={handleSetup}>
                <input
                  type="password"
                  placeholder="Choose a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#f8faf8", outline: "none", boxSizing: "border-box" as const, marginBottom: "1rem" }}
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#f8faf8", outline: "none", boxSizing: "border-box" as const, marginBottom: "1rem" }}
                />
                {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem", textAlign: "center" }}>{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", padding: "0.85rem", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: "pointer" }}
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

export default function BrandSetup() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>}>
      <BrandSetupInner />
    </Suspense>
  );
}
