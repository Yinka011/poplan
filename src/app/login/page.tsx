"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Loader2Icon } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<
    "home" | "organizer-login" | "brand-login" | "forgot"
  >("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleOrganizerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_email", email)
      .single();
    if (!roleData) {
      window.location.href = "/onboarding";
    } else if (roleData.role === "brand_organizer") {
      window.location.href = "/brand-organizer";
    } else {
      window.location.href = "/organizer/events";
    }
  };

  const handleBrandLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    const { data: ownEvents } = await supabase
      .from("events")
      .select("id")
      .eq("organizer_email", email)
      .limit(1);
    const { data: soloEvents } = await supabase
      .from("brand_solo_events")
      .select("id")
      .eq("brand_email", email)
      .limit(1);
    if (
      (ownEvents && ownEvents.length > 0) ||
      (soloEvents && soloEvents.length > 0)
    ) {
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
      redirectTo: "https://nalpop.com/reset-password",
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  const inp = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #e8e2da",
    borderRadius: "10px",
    fontSize: "0.95rem",
    background: "#fff",
    boxSizing: "border-box" as const,
    color: "#1c1714",
    outline: "none",
  };
  const btn = {
    width: "100%",
    padding: "12px",
    background: "#1B3A2D",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "0.95rem",
    cursor: "pointer",
    letterSpacing: "0.03em",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8faf8",
        display: "flex",
      }}
    >
      {/* Left panel */}
      <div
        className="hidden lg:flex"
        style={{
          width: "45%",
          background: "#1B3A2D",
          flexDirection: "column" as const,
          justifyContent: "space-between",
          padding: "3rem",
          position: "relative" as const,
          overflow: "hidden",
        }}
      >
        <div style={{ position: "relative" as const, zIndex: 1 }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div
              style={{
                fontSize: "1.5rem",
                letterSpacing: "0.2em",
                color: "#fff",
              }}
            >
              NALPOP
            </div>
            <div
              style={{
                width: "2rem",
                height: "1px",
                background: "#E8C97A",
                marginTop: "8px",
              }}
            />
          </Link>
        </div>
        <div style={{ position: "relative" as const, zIndex: 1 }}>
          <div
            style={{
              fontSize: "2.2rem",
              color: "#fff",
              lineHeight: 1.3,
              fontWeight: "normal",
              marginBottom: "1.5rem",
            }}
          >
            Run your pop-up.
            <br />
            <span style={{ color: "#E8C97A", fontStyle: "italic" }}>
              Not your inbox.
            </span>
          </div>
          <div
            style={{ fontSize: "0.88rem", color: "#ffffff88", lineHeight: 1.8 }}
          >
            Manage brands, inventory, planning and payouts — all in one place.
          </div>
        </div>
        <div
          style={{
            position: "relative" as const,
            zIndex: 1,
            fontSize: "0.72rem",
            color: "#ffffff44",
            letterSpacing: "0.1em",
          }}
        >
          © 2026 NALPOP
        </div>
      </div>

      {/* Right panel */}
      <div className="p-4 lg:p-8 flex lg:items-center lg:justify-center lg:flex-1 w-full">
        <div className="w-full lg:max-w-100 max-w-full relative">
          <div
            className="lg:hidden mb-10 w-fit"
            style={{ position: "relative" as const, zIndex: 1 }}
          >
            <Link href="/" style={{ textDecoration: "none" }}>
              <div
                style={{
                  fontSize: "1.5rem",
                  letterSpacing: "0.2em",
                  color: "#1B3A2D",
                }}
              >
                NALPOP
              </div>
              <div
                style={{
                  width: "2rem",
                  height: "1px",
                  background: "#E8C97A",
                  marginTop: "8px",
                }}
              />
            </Link>
          </div>
          {mode === "home" && (
            <div>
              <div style={{ marginBottom: "2.5rem" }}>
                <h1
                  style={{
                    fontSize: "1.6rem",
                    color: "#1c1714",
                    fontWeight: "normal",
                    marginBottom: "8px",
                  }}
                >
                  Welcome back
                </h1>
                <p style={{ fontSize: "0.9rem", color: "#4a5a52", margin: 0 }}>
                  Sign in to your Nalpop account.
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "12px",
                }}
              >
                <button
                  onClick={() => {
                    setMode("organizer-login");
                    setError("");
                  }}
                  style={{ ...btn }}
                >
                  Sign in as Organizer
                </button>
                <button
                  onClick={() => {
                    setMode("brand-login");
                    setError("");
                  }}
                  style={{
                    ...btn,
                    background: "#fff",
                    color: "#1B3A2D",
                    border: "1px solid #1B3A2D",
                  }}
                >
                  Sign in as Brand
                </button>
              </div>
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.25rem",
                  background: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e4ebe6",
                }}
              >
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "#4a5a52",
                    marginBottom: "4px",
                  }}
                >
                  New to Nalpop?
                </div>
                <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>
                  Access is by invitation only. Contact your event organizer to
                  get started.
                </div>
              </div>
            </div>
          )}

          {mode === "organizer-login" && (
            <div className="w-full">
              <button
                onClick={() => {
                  setMode("home");
                  setError("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#4a5a52",
                  fontSize: "0.85rem",
                  marginBottom: "1.5rem",
                  padding: 0,
                }}
              >
                ← Back
              </button>
              <div style={{ marginBottom: "2rem" }}>
                <h1
                  style={{
                    fontSize: "1.6rem",
                    color: "#1c1714",
                    fontWeight: "normal",
                    marginBottom: "6px",
                  }}
                >
                  Organizer sign in
                </h1>
                <p style={{ fontSize: "0.88rem", color: "#4a5a52", margin: 0 }}>
                  Welcome back. Enter your credentials below.
                </p>
              </div>
              <form
                onSubmit={handleOrganizerLogin}
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#4a5a52",
                      letterSpacing: "0.08em",
                      marginBottom: "5px",
                    }}
                  >
                    EMAIL
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={inp}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#4a5a52",
                      letterSpacing: "0.08em",
                      marginBottom: "5px",
                    }}
                  >
                    PASSWORD
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={inp}
                  />
                </div>
                {error && (
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "#c0392b",
                      padding: "8px 12px",
                      background: "#c0392b11",
                      borderRadius: "8px",
                    }}
                  >
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center"
                  style={{
                    ...btn,
                    marginTop: "4px",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <Loader2Icon className="animate-spin size-6" />
                  ) : (
                    "Sign in"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#4a5a52",
                    fontSize: "0.82rem",
                    textAlign: "center" as const,
                  }}
                >
                  Forgot password?
                </button>
              </form>
            </div>
          )}

          {mode === "brand-login" && (
            <div>
              <button
                onClick={() => {
                  setMode("home");
                  setError("");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#4a5a52",
                  fontSize: "0.85rem",
                  marginBottom: "1.5rem",
                  padding: 0,
                }}
              >
                ← Back
              </button>
              <div style={{ marginBottom: "2rem" }}>
                <h1
                  style={{
                    fontSize: "1.6rem",
                    color: "#1c1714",
                    fontWeight: "normal",
                    marginBottom: "6px",
                  }}
                >
                  Brand sign in
                </h1>
                <p style={{ fontSize: "0.88rem", color: "#4a5a52", margin: 0 }}>
                  Access your brand portal below.
                </p>
              </div>
              <form
                onSubmit={handleBrandLogin}
                style={{
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#4a5a52",
                      letterSpacing: "0.08em",
                      marginBottom: "5px",
                    }}
                  >
                    EMAIL
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    style={inp}
                  />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#4a5a52",
                      letterSpacing: "0.08em",
                      marginBottom: "5px",
                    }}
                  >
                    PASSWORD
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={inp}
                  />
                </div>
                {error && (
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "#c0392b",
                      padding: "8px 12px",
                      background: "#c0392b11",
                      borderRadius: "8px",
                    }}
                  >
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center"
                  style={{
                    ...btn,
                    marginTop: "4px",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? (
                    <Loader2Icon className="animate-spin size-6" />
                  ) : (
                    "Sign in"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#4a5a52",
                    fontSize: "0.82rem",
                    textAlign: "center" as const,
                  }}
                >
                  Forgot password?
                </button>
              </form>
            </div>
          )}

          {mode === "forgot" && (
            <div>
              <button
                onClick={() => {
                  setMode("home");
                  setError("");
                  setSent(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#4a5a52",
                  fontSize: "0.85rem",
                  marginBottom: "1.5rem",
                  padding: 0,
                }}
              >
                ← Back
              </button>
              <div style={{ marginBottom: "2rem" }}>
                <h1
                  style={{
                    fontSize: "1.6rem",
                    color: "#1c1714",
                    fontWeight: "normal",
                    marginBottom: "6px",
                  }}
                >
                  Forgot password
                </h1>
                <p style={{ fontSize: "0.88rem", color: "#4a5a52", margin: 0 }}>
                  Enter your email and we will send you a reset link.
                </p>
              </div>
              {sent ? (
                <div
                  style={{
                    padding: "1.25rem",
                    background: "#4a7c5922",
                    borderRadius: "12px",
                    border: "1px solid #4a7c5944",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: "#4a7c59",
                      marginBottom: "4px",
                    }}
                  >
                    Reset link sent
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                    Check your email for the password reset link.
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleForgotPassword}
                  style={{
                    display: "flex",
                    flexDirection: "column" as const,
                    gap: "12px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "#4a5a52",
                        letterSpacing: "0.08em",
                        marginBottom: "5px",
                      }}
                    >
                      EMAIL
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      style={inp}
                    />
                  </div>

                  {error && (
                    <div
                      style={{
                        fontSize: "0.82rem",
                        color: "#c0392b",
                        padding: "8px 12px",
                        background: "#c0392b11",
                        borderRadius: "8px",
                      }}
                    >
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ ...btn, opacity: loading ? 0.7 : 1 }}
                    className="flex items-center justify-center"
                  >
                    {loading ? (
                      <Loader2Icon className="animate-spin size-6" />
                    ) : (
                      "Send reset link"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
          <div className="mb-auto absolute bottom-0 text-[0.72rem] text-[#4a5a52] lg:hidden">
            © 2026 NALPOP
          </div>
        </div>
      </div>
    </div>
  );
}
// force rebuild
