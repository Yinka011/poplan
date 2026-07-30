"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type OrgNotification = {
  id: number;
  event: string;
  brand_name: string;
  brand_email: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
};

const typeIcon: Record<string, string> = {
  login: "👋",
  shipment: "📦",
  file_upload: "📁",
  inventory: "🏷",
  square_upload: "💳",
  task_complete: "✅",
  message: "💬",
  profile: "👤",
  default: "🔔",
};

const typeLabel: Record<string, string> = {
  login: "First login",
  shipment: "Shipment update",
  file_upload: "File uploaded",
  inventory: "Inventory update",
  square_upload: "Square upload",
  task_complete: "Task completed",
  message: "New message",
  profile: "Profile updated",
  default: "Activity",
};

export default function NotificationsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const event = slug.charAt(0).toUpperCase() + slug.slice(1);

  const [notifications, setNotifications] = useState<OrgNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchNotifications();
  }, [slug]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("organizer_notifications")
      .select("*")
      .eq("event", event)
      .order("created_at", { ascending: false });
    if (data) setNotifications(data);
    setLoading(false);

    // Mark all as read
    await supabase.from("organizer_notifications").update({ read: true }).eq("event", event).eq("read", false);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const types = ["all", "login", "message", "shipment", "file_upload", "square_upload", "task_complete"];
  const filtered = filter === "all" ? notifications : notifications.filter(n => n.type === filter);

  // Group by date
  const grouped: Record<string, OrgNotification[]> = {};
  filtered.forEach(n => {
    const date = new Date(n.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(n);
  });

  if (loading) return <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      
      {/* Header */}
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back to event</Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>Brand Activity — {event}</div>
        <div style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#ffffff55" }}>{notifications.length} total activities</div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{ padding: "5px 14px", background: filter === t ? "#1B3A2D" : "#fff", color: filter === t ? "#fff" : "#4a5a52", border: "1px solid " + (filter === t ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {t === "all" ? "All" : typeLabel[t]}
            </button>
          ))}
        </div>

        {/* Notifications grouped by date */}
        {Object.keys(grouped).length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "4rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No activity yet</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Brand activity will appear here as brands use their portals.</div>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} style={{ marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "0.75rem", paddingBottom: "6px", borderBottom: "1px solid #e4ebe6" }}>{date.toUpperCase()}</div>
              {items.map(n => (
                <div key={n.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "8px", border: "1px solid #e4ebe6", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f0f4f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                    {typeIcon[n.type] || typeIcon.default}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <div style={{ fontSize: "0.88rem", color: "#1B3A2D", fontWeight: 500 }}>{n.brand_name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>{formatTime(n.created_at)}</div>
                    </div>
                    <div style={{ fontSize: "0.82rem", color: "#4a5a52", lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginTop: "4px", padding: "2px 8px", background: "#f0f4f1", borderRadius: "10px", display: "inline-block" }}>{typeLabel[n.type] || "Activity"}</div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
