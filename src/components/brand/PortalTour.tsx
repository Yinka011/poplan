"use client";
import { useState } from "react";

const steps = [
  {
    number: "01",
    title: "Your financials",
    description: "At the top you will see your participation fee, how much you have paid and your remaining balance. This updates in real time as payments are recorded.",
  },
  {
    number: "02",
    title: "Shipment status",
    description: "Once you have sent your products to the venue, click Mark as Shipped so AO Curates knows they are on the way. Products must arrive between August 3rd and August 28th.",
  },
  {
    number: "03",
    title: "Announcements",
    description: "Important updates from AO Curates appear here. You can dismiss each one once you have read it. Pinned announcements will always stay visible.",
  },
  {
    number: "04",
    title: "Your to-do list",
    description: "Work through each task and check them off as you complete them. AO Curates can see your progress in real time. Some tasks check themselves off automatically when you upload files.",
  },
  {
    number: "05",
    title: "Upload your documents",
    description: "Select a category first — brand logo, product photos, inventory sheet etc — then drag and drop your file or click to browse. AO Curates will review each file and mark it as approved or request a revision.",
  },
  {
    number: "06",
    title: "FAQs",
    description: "At the bottom of your portal you will find answers to the most common questions about Atlanta. If you have a question that is not covered, reach out to AO Curates directly on WhatsApp.",
  },
];

export default function PortalTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1rem", pointerEvents: "none" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "2rem 2rem 1.5rem", maxWidth: "460px", width: "100%", boxShadow: "0 8px 40px #00000022", border: "1px solid #e8e0d5", fontFamily: "Georgia, serif", pointerEvents: "all", marginTop: "1rem" }}>

        {/* Progress bar */}
        <div style={{ display: "flex", gap: "5px", marginBottom: "1.5rem" }}>
          {steps.map((_, i) => (
            <div key={i} style={{ height: "3px", flex: 1, borderRadius: "2px", background: i <= step ? "#2c1810" : "#e8e0d5", transition: "background 0.3s" }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2rem", color: "#f0ebe4", lineHeight: 1, marginBottom: "0.5rem" }}>{current.number}</div>
          <div style={{ fontSize: "1.05rem", color: "#2c1810", marginBottom: "0.5rem" }}>{current.title}</div>
          <p style={{ fontSize: "0.85rem", color: "#8b7355", lineHeight: 1.75, margin: 0 }}>{current.description}</p>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => setStep(s => s - 1)}
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#8b7355", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontFamily: "Georgia, serif", visibility: step === 0 ? "hidden" : "visible" }}
          >
            ← Back
          </button>
          <button
            onClick={() => isLast ? onClose() : setStep(s => s + 1)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}
          >
            {isLast ? "Done ✓" : "Next →"}
          </button>
        </div>

        {/* Skip */}
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button onClick={onClose} style={{ fontSize: "0.75rem", color: "#c8bfb5", background: "transparent", border: "none", cursor: "pointer", fontFamily: "Georgia, serif" }}>
            Skip tour
          </button>
        </div>

      </div>
    </div>
  );
}
