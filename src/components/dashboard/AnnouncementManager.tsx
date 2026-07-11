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

export default function AnnouncementManager({ event }: { event: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [pinned, setPinned] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    const channel = supabase
      .channel("announcements-org")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, fetchAnnouncements)
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

  const postAnnouncement = async () => {
    if (!newMessage.trim()) return;
    setSaving(true);
    const { data } = await supabase.from("announcements").insert({
      event,
      message: newMessage,
      author: "AO Curates",
      pinned,
    }).select().single();
    if (data) setAnnouncements(prev => [data, ...prev]);
    setNewMessage("");
    setPinned(false);
    setAdding(false);
    setSaving(false);
  };

  const deleteAnnouncement = async (id: number) => {
    if (!confirm("Delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const togglePin = async (announcement: Announcement) => {
    await supabase.from("announcements").update({ pinned: !announcement.pinned }).eq("id", announcement.id);
    setAnnouncements(prev => prev.map(a => a.id === announcement.id ? { ...a, pinned: !a.pinned } : a));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "1.1rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>Announcements</div>
          <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>All brands see these in their portal instantly</div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ fontSize: "0.8rem", padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Post</button>
      </div>

      {adding && (
        <div style={{ background: "#faf8f5", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
          <textarea
            placeholder="Write your announcement to all brands..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.875rem", fontFamily: "Georgia, serif", marginBottom: "10px", boxSizing: "border-box" as const, resize: "vertical" as const }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#8b7355", cursor: "pointer" }}>
              <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
              Pin this announcement
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={postAnnouncement} disabled={saving} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {saving ? "Posting..." : "Post to all brands"}
              </button>
              <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {announcements.map(a => (
          <div key={a.id} style={{ background: a.pinned ? "#fdf8f3" : "#faf8f5", borderRadius: "10px", padding: "1rem", border: `1px solid ${a.pinned ? "#e8e0d5" : "#f0ebe4"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {a.pinned && <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "10px", background: "#f0ebe4", color: "#8b7355" }}>📌 Pinned</span>}
                <span style={{ fontSize: "0.8rem", color: "#8b7355" }}>{formatDate(a.created_at)}</span>
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                <button onClick={() => togglePin(a)} title={a.pinned ? "Unpin" : "Pin"} style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", padding: "2px 6px", borderRadius: "4px", color: "#8b7355" }}>📌</button>
                <button onClick={() => deleteAnnouncement(a.id)} title="Delete" style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "13px", padding: "2px 6px", borderRadius: "4px", color: "#8b7355" }}>🗑️</button>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#2c1810", lineHeight: 1.7, margin: 0 }}>{a.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}