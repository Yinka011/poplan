"use client";
import { useState, useEffect, useRef } from "react";

type TourStep = {
  target: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
};

const steps: TourStep[] = [
  {
    target: "tour-todo",
    title: "Your to-do list",
    description: "Work through each task and check them off as you go. AO Curates can see your progress in real time.",
    position: "top",
  },
  {
    target: "tour-upload",
    title: "Upload your files",
    description: "Select a category then upload your documents here. You will be notified once each file is reviewed.",
    position: "top",
  },
  {
    target: "tour-announcements",
    title: "Announcements",
    description: "Important updates from AO Curates will appear here. Dismiss them once you have read them.",
    position: "bottom",
  },
  {
    target: "tour-shipping",
    title: "Ship your products",
    description: "Once your products are on the way, click Mark as Shipped so we know they are coming.",
    position: "bottom",
  },
];

export default function PortalTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<DOMRect | null>(null);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  useEffect(() => {
    const el = document.getElementById(current.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        setBox(rect);
      }, 400);
    }
  }, [step, current.target]);

  useEffect(() => {
    const handleResize = () => {
      const el = document.getElementById(current.target);
      if (el) setBox(el.getBoundingClientRect());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [current.target]);

  const PADDING = 8;

  return (
    <>
      {/* Dark overlay with hole */}
      <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none" }}>
        {box && (
          <>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: box.top - PADDING, background: "#00000077" }} />
            <div style={{ position: "absolute", top: box.top - PADDING, left: 0, width: box.left - PADDING, height: box.height + PADDING * 2, background: "#00000077" }} />
            <div style={{ position: "absolute", top: box.top - PADDING, left: box.right + PADDING, right: 0, height: box.height + PADDING * 2, background: "#00000077" }} />
            <div style={{ position: "absolute", top: box.bottom + PADDING, left: 0, right: 0, bottom: 0, background: "#00000077" }} />
            <div style={{ position: "absolute", top: box.top - PADDING, left: box.left - PADDING, width: box.width + PADDING * 2, height: box.height + PADDING * 2, border: "2px solid #b87333", borderRadius: "12px" }} />
          </>
        )}
      </div>

      {/* Tooltip */}
      {box && (
        <div style={{
          position: "fixed",
          zIndex: 201,
          left: Math.min(box.left, window.innerWidth - 320),
          top: current.position === "bottom" ? box.top - PADDING - 160 : box.bottom + PADDING + 12,
          width: "300px",
          background: "#fff",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          boxShadow: "0 8px 32px #00000033",
          fontFamily: "Georgia, serif",
        }}>
          {/* Step dots */}
          <div style={{ display: "flex", gap: "5px", marginBottom: "0.75rem" }}>
            {steps.map((_, i) => (
              <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: i === step ? "#2c1810" : "#e8e0d5", transition: "background 0.3s" }} />
            ))}
          </div>

          <div style={{ fontSize: "0.95rem", color: "#2c1810", marginBottom: "6px" }}>{current.title}</div>
          <p style={{ fontSize: "0.82rem", color: "#8b7355", lineHeight: 1.7, margin: "0 0 1.25rem 0" }}>{current.description}</p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ fontSize: "0.8rem", color: "#8b7355", background: "transparent", border: "none", cursor: "pointer", visibility: step === 0 ? "hidden" : "visible" }}
            >
              ← Back
            </button>
            <button
              onClick={() => isLast ? onClose() : setStep(s => s + 1)}
              style={{ padding: "8px 20px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}
            >
              {isLast ? "Done" : "Next →"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
            <button onClick={onClose} style={{ fontSize: "0.72rem", color: "#c8bfb5", background: "transparent", border: "none", cursor: "pointer" }}>
              Skip tour
            </button>
          </div>
        </div>
      )}

      {/* Click blocker */}
      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={e => e.stopPropagation()} />
    </>
  );
}
