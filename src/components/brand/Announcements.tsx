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

export default function Announcements({ event }: { event: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5", marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "1rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>Announcements</div>
        {announcements.length > 0 && (
          <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: "#f0ebe4", color: "#8b7355" }}>{announcements.length}</span>
        )}
      </div>

      {announcements.length === 0 ? (
        <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No announcements yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {announcements.map(a => (
            <div key={a.id} style={{ background: a.pinned ? "#fdf8f3" : "#faf8f5", borderRadius: "10px", padding: "1rem", border: `1px solid ${a.pinned ? "#e8e0d5" : "#f0ebe4"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {a.pinned && <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px", background: "#f0ebe4", color: "#8b7355", letterSpacing: "0.05em" }}>PINNED</span>}
                  <span style={{ fontSize: "0.75rem", color: "#b87333", fontWeight: 500 }}>{a.author}</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>{formatDate(a.created_at)}</span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "#2c1810", lineHeight: 1.7, margin: 0 }}>{a.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}