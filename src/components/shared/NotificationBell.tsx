"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Notification = {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
};

export default function NotificationBell({ userEmail }: { userEmail: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!userEmail) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications-" + userEmail)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_email=eq.${userEmail}` }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userEmail]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_email", userEmail)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data);
      setUnread(data.filter(n => !n.read).length);
    }
  };

  const handleClick = () => {
    router.push("/notifications");
  };

  return (
    <button
      onClick={handleClick}
      style={{ position: "relative", background: "transparent", border: "none", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8b89a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {unread > 0 && (
        <span style={{ position: "absolute", top: "0", right: "0", width: "16px", height: "16px", borderRadius: "50%", background: "#c0392b", color: "#fff", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}>
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
