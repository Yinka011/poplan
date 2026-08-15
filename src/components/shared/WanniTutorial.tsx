"use client";
import { useState } from "react";

type Props = {
  onClose: () => void;
};

const steps = [
  {
    icon: "🌍",
    title: "Welcome to your Nalpop dashboard",
    desc: "This is your command centre for managing your Houston pop-up. Everything you need is in the sidebar menu. This tour will walk you through each section.",
    tip: "",
  },
  {
    icon: "📊",
    title: "Overview",
    desc: "Your overview page shows the most important information at a glance — your location, total budget vs spending, task progress and days to the event. Below that you can see your planner details, invoice status, shipments and tasks from your planner.",
    tip: "Check this page first every time you log in.",
  },
  {
    icon: "📋",
    title: "Planning Hub",
    desc: "Your planner has added all the decor, refreshments and staffing suggestions here. Review each item carefully. You can approve items you are happy with or decline ones you want to remove. Use the comment button to leave notes or ask questions on specific items.",
    tip: "Approving an item confirms you are happy for it to be included in your event.",
  },
  {
    icon: "💰",
    title: "Expenses",
    desc: "The expenses page shows a full breakdown of all costs — decor, refreshments, staffing and any additional venue or operational costs. You can set your target budget at the top and track how much of it has been used. A progress bar shows you where you are.",
    tip: "If you go over budget you will see a warning at the top of the page.",
  },
  {
    icon: "📄",
    title: "Invoices",
    desc: "When your planner uploads an invoice for an approved item it appears here. Review each invoice carefully before approving. You can download the invoice, approve it for payment or reject it with a note explaining why.",
    tip: "Only approve invoices you have verified and are happy to pay.",
  },
  {
    icon: "✅",
    title: "Tasks",
    desc: "Tasks assigned to you by your planner appear here. You also have your own personal task list. Tick off tasks as you complete them to keep your planner updated on your progress.",
    tip: "Overdue tasks are highlighted in red — complete them as soon as possible.",
  },
  {
    icon: "📦",
    title: "Shipments",
    desc: "Track everything being shipped to the venue. Each item shows its name and shipping status. Click the pencil icon on any item to add the courier (DHL, UPS, FedEx etc) and tracking number. Your planner can see these details and mark items as received when they arrive at the venue.",
    tip: "Add your courier and tracking number as soon as you ship so your planner can track the delivery.",
  },
  {
    icon: "💬",
    title: "Chat",
    desc: "Use the chat to communicate directly with your planner. All messages are saved here so nothing gets lost in WhatsApp or email. You will receive an email notification when your planner sends you a message.",
    tip: "This is the best place for all event-related communication.",
  },
  {
    icon: "🖼",
    title: "Mood Board",
    desc: "A shared inspiration board between you and your planner. Pin images, colours and references to align on the aesthetic and vision for your pop-up. Your planner can also add their own pins here.",
    tip: "Add as many references as possible early so your planner understands your vision.",
  },
  {
    icon: "🌟",
    title: "You are all set",
    desc: "Start by reviewing the Planning Hub — approve or decline the items your planner has suggested. Then check your invoices and tasks. Use the chat if you have any questions for your planner.",
    tip: "",
  },
];

export default function WanniTutorial({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000077", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#1B3A2D", borderRadius: "20px", padding: "2.5rem", maxWidth: "520px", width: "100%", fontFamily: "Georgia, serif", maxHeight: "90vh", overflowY: "auto" as const }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.65rem", color: "#ffffff55", letterSpacing: "0.15em" }}>GETTING STARTED {step + 1} OF {steps.length}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#ffffff55", fontSize: "1.2rem", padding: "2px 6px" }}>✕</button>
        </div>

        {/* Progress bar */}
        <div style={{ height: "2px", background: "#ffffff22", borderRadius: "2px", marginBottom: "2rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((step + 1) / steps.length) * 100}%`, background: "#E8C97A", borderRadius: "2px", transition: "width 0.3s" }} />
        </div>

        {/* Icon */}
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{current.icon}</div>

        {/* Content */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "1.2rem", color: "#fff", marginBottom: "0.75rem", lineHeight: 1.3 }}>{current.title}</div>
          <div style={{ fontSize: "0.9rem", color: "#ffffff88", lineHeight: 1.8 }}>{current.desc}</div>
          {current.tip && (
            <div style={{ marginTop: "1rem", padding: "10px 14px", background: "#ffffff11", borderRadius: "8px", borderLeft: "3px solid #E8C97A" }}>
              <div style={{ fontSize: "0.75rem", color: "#E8C97A", letterSpacing: "0.08em", marginBottom: "2px" }}>TIP</div>
              <div style={{ fontSize: "0.82rem", color: "#ffffff88" }}>{current.tip}</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", gap: "10px" }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #ffffff22", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer", color: "#ffffff88", fontFamily: "Georgia, serif" }}>Back</button>
          )}
          <button onClick={isLast ? onClose : () => setStep(step + 1)} style={{ flex: 2, padding: "10px", background: "#E8C97A", border: "none", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer", color: "#1B3A2D", fontFamily: "Georgia, serif" }}>
            {isLast ? "Start exploring" : "Next"}
          </button>
        </div>

        {!isLast && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "#ffffff33", fontFamily: "Georgia, serif" }}>Skip tutorial</button>
          </div>
        )}
      </div>
    </div>
  );
}
