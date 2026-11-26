"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function RespondPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const action = searchParams.get("action") as "interested" | "not_interested" | null;

  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [brandName, setBrandName] = useState("");
  const [response, setResponse] = useState("");

  useEffect(() => {
    if (!token || !action) {
      setStatus("error");
      return;
    }
    fetch("/api/brand-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, response: action }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error === "Already responded") {
          setStatus("already");
        } else if (data.success) {
          setBrandName(data.brand_name);
          setResponse(data.response);
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token, action]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "Georgia, serif" }}>
      <div style={{ maxWidth: "480px", width: "100%", background: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid #e4ebe6" }}>
        <div style={{ background: "#1B3A2D", padding: "1.5rem 2rem" }}>
          <div style={{ fontSize: "1.2rem", letterSpacing: "0.2em", color: "#E8C97A" }}>NALPOP</div>
        </div>
        <div style={{ padding: "2rem" }}>
          {status === "loading" && (
            <p style={{ color: "#4a5a52", textAlign: "center" }}>Recording your response…</p>
          )}
          {status === "success" && response === "interested" && (
            <>
              <h2 style={{ color: "#1B3A2D", fontWeight: "normal", marginTop: 0 }}>You're in! 🎉</h2>
              <p style={{ color: "#4a5a52", lineHeight: 1.8 }}>
                Thanks {brandName} — the organizer has been notified of your interest. They'll be in touch shortly with payment details to secure your spot.
              </p>
            </>
          )}
          {status === "success" && response === "not_interested" && (
            <>
              <h2 style={{ color: "#1B3A2D", fontWeight: "normal", marginTop: 0 }}>Thanks for letting us know</h2>
              <p style={{ color: "#4a5a52", lineHeight: 1.8 }}>
                We've noted that {brandName} won't be joining this event. We hope to see you at a future pop-up!
              </p>
            </>
          )}
          {status === "already" && (
            <>
              <h2 style={{ color: "#1B3A2D", fontWeight: "normal", marginTop: 0 }}>Already responded</h2>
              <p style={{ color: "#4a5a52", lineHeight: 1.8 }}>
                Your response has already been recorded. If you need to change it, please contact the event organizer directly.
              </p>
            </>
          )}
          {status === "error" && (
            <>
              <h2 style={{ color: "#c0392b", fontWeight: "normal", marginTop: 0 }}>Something went wrong</h2>
              <p style={{ color: "#4a5a52", lineHeight: 1.8 }}>
                This link may be invalid or expired. Please contact the event organizer for assistance.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
