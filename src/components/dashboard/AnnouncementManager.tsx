"use client";
import { useOrganizer } from "@/context/OrganizerContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { sendNotification } from "@/lib/notifications";
import { sendEmail, emailTemplate } from "@/lib/email";
import LoadingView from "@/components/LoadingView";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";

type Announcement = {
  id: number;
  created_at: string;
  message: string;
  author: string;
  pinned: boolean;
};

export default function AnnouncementManager({ event }: { event: string }) {
  const { organizerEmail, loading: organizerLoading } = useOrganizer();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [newMessage, setNewMessage] = useState("");
  const [pinned, setPinned] = useState(false);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (organizerLoading) return;
    let active = true;
    let latestRequest = 0;
    setLoading(true);
    setLoadError("");

    const fetchAnnouncements = async () => {
      const request = ++latestRequest;
      try {
        if (!organizerEmail) throw new Error("Please sign in to view announcements.");
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("event", event)
          .eq("organizer_email", organizerEmail)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (active && request === latestRequest) {
          setAnnouncements(data || []);
          setLoadError("");
        }
      } catch (error) {
        console.error("Failed to load announcements:", error);
        if (active && request === latestRequest) setLoadError("Could not load announcements. Please try again.");
      } finally {
        if (active && request === latestRequest) setLoading(false);
      }
    };

    void fetchAnnouncements();
    const channel = supabase
      .channel("announcements-org")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => { void fetchAnnouncements(); })
      .subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [event, organizerEmail, organizerLoading, retry]);

  const postAnnouncement = async () => {
    if (saving) return;
    if (!newMessage.trim()) {
      alert("Enter an announcement before posting.");
      return;
    }
    if (!organizerEmail) {
      alert("Please sign in before posting an announcement.");
      return;
    }
    setSaving(true);
    let posted = false;
    try {
      const { data, error } = await supabase.from("announcements").insert({
        event,
        organizer_email: organizerEmail,
        message: newMessage,
        author: organizerEmail,
        pinned,
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error("The new announcement was not returned.");
      posted = true;
      setAnnouncements(prev => [data, ...prev.filter(item => item.id !== data.id)]);
      setNewMessage("");
      setPinned(false);
      setAdding(false);

      const { data: brands, error: brandsError } = await supabase.from("brands").select("email").eq("event", event).eq("organizer_email", organizerEmail).not("email", "is", null);
      if (brandsError) throw brandsError;
      const emails = (brands || []).map(brand => brand.email).filter((email): email is string => typeof email === "string" && email.trim().length > 0);
      if (emails.length > 0) {
        const [notificationResults, emailResult] = await Promise.allSettled([
          Promise.all(emails.map(recipientEmail => sendNotification({
            recipientEmail,
            eventSlug: event,
            type: "announcement",
            title: "New announcement",
            message: newMessage.slice(0, 100),
            link: "/brand/portal",
          }))),
          sendEmail({
            to: emails,
            subject: "New announcement",
            html: emailTemplate({
              title: "New announcement",
              message: newMessage,
              buttonText: "View in portal",
              buttonUrl: "https://nalpop.com/brand/portal",
            }),
          }),
        ]);
        if (
          notificationResults.status === "rejected" ||
          notificationResults.value.some(success => !success) ||
          emailResult.status === "rejected" ||
          !emailResult.value?.success
        ) {
          throw new Error("One or more announcement notifications could not be sent.");
        }
      }
    } catch (error) {
      console.error("Failed to post or notify about announcement:", error);
      alert(posted
        ? "The announcement was posted, but some brand notifications could not be sent."
        : "Could not post the announcement. Please try again.");
    } finally {
      setSaving(false);
    }
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
    <LoadingView loading={loading || organizerLoading} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<DashboardSkeleton section="announcements" />}>
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "1.1rem", color: "#1B3A2D" }}>Announcements</div>
          <div style={{ fontSize: "0.8rem", color: "#4a5a52", marginTop: "2px" }}>All brands see these in their portal instantly</div>
        </div>
        <button onClick={() => setAdding(!adding)} disabled={saving} style={{ fontSize: "0.8rem", padding: "6px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>{saving ? "Posting..." : "+ Post"}</button>
      </div>

      {adding && (
        <div style={{ background: "#f8faf8", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #e4ebe6" }}>
          <textarea
            placeholder="Write your announcement to all brands..."
            disabled={saving}
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.875rem",  marginBottom: "10px", boxSizing: "border-box" as const, resize: "vertical" as const }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", color: "#4a5a52", cursor: "pointer" }}>
              <input type="checkbox" checked={pinned} disabled={saving} onChange={e => setPinned(e.target.checked)} />
              Pin this announcement
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={postAnnouncement} disabled={saving} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                {saving ? "Posting..." : "Post to all brands"}
              </button>
              <button onClick={() => setAdding(false)} disabled={saving} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {announcements.map(a => (
          <div key={a.id} style={{ background: a.pinned ? "#fdf8f3" : "#f8faf8", borderRadius: "10px", padding: "1rem", border: `1px solid ${a.pinned ? "#e4ebe6" : "#f0f4f1"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {a.pinned && <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px", background: "#f0f4f1", color: "#4a5a52", letterSpacing: "0.05em" }}>PINNED</span>}
                <span style={{ fontSize: "0.8rem", color: "#4a5a52" }}>{formatDate(a.created_at)}</span>
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <button
                  onClick={() => togglePin(a)}
                  title={a.pinned ? "Unpin" : "Pin"}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", lineHeight: 1, color: "#c8bfb5", fontSize: "12px" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#4a5a52")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}
                >
                  &#x2713;
                </button>
                <button
                  onClick={() => deleteAnnouncement(a.id)}
                  title="Delete"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", lineHeight: 1, color: "#c8bfb5", fontSize: "12px" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#4a5a52")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}
                >
                  &#x2715;
                </button>
              </div>
            </div>
            <p style={{ fontSize: "0.875rem", color: "#1B3A2D", lineHeight: 1.7, margin: 0 }}>{a.message}</p>
          </div>
        ))}
      </div>
    </div>
    </LoadingView>
  );
}