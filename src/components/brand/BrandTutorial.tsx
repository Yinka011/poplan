"use client";
import { useState } from "react";

type Props = {
  brandName: string;
  eventName: string;
  onClose: () => void;
};

const steps = [
  {
    icon: "🖤",
    title: "Welcome to Nalpop",
    desc: "Your brand portal is your home base for the pop-up. Everything you need — from tasks to inventory to payments — is right here. This quick guide will walk you through each section in order.",
    tip: "",
  },
  {
    icon: "🏠",
    title: "Home",
    desc: "Your home page shows the most important information at a glance — your participation fee and payment status, the latest announcements from your organizer, your shipment status and your task progress.",
    tip: "Check your home page regularly for new announcements from the organizer.",
  },
  {
    icon: "✅",
    title: "Tasks",
    desc: "The Tasks tab shows everything you need to complete before the event. Each task has a due date and category. Click the circle next to a task to mark it as done. Stay on top of your tasks to avoid delays.",
    tip: "Complete all tasks before their due dates.",
  },
  {
    icon: "📁",
    title: "Files",
    desc: "Upload your brand assets here — logo, lookbook, product photos and press kit. These help your organizer best represent your brand at the pop-up. Upload high resolution images in PNG or JPG format.",
    tip: "Upload all files at least 2 weeks before the event.",
  },
  {
    icon: "💬",
    title: "Messages",
    desc: "Use the Messages tab to communicate directly with your organizer. Ask questions, share updates or flag any concerns. All messages are saved so nothing gets lost.",
    tip: "You will receive an email notification when the organizer replies.",
  },
  {
    icon: "📦",
    title: "Inventory",
    desc: "Add every product you are sending to the pop-up here. For each product add the name, price, category and a photo. Then add variations for each size and colour combination with the quantity available.",
    tip: "Upload your inventory to Square at least 1 week before the event.",
  },
  {
    icon: "📦",
    title: "How to add inventory",
    desc: "Click Add product, enter the name, category and price then upload a photo. Save the product then click Add variation to add each size and colour with its quantity. Once all products are added click Upload all to Square.",
    tip: "Every size and colour combination needs its own variation entry.",
  },
  {
    icon: "📊",
    title: "Sales and payout",
    desc: "After the event this tab shows every item sold, your total revenue, the organizer commission and your final payout amount. You can view sales by day and track your payout status.",
    tip: "Payouts are issued within 2 weeks after the event.",
  },
  {
    icon: "👤",
    title: "Profile",
    desc: "Fill in your Instagram handle, website and a short brand bio. This information helps your organizer promote your brand at the event and on social media.",
    tip: "A complete profile helps us tag you correctly on social media.",
  },
  {
    icon: "❓",
    title: "FAQ",
    desc: "The FAQ tab answers the most common questions about the event — shipping, commission, event hours, labelling requirements and payout timelines. Check here before messaging the organizer.",
    tip: "",
  },
  {
    icon: "🌟",
    title: "You are all set",
    desc: "Start by completing your to-do list, uploading your files and adding your inventory. The most important step is adding your inventory and uploading it to Square. Use the Messages tab if you need help.",
    tip: "",
  },
];

export default function BrandTutorial({ brandName, eventName, onClose }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === steps.length - 1;
  const current = steps[step];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: "20px", padding: "2.5rem", maxWidth: "520px", width: "100%", fontFamily: "Georgia, serif", position: "relative" as const, maxHeight: "90vh", overflowY: "auto" as const }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.15em" }}>GETTING STARTED {step + 1} OF {steps.length}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#4a5a52", fontSize: "1.2rem", padding: "2px 6px" }}>x</button>
        </div>

        <div style={{ height: "3px", background: "#e4ebe6", borderRadius: "2px", marginBottom: "2rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((step + 1) / steps.length) * 100}%`, background: "#1B3A2D", borderRadius: "2px", transition: "width 0.3s" }} />
        </div>

        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>{current.icon}</div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "1.2rem", color: "#1c1714", marginBottom: "0.75rem", lineHeight: 1.3 }}>{current.title}</div>
          <div style={{ fontSize: "0.9rem", color: "#4a5a52", lineHeight: 1.8 }}>{current.desc}</div>
          {current.tip && (
            <div style={{ marginTop: "1rem", padding: "10px 14px", background: "#f0f4f1", borderRadius: "8px", borderLeft: "3px solid #1B3A2D" }}>
              <div style={{ fontSize: "0.75rem", color: "#1B3A2D", letterSpacing: "0.08em", marginBottom: "2px" }}>TIP</div>
              <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>{current.tip}</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer", color: "#4a5a52", fontFamily: "Georgia, serif" }}>Back</button>
          )}
          <button onClick={isLast ? onClose : () => setStep(step + 1)} style={{ flex: 2, padding: "10px", background: "#1B3A2D", border: "none", borderRadius: "10px", fontSize: "0.85rem", cursor: "pointer", color: "#fff", fontFamily: "Georgia, serif" }}>
            {isLast ? "Start using Nalpop" : "Next"}
          </button>
        </div>

        {!isLast && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "0.78rem", color: "#b0a090", fontFamily: "Georgia, serif" }}>Skip tutorial</button>
          </div>
        )}
      </div>
    </div>
  );
}
