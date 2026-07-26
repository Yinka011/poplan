"use client";
import { useState } from "react";
import Link from "next/link";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: "olaniyanyin@gmail.com",
        subject: `New waitlist request from ${name}`,
        html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Role:</strong> ${role}</p>`,
      }),
    });

    setSubmitted(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", fontFamily: "Georgia, serif" }}>
      
      {/* Left panel */}
      <div style={{ width: "45%", background: "#1B3A2D", display: "flex", flexDirection: "column" as const, justifyContent: "space-between", padding: "3rem" }}>
        <div>
          <Link href="/" style={{ textDecoration: "none" }}>
            <div style={{ fontSize: "1.5rem", letterSpacing: "0.2em", color: "#fff" }}>NALPOP</div>
            <div style={{ width: "2rem", height: "1px", background: "#E8C97A", marginTop: "8px" }} />
          </Link>
        </div>
        <div>
          <div style={{ fontSize: "2rem", color: "#fff", lineHeight: 1.3, fontWeight: "normal", marginBottom: "1.5rem" }}>
            Join the waitlist.<br />
            <span style={{ color: "#E8C97A", fontStyle: "italic" }}>Be first in.</span>
          </div>
          <div style={{ fontSize: "0.88rem", color: "#ffffff88", lineHeight: 1.8, marginBottom: "2rem" }}>
            Nalpop is currently in early access. We are onboarding organizers and brands one by one to make sure every experience is world class.
          </div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
            {["Built by a pop-up organizer", "Square POS integration", "Multi-city brand management", "Automated payout calculations"].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E8C97A", flexShrink: 0 }} />
                <span style={{ fontSize: "0.85rem", color: "#ffffff88" }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: "0.72rem", color: "#ffffff44", letterSpacing: "0.1em" }}>© 2026 NALPOP</div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ width: "100%", maxWidth: "420px" }}>
          {submitted ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>🖤</div>
              <h1 style={{ fontSize: "1.6rem", color: "#1c1714", fontWeight: "normal", marginBottom: "0.75rem" }}>You are on the list</h1>
              <p style={{ fontSize: "0.9rem", color: "#4a5a52", lineHeight: 1.7, marginBottom: "2rem" }}>
                Thank you for your interest in Nalpop. We will be in touch soon with your access details.
              </p>
              <Link href="/" style={{ fontSize: "0.85rem", color: "#1B3A2D", textDecoration: "none" }}>← Back to home</Link>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "2.5rem" }}>
                <h1 style={{ fontSize: "1.6rem", color: "#1c1714", fontWeight: "normal", marginBottom: "8px" }}>Request access</h1>
                <p style={{ fontSize: "0.9rem", color: "#4a5a52", margin: 0 }}>Tell us a bit about yourself and we will be in touch.</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" as const, gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "5px" }}>YOUR NAME OR BRAND</div>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. AO Curates or Lola Signatures" required style={{ width: "100%", padding: "12px 14px", border: "1px solid #e4ebe6", borderRadius: "10px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#fff", boxSizing: "border-box" as const, outline: "none" }} />
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "5px" }}>EMAIL</div>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required style={{ width: "100%", padding: "12px 14px", border: "1px solid #e4ebe6", borderRadius: "10px", fontSize: "0.95rem", fontFamily: "Georgia, serif", background: "#fff", boxSizing: "border-box" as const, outline: "none" }} />
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "8px" }}>I AM A</div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                    {[
                      { value: "organizer", label: "Event Organizer", desc: "I host pop-ups and invite brands" },
                      { value: "brand_organizer", label: "Brand Organizer", desc: "I run my own pop-ups across cities" },
                      { value: "brand", label: "Participating Brand", desc: "I attend other organizers pop-ups" },
                    ].map(option => (
                      <div key={option.value} onClick={() => setRole(option.value)} style={{ padding: "12px 14px", border: "2px solid " + (role === option.value ? "#1B3A2D" : "#e4ebe6"), borderRadius: "10px", cursor: "pointer", background: role === option.value ? "#f0f4f1" : "#fff" }}>
                        <div style={{ fontSize: "0.88rem", color: "#1c1714" }}>{option.label}</div>
                        <div style={{ fontSize: "0.75rem", color: "#4a5a52", marginTop: "2px" }}>{option.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading || !role} style={{ padding: "12px", background: role ? "#1B3A2D" : "#e4ebe6", color: role ? "#fff" : "#4a5a52", border: "none", borderRadius: "10px", fontSize: "0.95rem", cursor: role ? "pointer" : "not-allowed", fontFamily: "Georgia, serif", marginTop: "8px" }}>
                  {loading ? "Submitting..." : "Request access"}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
                <span style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Already have access? </span>
                <Link href="/login-page" style={{ fontSize: "0.82rem", color: "#1B3A2D", textDecoration: "none" }}>Sign in →</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
