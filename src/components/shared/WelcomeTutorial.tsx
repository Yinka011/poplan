"use client";
import { useState } from "react";

type Props = {
  cityName: string;
  onClose: () => void;
};

const steps = [
  {
    icon: "🏙",
    title: "Welcome to your city dashboard",
    desc: "This is your command centre for managing your pop-up. Everything you need is accessible from the sidebar menu on the left.",
  },
  {
    icon: "📋",
    title: "Planning Hub",
    desc: "Your planner has added decor, refreshments and staff suggestions here. Review each item and approve or decline. You can also add notes and questions per item.",
  },
  {
    icon: "💰",
    title: "Budget",
    desc: "Set your target budget and track spending across decor, refreshments and staffing. You will see a warning if you go over budget.",
  },
  {
    icon: "📄",
    title: "Invoices",
    desc: "Your planner will upload invoices for approved items here. Review and approve or reject each invoice before payment is made.",
  },
  {
    icon: "✅",
    title: "Tasks",
    desc: "Tasks assigned to you by your planner appear here. You can also add your own tasks to stay on top of everything.",
  },
  {
    icon: "📦",
    title: "Shipments",
    desc: "Track everything you are shipping to the venue. Mark items as shipped so your planner knows what is on the way.",
  },
  {
    icon: "💬",
    title: "Chat",
    desc: "Message your planner directly here. All communication is saved so nothing gets lost in WhatsApp or email.",
  },
  {
    icon: "🖼",
    title: "Mood Board",
    desc: "A shared inspiration board between you and your planner. Pin images, colours and references to align on the aesthetic for your pop-up.",
  },
];

export default function WelcomeTutorial({ cityName, onClose }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "2.5rem", maxWidth: "480px", width: "100%", fontFamily: "Georgia, serif", position: "relative" as const }}>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "2rem", justifyContent: "center" }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i === step ? "20px" : "6px", height: "6px", borderRadius: "3px", background: i === step ? "#2c1810" : "#e8e0d5", transition: "all 0.3s" }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "1rem" }}>{current.icon}</div>

        {/* Content */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "1.2rem", color: "#2c1810", marginBottom: "0.75rem", lineHeight: 1.3 }}>{current.title}</div>
          <div style={{ fontSize: "0.88rem", color: "#8b7355", lineHeight: 1.7 }}>{current.desc}</div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer", color: "#8b7355", fontFamily: "Georgia, serif" }}>Back</button>
          )}
          <button onClick={isLast ? onClose : () => setStep(step + 1)} style={{ flex: 2, padding: "10px", background: "#2c1810", border: "none", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer", color: "#fff", fontFamily: "Georgia, serif" }}>
            {isLast ? `Let's go →` : "Next →"}
          </button>
        </div>

        {/* Skip */}
        {!isLast && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "#b0a090", fontFamily: "Georgia, serif" }}>Skip tutorial</button>
          </div>
        )}
      </div>
    </div>
  );
}
