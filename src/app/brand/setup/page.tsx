"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PageSkeleton from "@/components/shared/PageSkeleton";

function BrandSetupInner() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const savingRef = useRef(false);
  const [email, setEmail] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      setSessionChecking(true);
      setSessionError(false);
      try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error && error.name !== "AuthSessionMissingError") throw error;
      if (!active) return;
      if (user) {
        setEmail(user.email || "");
        setSessionReady(true);
      }
      } catch (error) {
        console.error("Could not verify access:", error);
        if (active) setSessionError(true);
      } finally {
        if (active) setSessionChecking(false);
      }
    };
    void checkSession();
    return () => { active = false; };
  }, [retry]);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    if (password !== confirm) { alert("Passwords do not match"); return; }
    if (password.length < 6) { alert("Password must be at least 6 characters"); return; }
    savingRef.current = true;
    setLoading(true);
    try {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    window.location.href = next === "onboarding" ? "/onboarding" : "/brand/portal";
    } catch (error) {
      console.error("Could not set password:", error);
      alert("Could not set your password. Please try again.");
      savingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8",  display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#1B3A2D" }}>NALPOP</div>
          <div style={{ width: "2rem", height: "1px", background: "#E8C97A", margin: "0.5rem auto" }}></div>
          <p style={{ color: "#4a5a52", fontSize: "0.9rem" }}>Brand portal access</p>
        </div>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e4ebe6" }}>

          {sessionChecking ? (
            <PageSkeleton label="Verifying your access" />
          ) : sessionError ? (
            <div role="alert" style={{ textAlign: "center", color: "#4a5a52" }}>
              Could not verify your access. Please try again.
              <button onClick={() => setRetry(value => value + 1)} style={{ display: "block", margin: "1rem auto", padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: 0, borderRadius: "8px" }}>Retry</button>
            </div>
          ) : !sessionReady ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔗</div>
              <h2 style={{ fontSize: "1.2rem", color: "#1B3A2D", fontWeight: "normal", marginBottom: "0.75rem" }}>Your invite link has expired</h2>
              <p style={{ fontSize: "0.85rem", color: "#4a5a52", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Invite links expire after 24 hours for security. Please contact the event organiser to request a new invite link.
              </p>
              <div style={{ background: "#f8faf8", borderRadius: "10px", padding: "1rem", border: "1px solid #f0f4f1", fontSize: "0.85rem", color: "#4a5a52" }}>
                Already have a password? <Link href="/login" style={{ color: "#E8C97A", textDecoration: "none" }}>Sign in here →</Link>
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
                  disabled={loading}
                  placeholder="Choose a password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.95rem",  background: "#f8faf8", outline: "none", boxSizing: "border-box" as const, marginBottom: "1rem" }}
                />
                <input
                  type="password"
                  disabled={loading}
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.95rem",  background: "#f8faf8", outline: "none", boxSizing: "border-box" as const, marginBottom: "1rem" }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%", padding: "0.85rem", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.95rem",  cursor: "pointer" }}
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
    <Suspense fallback={<PageSkeleton label="Loading brand setup" />}>
      <BrandSetupInner />
    </Suspense>
  );
}
