"use client";
import { useOrganizer } from "@/context/OrganizerContext";
import Link from "next/link";
import OrganizerBell from "@/components/dashboard/OrganizerBell";
import LoadingView from "@/components/LoadingView";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { useEffect, useRef, useState } from "react";
import Checklist from "@/components/dashboard/Checklist";
import BrandActivityOverview from "@/components/dashboard/BrandActivityOverview";
import MarketingDeadlines from "@/components/dashboard/MarketingDeadlines";
import AnnouncementManager from "@/components/dashboard/AnnouncementManager";
import FeatureTour from "@/components/dashboard/FeatureTour";
import { type EventSummary } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { Loader2Icon } from "lucide-react";

type EventDashboardProps = {
  event: EventSummary;
};

const PencilIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export function EventDashboard({ event }: EventDashboardProps) {
  const { organizerEmail } = useOrganizer();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [brandsCount, setBrandsCount] = useState(0);
  const [outstandingTasks, setOutstandingTasks] = useState(0);
  const [spotsToFill, setSpotsToFill] = useState(0);
  const [editingSpots, setEditingSpots] = useState(false);
  const [savingSpots, setSavingSpots] = useState(false);
  const [newSpots, setNewSpots] = useState("0");
  const [venueAddress, setVenueAddress] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [datesLabel, setDatesLabel] = useState("");
  const [daysToEvent, setDaysToEvent] = useState<number | null>(null);
  const editingSpotsRef = useRef(false);
  const editingAddressRef = useRef(false);
  const spotsVersion = useRef(0);
  const addressVersion = useRef(0);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    setLoading(true);
    setLoadError("");

    const fetchData = async () => {
      const request = ++latestRequest;
      const currentSpotsVersion = spotsVersion.current;
      const currentAddressVersion = addressVersion.current;
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        const orgEmail = user?.email;
        if (!orgEmail)
          throw new Error("Please sign in to view the event overview.");

        const [brandsRes, checklistRes, settingsRes, eventRes] =
          await Promise.all([
            supabase
              .from("brands")
              .select("id")
              .eq("event", event.city)
              .eq("organizer_email", orgEmail),
            supabase
              .from("checklist")
              .select("completed")
              .eq("event", event.city)
              .eq("organizer_email", orgEmail),
            supabase
              .from("event_settings")
              .select("spots_to_fill, venue_address")
              .eq("event", event.city)
              .eq("organizer_email", orgEmail)
              .maybeSingle(),
            supabase
              .from("events")
              .select("dates_label, start_date")
              .eq("slug", event.slug)
              .maybeSingle(),
          ]);
        const fetchError =
          brandsRes.error ||
          checklistRes.error ||
          settingsRes.error ||
          eventRes.error;
        if (fetchError) throw fetchError;
        if (!active || request !== latestRequest) return;

        if (brandsRes.data) setBrandsCount(brandsRes.data.length);
        if (checklistRes.data)
          setOutstandingTasks(
            checklistRes.data.filter((i) => !i.completed).length,
          );
        if (settingsRes.data) {
          if (currentSpotsVersion === spotsVersion.current) {
            setSpotsToFill(settingsRes.data.spots_to_fill);
            if (!editingSpotsRef.current)
              setNewSpots(String(settingsRes.data.spots_to_fill));
          }
          if (currentAddressVersion === addressVersion.current) {
            setVenueAddress(settingsRes.data.venue_address || "");
            if (!editingAddressRef.current)
              setNewAddress(settingsRes.data.venue_address || "");
          }
        }
        if (eventRes.data) {
          if (eventRes.data.dates_label)
            setDatesLabel(eventRes.data.dates_label);
          if (eventRes.data.start_date) {
            const startDate = new Date(eventRes.data.start_date);
            const days = Math.ceil(
              (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );
            setDaysToEvent(days);
          }
        }
        setLoadError("");
      } catch (error) {
        console.error("Failed to load event overview:", error);
        if (active && request === latestRequest)
          setLoadError("Could not load the event overview. Please try again.");
      } finally {
        if (active && request === latestRequest) setLoading(false);
      }
    };

    void fetchData();
    const brandsChannel = supabase
      .channel("brands-stat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brands" },
        () => {
          void fetchData();
        },
      )
      .subscribe();
    const checklistChannel = supabase
      .channel("checklist-stat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklist" },
        () => {
          void fetchData();
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(brandsChannel);
      supabase.removeChannel(checklistChannel);
    };
  }, [event.city, event.slug, retry]);

  const saveSpots = async () => {
    if (savingSpots) return;
    const spots = Number(newSpots);
    if (!newSpots.trim() || !Number.isSafeInteger(spots)) {
      alert("Enter a valid whole number of spots.");
      return;
    }
    if (!organizerEmail) {
      alert("Please sign in before saving spots.");
      return;
    }
    setSavingSpots(true);
    spotsVersion.current += 1;
    try {
      const { error } = await supabase.from("event_settings").upsert(
        {
          event: event.city,
          organizer_email: organizerEmail,
          spots_to_fill: spots,
        },
        { onConflict: "event,organizer_email" },
      );
      if (error) throw error;
      spotsVersion.current += 1;
      setSpotsToFill(spots);
      editingSpotsRef.current = false;
      setEditingSpots(false);
    } catch (error) {
      console.error("Failed to save spots:", error);
      alert("Could not save spots. Please try again.");
    } finally {
      setSavingSpots(false);
    }
  };

  const saveAddress = async () => {
    if (savingAddress) return;
    if (!organizerEmail) {
      alert("Please sign in before saving the address.");
      return;
    }
    setSavingAddress(true);
    addressVersion.current += 1;
    try {
      const { error } = await supabase.from("event_settings").upsert(
        {
          event: event.city,
          organizer_email: organizerEmail,
          venue_address: newAddress,
        },
        { onConflict: "event,organizer_email" },
      );
      if (error) throw error;
      addressVersion.current += 1;
      setVenueAddress(newAddress);
      editingAddressRef.current = false;
      setEditingAddress(false);
    } catch (error) {
      console.error("Failed to save address:", error);
      alert("Could not save the address. Please try again.");
    } finally {
      setSavingAddress(false);
    }
  };

  return (
    <div className="min-w-0 space-y-8 [overflow-wrap:anywhere]">
      <FeatureTour slug={event.slug} />

      <LoadingView
        loading={loading}
        error={loadError}
        onRetry={() => setRetry((value) => value + 1)}
        customLoader={<DashboardSkeleton section="overview" />}
      >
        <div className="space-y-8">
          {/* Header */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Link
                href="/organizer/events"
                className="text-sm font-medium text-brown-600/70 transition-colors hover:text-brown-800"
              >
                ← All events
              </Link>
              <div
                style={{
                  background: "#1B3A2D",
                  padding: "6px 12px",
                  borderRadius: "8px",
                }}
              >
                <OrganizerBell event={event.city} slug={event.slug} />
              </div>
            </div>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium text-brown-800 sm:text-4xl">
              {event.name}
            </h1>
            {datesLabel && (
              <p className="mt-1 text-sm text-brown-600/70">{datesLabel}</p>
            )}
          </div>

          {/* Dark brown stats box */}
          <div
            style={{
              background: "#1B3A2D",
              borderRadius: "16px",
              padding: "1.75rem 2rem",
              color: "#fff",
            }}
          >
            <div
              className="grid grid-cols-2 gap-6 lg:grid-cols-4"
              style={{
                alignItems: "start",
              }}
            >
              {/* Spots to fill */}
              <div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#d4c87a",
                    letterSpacing: "0.1em",
                    marginBottom: "6px",
                  }}
                >
                  SPOTS TO FILL
                </div>
                {editingSpots ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column" as const,
                      gap: "6px",
                    }}
                  >
                    <input
                      type="number"
                      value={newSpots}
                      disabled={savingSpots}
                      onChange={(e) => setNewSpots(e.target.value)}
                      style={{
                        width: "60px",
                        padding: "4px 6px",
                        border: "1px solid #E8C97A",
                        borderRadius: "4px",
                        fontSize: "1.2rem",
                        background: "#2a4d3e",
                        color: "#fff",
                      }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={saveSpots}
                        disabled={savingSpots}
                        style={{
                          padding: "3px 8px",
                          background: "#E8C97A",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        {savingSpots ? (
                          <Loader2Icon className="animate-spin size-4" />
                        ) : (
                          "Save"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          editingSpotsRef.current = false;
                          setNewSpots(String(spotsToFill));
                          setEditingSpots(false);
                        }}
                        disabled={savingSpots}
                        style={{
                          padding: "3px 8px",
                          background: "transparent",
                          border: "1px solid #d4c87a44",
                          color: "#d4c87a",
                          borderRadius: "4px",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div style={{ fontSize: "2rem", fontWeight: "normal" }}>
                      {spotsToFill}
                    </div>
                    <button
                      onClick={() => {
                        editingSpotsRef.current = true;
                        setNewSpots(String(spotsToFill));
                        setEditingSpots(true);
                      }}
                      title="Edit"
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#d4c87a",
                        padding: "2px",
                        opacity: 0.7,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "0.7")
                      }
                    >
                      <PencilIcon />
                    </button>
                  </div>
                )}
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#d4c87a",
                    marginTop: "4px",
                  }}
                >
                  {brandsCount} confirmed
                </div>
              </div>

              {/* Brands confirmed */}
              <div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#d4c87a",
                    letterSpacing: "0.1em",
                    marginBottom: "6px",
                  }}
                >
                  BRANDS CONFIRMED
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "normal" }}>
                  {brandsCount}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#d4c87a",
                    marginTop: "4px",
                  }}
                >
                  of {spotsToFill} spots
                </div>
              </div>

              {/* Outstanding tasks */}
              <div>
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#d4c87a",
                    letterSpacing: "0.1em",
                    marginBottom: "6px",
                  }}
                >
                  OUTSTANDING TASKS
                </div>
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: "normal",
                    color: outstandingTasks > 0 ? "#e8c97a" : "#90c9a0",
                  }}
                >
                  {outstandingTasks}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#d4c87a",
                    marginTop: "4px",
                  }}
                >
                  tasks remaining
                </div>
              </div>

              {/* Countdown */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "10px",
                  padding: "1rem",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "2.5rem",
                    color: "#1B3A2D",
                    fontWeight: "normal",
                    lineHeight: 1,
                  }}
                >
                  {daysToEvent !== null ? daysToEvent : "—"}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#4a5a52",
                    marginTop: "6px",
                    letterSpacing: "0.05em",
                  }}
                >
                  DAYS TO EVENT
                </div>
                {datesLabel && (
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#E8C97A",
                      marginTop: "2px",
                    }}
                  >
                    {datesLabel}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Venue address */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1.25rem",
              border: "1px solid #e4ebe6",
              position: "relative" as const,
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#4a5a52",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              VENUE ADDRESS
            </div>
            {editingAddress ? (
              <div
                style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}
              >
                <input
                  type="text"
                  value={newAddress}
                  disabled={savingAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: "min(100%, 160px)",
                    padding: "6px 10px",
                    border: "1px solid #E8C97A",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                  }}
                  autoFocus
                />
                <button
                  onClick={saveAddress}
                  disabled={savingAddress}
                  style={{
                    padding: "6px 12px",
                    background: "#1B3A2D",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {savingAddress ? (
                    <Loader2Icon className="animate-spin size-5" />
                  ) : (
                    "Save"
                  )}
                </button>
                <button
                  onClick={() => {
                    editingAddressRef.current = false;
                    setNewAddress(venueAddress);
                    setEditingAddress(false);
                  }}
                  disabled={savingAddress}
                  style={{
                    padding: "6px 12px",
                    background: "transparent",
                    border: "1px solid #e4ebe6",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "0.95rem", color: "#1B3A2D" }}>
                  {venueAddress || "No address set yet"}
                </div>
                <button
                  onClick={() => {
                    editingAddressRef.current = true;
                    setNewAddress(venueAddress);
                    setEditingAddress(true);
                  }}
                  title="Edit address"
                  style={{
                    position: "absolute" as const,
                    top: "10px",
                    right: "10px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#E8C97A",
                  }}
                >
                  <PencilIcon />
                </button>
              </>
            )}
          </div>
        </div>
      </LoadingView>

      <BrandActivityOverview eventCity={event.city} eventSlug={event.slug} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Checklist event={event.city} />
        <MarketingDeadlines event={event.city} />
      </div>

      <AnnouncementManager event={event.city} />
    </div>
  );
}
