"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
  event_slug: string;
};

const typeColors: Record<string, { bg: string; color: string }> = {
  announcement: { bg: "#c4956a22", color: "#c4956a" },
  task: { bg: "#5b7fa622", color: "#5b7fa6" },
  file_rejected: { bg: "#c0392b22", color: "#c0392b" },
  message: { bg: "#4a7c5922", color: "#4a7c59" },
  shipment: { bg: "#8b6ab022", color: "#8b6ab0" },
};

const typeLabels: Record<string, string> = {
  announcement: "Announcement",
  task: "New Task",
  file_rejected: "File Rejected",
  message: "New Message",
  shipment: "Shipment Update",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUserEmail(user.email || "");

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_email", user.email)
        .order("created_at", { ascending: false });

      if (data) setNotifications(data);

      // Mark all as read
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("recipient_email", user.email)
        .eq("read", false);

      setLoading(false);
    };
    fetchAll();
  }, []);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#6b5f54" }}>Loading...</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#faf8f5", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#5a3e2b", padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href="/brand/portal" style={{ fontSize: "0.8rem", color: "#c8b89a", textDecoration: "none" }}>← Back</Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>Notifications</div>
      </div>

      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {notifications.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "3rem", textAlign: "center", border: "1px solid #e8e2da" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🔔</div>
            <div style={{ fontSize: "1rem", color: "#5a3e2b", marginBottom: "0.5rem" }}>No notifications yet</div>
            <div style={{ fontSize: "0.85rem", color: "#6b5f54" }}>You will be notified when there are updates on your events.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
            {notifications.map(notif => {
              const typeStyle = typeColors[notif.type] || { bg: "#f0ece6", color: "#6b5f54" };
              const typeLabel = typeLabels[notif.type] || notif.type;
              return (
                <div key={notif.id} onClick={() => notif.link && (window.location.href = notif.link)} style={{ background: notif.read ? "#fff" : "#fdf8f3", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid " + (notif.read ? "#e8e2da" : "#d4a85588"), cursor: notif.link ? "pointer" : "default", borderLeft: `3px solid ${typeStyle.color}` }}
                  onMouseEnter={e => notif.link && (e.currentTarget.style.background = "#faf5ee")}
                  onMouseLeave={e => (e.currentTarget.style.background = notif.read ? "#fff" : "#fdf8f3")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {!notif.read && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#c4956a", flexShrink: 0 }} />}
                      <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "20px", background: typeStyle.bg, color: typeStyle.color }}>{typeLabel}</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#6b5f54" }}>{formatDate(notif.created_at)}</span>
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#5a3e2b", fontWeight: notif.read ? "normal" : 500, marginBottom: "2px" }}>{notif.title}</div>
                  {notif.message && <div style={{ fontSize: "0.8rem", color: "#6b5f54", lineHeight: 1.5 }}>{notif.message}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
