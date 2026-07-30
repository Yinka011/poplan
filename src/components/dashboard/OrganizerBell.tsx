"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrgNotification = {
  id: number;
  event: string;
  brand_name: string;
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

export default function OrganizerBell({ event }: { event: string }) {
  const [notifications, setNotifications] = useState<OrgNotification[]>([]);
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel("organizer-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "organizer_notifications" }, payload => {
        setNotifications(prev => [payload.new as OrgNotification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("organizer_notifications")
      .select("*")
      .eq("event", event)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  };

  const markAllRead = async () => {
    await supabase.from("organizer_notifications").update({ read: true }).eq("event", event).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div style={{ position: "relative" as const }}>
      <button onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }} style={{ background: "transparent", border: "none", cursor: "pointer", position: "relative" as const, padding: "4px" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <div style={{ position: "absolute" as const, top: 0, right: 0, width: "16px", height: "16px", background: "#E8C97A", borderRadius: "50%", fontSize: "0.6rem", color: "#1B3A2D", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
            {unread > 9 ? "9+" : unread}
          </div>
        )}
      </button>

      {open && (
        <div style={{ position: "absolute" as const, right: 0, top: "36px", width: "340px", background: "#fff", borderRadius: "14px", boxShadow: "0 8px 40px #00000022", border: "1px solid #e4ebe6", zIndex: 100, maxHeight: "480px", overflow: "hidden", display: "flex", flexDirection: "column" as const }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #f0f4f1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>Brand activity</div>
            {unread > 0 && <button onClick={markAllRead} style={{ fontSize: "0.72rem", color: "#4a5a52", background: "transparent", border: "none", cursor: "pointer" }}>Mark all read</button>}
          </div>
          <div style={{ overflowY: "auto" as const, flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", fontSize: "0.85rem", color: "#4a5a52" }}>No activity yet</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ padding: "10px 1.25rem", borderBottom: "1px solid #f8f5f2", background: n.read ? "#fff" : "#f0f4f1", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ fontSize: "1.1rem", flexShrink: 0, marginTop: "2px" }}>{typeIcon[n.type] || typeIcon.default}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.82rem", color: "#1B3A2D", marginBottom: "2px" }}>{n.brand_name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#4a5a52", lineHeight: 1.4 }}>{n.message}</div>
                    <div style={{ fontSize: "0.68rem", color: "#8b7355", marginTop: "3px" }}>{formatTime(n.created_at)}</div>
                  </div>
                  {!n.read && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E8C97A", flexShrink: 0, marginTop: "6px" }} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
