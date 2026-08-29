"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type Features = {
  payment_tracker: boolean;
  checklist: boolean;
  marketing: boolean;
  planning: boolean;
  inventory: boolean;
  shipments: boolean;
  sales: boolean;
  brands: boolean;
  notifications: boolean;
};

const FEATURE_LIST = [
  { key: "brands", label: "Brands", desc: "Manage brands, send invites, track tasks" },
  { key: "payment_tracker", label: "Payment Tracker", desc: "Track participation fees and payments" },
  { key: "checklist", label: "Event Checklist", desc: "Task checklist for the event" },
  { key: "marketing", label: "Marketing Plans", desc: "Track marketing tasks and deadlines" },
  { key: "planning", label: "Planning Hub", desc: "Decor, refreshments and staffing" },
  { key: "inventory", label: "Inventory", desc: "Review brand inventory submissions" },
  { key: "shipments", label: "Shipments", desc: "Track brand shipments and deliveries" },
  { key: "sales", label: "Sales & Payouts", desc: "Square sales data and brand payouts" },
  { key: "notifications", label: "Notifications", desc: "Brand activity log and alerts" },
];

const DEFAULT_FEATURES: Features = {
  payment_tracker: true, checklist: true, marketing: true, planning: true,
  inventory: true, shipments: true, sales: true, brands: true, notifications: true,
};

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const eventName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);

  useEffect(() => { fetchFeatures(); }, [slug]);

  const fetchFeatures = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("organizer_features").select("*").eq("organizer_email", user.email).eq("event_slug", slug).maybeSingle();
    if (data) {
      setFeatures({ ...DEFAULT_FEATURES, ...data.features });
      setRecordId(data.id);
    }
  };

  const toggleFeature = (key: keyof Features) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const saveFeatures = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (recordId) {
      await supabase.from("organizer_features").update({ features }).eq("id", recordId);
    } else {
      const { data } = await supabase.from("organizer_features").insert({ organizer_email: user.email, event_slug: slug, features }).select().single();
      if (data) setRecordId(data.id);
    }
    setSaving(false);
    setSaved(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back to event</Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>Settings — {eventName}</div>
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>Dashboard features</div>
          <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1.5rem" }}>Choose which features appear in your event dashboard. You can change this at any time.</p>

          {FEATURE_LIST.map(feature => (
            <div key={feature.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f4f1" }}>
              <div>
                <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{feature.label}</div>
                <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{feature.desc}</div>
              </div>
              <div onClick={() => toggleFeature(feature.key as keyof Features)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: features[feature.key as keyof Features] ? "#1B3A2D" : "#e4ebe6", cursor: "pointer", position: "relative" as const, transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#fff", position: "absolute" as const, top: "3px", left: features[feature.key as keyof Features] ? "23px" : "3px", transition: "left 0.2s" }} />
              </div>
            </div>
          ))}

          <button onClick={saveFeatures} disabled={saving} style={{ marginTop: "1.5rem", width: "100%", padding: "10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.88rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
