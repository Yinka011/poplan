"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingView from "@/components/LoadingView";
import { useParams } from "next/navigation";
import Link from "next/link";
import MessagesSkeleton from "./MessagesSkeleton";
import { formatEventName } from "@/lib/events";

type Message = {
  id: number;
  brand_email: string;
  sender_name: string;
  sender_email: string;
  message: string;
  created_at: string;
  read_by_organizer: boolean;
};

type BrandRecord = { email: string; name: string };

export default function MessagesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [allBrands, setAllBrands] = useState<BrandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventDisplayName, setEventDisplayName] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const sendRequest = useRef<{ slug: string; brand: string } | null>(null);
  const currentSlug = useRef(slug);
  currentSlug.current = slug;

  useEffect(() => {
    setReply({});
    setSending(null);
    setSelectedBrand(null);
    setSearch("");
  }, [slug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    const fetchMessages = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        const email = user?.email;
        if (!email) throw new Error("Please sign in to view messages.");
        const { data: eventData, error: eventError } = await supabase
          .from("events")
          .select("city, name")
          .eq("slug", slug)
          .maybeSingle();
        if (eventError) throw eventError;
        const city = eventData?.city;
        if (!city) throw new Error("Event not found.");

        const [msgRes, brandRes] = await Promise.all([
          supabase
            .from("brand_messages")
            .select("*")
            .eq("event", formatEventName(slug))
            .eq("organizer_email", email)
            .order("created_at", { ascending: true }),
          supabase
            .from("brands")
            .select("email, name")
            .eq("event", formatEventName(slug))
            .eq("organizer_email", email),
        ]);
        if (msgRes.error) throw msgRes.error;
        if (brandRes.error) throw brandRes.error;
        if (!active) return;
        const loadedMessages: Message[] = msgRes.data ?? [];
        const loadedBrands: BrandRecord[] = brandRes.data ?? [];
        const available = new Set([
          ...loadedMessages.map((m) => m.brand_email),
          ...loadedBrands.map((b) => b.email),
        ]);
        setOrganizerEmail(email);
        setEventCity(city);
        setEventDisplayName(eventData?.name || city);
        setMessages(loadedMessages);
        setAllBrands(loadedBrands);
        setSelectedBrand((current) =>
          current && available.has(current)
            ? current
            : loadedBrands[0]?.email || loadedMessages[0]?.brand_email || null,
        );
        setLoadedFor(slug);

        try {
          const { error: readError } = await supabase
            .from("brand_messages")
            .update({ read_by_organizer: true })
            .eq("event", formatEventName(slug))
            .eq("organizer_email", email)
            .eq("read_by_organizer", false);
          if (readError) throw readError;
        } catch (error) {
          console.error("Failed to mark messages read:", error);
          if (active)
            alert("Could not mark messages as read. Please try again.");
        }
      } catch (error) {
        if (!active) return;
        console.error("Failed to load messages:", error);
        setLoadError(
          error instanceof Error &&
            (error.message === "Please sign in to view messages." ||
              error.message === "Event not found.")
            ? error.message
            : "Could not load messages. Please try again.",
        );
        setLoadedFor(slug);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchMessages();
    return () => {
      active = false;
    };
  }, [slug, retry]);

  const sendReply = async (brandEmail: string) => {
    if (sendRequest.current?.slug === slug) return;
    const msg = reply[brandEmail]?.trim();
    if (!msg) {
      alert("Enter a message before sending.");
      return;
    }
    const request = { slug, brand: brandEmail };
    sendRequest.current = request;
    setSending(brandEmail);
    try {
      const { data, error } = await supabase
        .from("brand_messages")
        .insert({
          event: formatEventName(slug),
          organizer_email: organizerEmail,
          brand_email: brandEmail,
          sender_name: "Organizer",
          sender_email: organizerEmail,
          message: msg,
          read_by_organizer: true,
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("The sent message was not returned.");
      if (currentSlug.current !== request.slug) return;
      setMessages((prev) => [...prev, data]);
      setReply((prev) => ({ ...prev, [brandEmail]: "" }));
    } catch (error) {
      console.error("Failed to send message:", error);
      if (currentSlug.current === request.slug)
        alert("Could not send message. Please try again.");
    } finally {
      if (sendRequest.current === request) {
        sendRequest.current = null;
        setSending(null);
      }
    }
  };

  // Merge: all brands + any brand that has messaged (even if not in brands table)
  const brandsWithMessages = [...new Set(messages.map((m) => m.brand_email))];
  const allBrandEmails = [
    ...new Set([...allBrands.map((b) => b.email), ...brandsWithMessages]),
  ];

  const grouped = allBrandEmails.reduce(
    (acc, brand) => {
      acc[brand] = messages.filter((m) => m.brand_email === brand);
      return acc;
    },
    {} as Record<string, Message[]>,
  );

  const getBrandName = (email: string) => {
    const fromBrands = allBrands.find((b) => b.email === email)?.name;
    if (fromBrands) return fromBrands;
    const msgs = grouped[email];
    return msgs?.find((m) => m.sender_email === email)?.sender_name || email;
  };

  const getUnread = (email: string) =>
    grouped[email]?.filter(
      (m) => !m.read_by_organizer && m.sender_email === email,
    ).length || 0;
  const hasMessages = (email: string) => (grouped[email] || []).length > 0;
  const query = search.trim().toLocaleLowerCase();
  const visibleBrands = allBrandEmails.filter(
    (brand) =>
      !query ||
      [
        brand,
        getBrandName(brand),
        ...(grouped[brand] || []).map((m) => m.message),
      ].some((value) => value?.toLocaleLowerCase().includes(query)),
  );
  const visibleSelection =
    selectedBrand && visibleBrands.includes(selectedBrand)
      ? selectedBrand
      : null;

  return (
    <div
      className="[overflow-wrap:anywhere]"
      style={{ minHeight: "100vh", background: "#f8faf8" }}
    >
      <div
        style={{
          background: "#1B3A2D",
          padding: "1rem 2rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <Link
          href={`/organizer/events/${slug}`}
          style={{
            fontSize: "0.8rem",
            color: "#E8C97A",
            textDecoration: "none",
          }}
        >
          ← Back to {eventDisplayName}
        </Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>
          Messages — {eventDisplayName}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontSize: "0.78rem",
            color: "#ffffff66",
          }}
        >
          {allBrandEmails.length} brands
        </div>
      </div>

      <div
        style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        <LoadingView
          loading={loading || loadedFor !== slug}
          error={loadError}
          onRetry={() => setRetry((value) => value + 1)}
          customLoader={<MessagesSkeleton />}
        >
          {allBrandEmails.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "3rem",
                border: "1px solid #e4ebe6",
                textAlign: "center" as const,
                color: "#4a5a52",
                fontSize: "0.88rem",
              }}
            >
              No brands added to this event yet. Add brands first from the
              Brands tab.
            </div>
          ) : (
            <div
              className="grid grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)]"
              style={{
                gap: "0",
                border: "1px solid #e4ebe6",
                borderRadius: "14px",
                overflow: "hidden",
                minHeight: "520px",
              }}
            >
              {/* Brand list */}
              <div
                className="max-h-64 overflow-y-auto sm:max-h-none"
                style={{
                  borderRight: "1px solid #e4ebe6",
                  background: "#f8faf8",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid #e4ebe6",
                    fontSize: "0.65rem",
                    color: "#4a5a52",
                    letterSpacing: "0.1em",
                  }}
                >
                  BRANDS
                </div>
                <div
                  style={{ padding: "10px", borderBottom: "1px solid #e4ebe6" }}
                >
                  <input
                    type="search"
                    aria-label="Search conversations"
                    placeholder="Search conversations"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "8px",
                      border: "1px solid #e4ebe6",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                    }}
                  />
                </div>
                {visibleBrands.length === 0 && (
                  <div
                    style={{
                      padding: "12px 14px",
                      color: "#4a5a52",
                      fontSize: "0.82rem",
                    }}
                  >
                    No matching conversations.
                  </div>
                )}
                {visibleBrands.map((brand) => {
                  const unread = getUnread(brand);
                  const lastMsg = [...(grouped[brand] || [])].reverse()[0];
                  const noThread = !hasMessages(brand);
                  return (
                    <div
                      key={brand}
                      onClick={() => setSelectedBrand(brand)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        background:
                          selectedBrand === brand ? "#1B3A2D" : "#fff",
                        borderBottom: "1px solid #e4ebe6",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "2px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: selectedBrand === brand ? "#fff" : "#1B3A2D",
                          }}
                        >
                          {getBrandName(brand)}
                        </div>
                        {unread > 0 && (
                          <span
                            style={{
                              background: "#c0392b",
                              color: "#fff",
                              fontSize: "0.65rem",
                              padding: "2px 6px",
                              borderRadius: "10px",
                            }}
                          >
                            {unread}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color:
                            selectedBrand === brand ? "#ffffff66" : "#4a5a52",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        {noThread
                          ? "No messages yet — start the conversation"
                          : lastMsg?.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Thread */}
              <div
                style={{
                  minWidth: 0,
                  minHeight: "300px",
                  display: "flex",
                  flexDirection: "column" as const,
                  background: "#fff",
                }}
              >
                {!visibleSelection ? (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4a5a52",
                      fontSize: "0.85rem",
                    }}
                  >
                    Select a brand to message
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #e4ebe6",
                        fontSize: "0.88rem",
                        color: "#1B3A2D",
                      }}
                    >
                      {getBrandName(visibleSelection)}
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "#4a5a52",
                          marginLeft: "8px",
                        }}
                      >
                        {visibleSelection}
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: "16px",
                        display: "flex",
                        flexDirection: "column" as const,
                        gap: "10px",
                        overflowY: "auto" as const,
                        maxHeight: "400px",
                      }}
                    >
                      {(grouped[visibleSelection] || []).length === 0 ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#4a5a52",
                            fontSize: "0.85rem",
                            fontStyle: "italic",
                          }}
                        >
                          No messages yet. Send the first one below.
                        </div>
                      ) : (
                        (grouped[visibleSelection] || []).map((msg) => {
                          const isOrganizer =
                            msg.sender_email === organizerEmail;
                          return (
                            <div
                              key={msg.id}
                              style={{
                                display: "flex",
                                flexDirection: "column" as const,
                                alignItems: isOrganizer
                                  ? "flex-end"
                                  : "flex-start",
                              }}
                            >
                              <div
                                style={{
                                  maxWidth: "72%",
                                  padding: "8px 12px",
                                  borderRadius: "10px",
                                  background: isOrganizer
                                    ? "#1B3A2D"
                                    : "#f0f4f1",
                                  color: isOrganizer ? "#fff" : "#1B3A2D",
                                  fontSize: "0.85rem",
                                  lineHeight: 1.5,
                                }}
                              >
                                {msg.message}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#4a5a52",
                                  marginTop: "3px",
                                }}
                              >
                                {new Date(msg.created_at).toLocaleDateString()}{" "}
                                · {isOrganizer ? "You" : msg.sender_name}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderTop: "1px solid #e4ebe6",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <input
                        placeholder="Type a message..."
                        disabled={sending === visibleSelection}
                        value={reply[visibleSelection] || ""}
                        onChange={(e) =>
                          setReply((prev) => ({
                            ...prev,
                            [visibleSelection]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.nativeEvent.isComposing)
                            void sendReply(visibleSelection);
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          padding: "8px 12px",
                          border: "1px solid #e4ebe6",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => sendReply(visibleSelection)}
                        disabled={sending !== null}
                        style={{
                          padding: "8px 16px",
                          background: "#1B3A2D",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                        }}
                      >
                        {sending === visibleSelection ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </LoadingView>
      </div>
    </div>
  );
}
