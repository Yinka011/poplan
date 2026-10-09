"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type Message = {
  id: number;
  brand_email: string;
  sender_name: string;
  sender_email: string;
  message: string;
  created_at: string;
  read_by_organizer: boolean;
};

export default function MessagesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventDisplayName, setEventDisplayName] = useState("");

  useEffect(() => { fetchMessages(); }, [slug]);

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email || "";
    if (!email) return;
    setOrganizerEmail(email);
    const { data: eventData } = await supabase.from("events").select("city, name").eq("slug", slug).maybeSingle();
    const city = eventData?.city || "";
    setEventCity(city);
    if (eventData?.name) setEventDisplayName(eventData.name);
    if (!city) { setLoading(false); return; }
    const { data } = await supabase.from("brand_messages")
      .select("*")
      .eq("event", city)
      .eq("organizer_email", email)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data);
      if (!selectedBrand && data.length > 0) setSelectedBrand(data[0].brand_email);
    }
    await supabase.from("brand_messages").update({ read_by_organizer: true })
      .eq("event", city)
      .eq("organizer_email", email)
      .eq("read_by_organizer", false);
    setLoading(false);
  };

  const sendReply = async (brandEmail: string) => {
    const msg = reply[brandEmail]?.trim();
    if (!msg) return;
    setSending(brandEmail);
    await supabase.from("brand_messages").insert({
      event: eventCity,
      organizer_email: organizerEmail,
      brand_email: brandEmail,
      sender_name: "Organizer",
      sender_email: organizerEmail,
      message: msg,
      read_by_organizer: true,
    });
    setReply(prev => ({ ...prev, [brandEmail]: "" }));
    await fetchMessages();
    setSending(null);
  };

  const brands = [...new Set(messages.map(m => m.brand_email))];
  const grouped = brands.reduce((acc, brand) => {
    acc[brand] = messages.filter(m => m.brand_email === brand);
    return acc;
  }, {} as Record<string, Message[]>);

  const getBrandName = (email: string) => {
    const msgs = grouped[email];
    return msgs?.find(m => m.sender_email === email)?.sender_name || email;
  };

  const getUnread = (email: string) => grouped[email]?.filter(m => !m.read_by_organizer && m.sender_email === email).length || 0;

  if (loading) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back</Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>Messages — {eventDisplayName}</div>
        <div style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#ffffff66" }}>{brands.length} conversations</div>
      </div>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {brands.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", border: "1px solid #e4ebe6", textAlign: "center" as const, color: "#4a5a52", fontSize: "0.88rem" }}>
            No messages yet. Brands will message you from their portal.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: "0", border: "1px solid #e4ebe6", borderRadius: "14px", overflow: "hidden", minHeight: "520px" }}>
            {/* Brand list */}
            <div style={{ borderRight: "1px solid #e4ebe6", background: "#f8faf8" }}>
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #e4ebe6", fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.1em" }}>CONVERSATIONS</div>
              {brands.map(brand => {
                const unread = getUnread(brand);
                const lastMsg = [...(grouped[brand] || [])].reverse()[0];
                return (
                  <div key={brand} onClick={() => setSelectedBrand(brand)} style={{ padding: "10px 14px", cursor: "pointer", background: selectedBrand === brand ? "#1B3A2D" : "#fff", borderBottom: "1px solid #e4ebe6" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                      <div style={{ fontSize: "0.85rem", color: selectedBrand === brand ? "#fff" : "#1B3A2D" }}>{getBrandName(brand)}</div>
                      {unread > 0 && <span style={{ background: "#c0392b", color: "#fff", fontSize: "0.65rem", padding: "2px 6px", borderRadius: "10px" }}>{unread}</span>}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: selectedBrand === brand ? "#ffffff66" : "#4a5a52", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{lastMsg?.message}</div>
                  </div>
                );
              })}
            </div>

            {/* Thread */}
            <div style={{ display: "flex", flexDirection: "column" as const, background: "#fff" }}>
              {!selectedBrand ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#4a5a52", fontSize: "0.85rem" }}>Select a conversation</div>
              ) : (
                <>
                  <div style={{ padding: "12px 16px", borderBottom: "1px solid #e4ebe6", fontSize: "0.88rem", color: "#1B3A2D" }}>{getBrandName(selectedBrand)}</div>
                  <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column" as const, gap: "10px", overflowY: "auto" as const, maxHeight: "400px" }}>
                    {(grouped[selectedBrand] || []).map(msg => {
                      const isOrganizer = msg.sender_email === organizerEmail;
                      return (
                        <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: isOrganizer ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "72%", padding: "8px 12px", borderRadius: "10px", background: isOrganizer ? "#1B3A2D" : "#f0f4f1", color: isOrganizer ? "#fff" : "#1B3A2D", fontSize: "0.85rem", lineHeight: 1.5 }}>
                            {msg.message}
                          </div>
                          <div style={{ fontSize: "0.65rem", color: "#4a5a52", marginTop: "3px" }}>
                            {new Date(msg.created_at).toLocaleDateString()} · {isOrganizer ? "You" : msg.sender_name}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ padding: "12px 16px", borderTop: "1px solid #e4ebe6", display: "flex", gap: "8px" }}>
                    <input
                      placeholder="Type a message..."
                      value={reply[selectedBrand] || ""}
                      onChange={e => setReply(prev => ({ ...prev, [selectedBrand]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && sendReply(selectedBrand)}
                      style={{ flex: 1, padding: "8px 12px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", outline: "none" }}
                    />
                    <button onClick={() => sendReply(selectedBrand)} disabled={sending === selectedBrand} style={{ padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      {sending === selectedBrand ? "..." : "Send"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
