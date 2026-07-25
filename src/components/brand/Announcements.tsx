"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Announcement = {
  id: number;
  created_at: string;
  message: string;
  author: string;
  pinned: boolean;
};

export default function Announcements({ event, brandEmail }: { event: string; brandEmail?: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);

  const storageKey = `dismissed_announcements_${brandEmail || event}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setDismissed(JSON.parse(saved));

    fetchAnnouncements();
    const channel = supabase
      .channel("announcements-brand")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        fetchAnnouncements();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("event", event)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (data) setAnnouncements(data);
  };

  const dismiss = (id: number) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  const visible = announcements.filter(a => !dismissed.includes(a.id));

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "1rem", color: "#1B3A2D", fontFamily: "Georgia, serif" }}>Announcements</div>
        {visible.length > 0 && (
          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: "#f0f4f1", color: "#4a5a52" }}>{visible.length}</span>
        )}
      </div>

      {visible.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>No new announcements.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {visible.map(a => (
            <div key={a.id} style={{ background: a.pinned ? "#fdf8f3" : "#f8faf8", borderRadius: "10px", padding: "1rem", border: `1px solid ${a.pinned ? "#e4ebe6" : "#f0f4f1"}`, position: "relative" as const }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {a.pinned && <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px", background: "#f0f4f1", color: "#4a5a52", letterSpacing: "0.05em" }}>PINNED</span>}
                  <span style={{ fontSize: "0.75rem", color: "#E8C97A", fontWeight: 500 }}>{a.author}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{formatDate(a.created_at)}</span>
                  {!a.pinned && (
                    <button
                      onClick={() => dismiss(a.id)}
                      title="Dismiss"
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "12px", padding: "2px 4px", lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#4a5a52")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: "0.875rem", color: "#1B3A2D", lineHeight: 1.7, margin: 0 }}>{a.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}