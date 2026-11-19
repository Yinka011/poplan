"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatEventName } from "@/lib/events";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import GettingStarted from "@/components/dashboard/GettingStarted";
import LoadingView from "@/components/LoadingView";
import EventsSkeleton from "./EventsSkeleton";
import {
  invitePlannerBrand as sendPlannerInvite,
  removePlannerEvent,
} from "./plannerActions";

type Event = {
  id: number;
  slug: string;
  name: string;
  city: string;
  dates_label: string;
  status: string;
  start_date: string;
  end_date: string;
  organizer_email: string;
  archived?: boolean;
  year?: number;
  event_type?: string;
  brand_name?: string;
  brandsCount?: number;
  feesCollected?: number;
  outstandingBalance?: number;
};

type PlannerEvent = {
  id: number;
  event_slug: string;
  brand_email: string;
  brand_name: string;
  city?: string;
  dates_label?: string;
  start_date?: string;
  end_date?: string;
  event?: Event;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#4a7c5922", color: "#4a7c59" },
  Planning: { bg: "#E8C97A22", color: "#E8C97A" },
  Completed: { bg: "#4a5a5222", color: "#4a5a52" },
};

const formatDatesLabel = (label: string) => {
  if (!label) return "";
  if (label.includes(" to ")) {
    const [start, end] = label.split(" to ");
    const s = new Date(start);
    const e = new Date(end);
    const sDay = s.getDate() + 1;
    const eDay = e.getDate() + 1;
    const sMonth = s.toLocaleDateString("en-US", { month: "short" });
    const eMonth = e.toLocaleDateString("en-US", { month: "short" });
    const year = e.getFullYear();
    if (sMonth === eMonth) return `${sMonth} ${sDay}–${eDay}, ${year}`;
    return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
  }
  return label;
};

export default function EventsPage() {
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const requestId = useRef(0);
  const [adding, setAdding] = useState(false);
  const [yearFilter, setYearFilter] = useState<number>(2026);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitingOrganizer, setInvitingOrganizer] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [onboardingFeaturesPending, setOnboardingFeaturesPending] =
    useState<any>(null);
  const [inviting, setInviting] = useState<number | null>(null);
  const [addingType, setAddingType] = useState<"my_event" | "planner_event">(
    "my_event",
  );
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [newEvent, setNewEvent] = useState({
    name: "",
    city: "",
    dates_label: "",
    status: "Planning",
    start_date: "",
    end_date: "",
  });
  const [newPlannerEvent, setNewPlannerEvent] = useState({
    event_slug: "",
    brand_name: "",
    brand_email: "",
    city: "",
    start_date: "",
    end_date: "",
  });

  const fetchAll = useCallback(async () => {
    const currentRequest = ++requestId.current;
    let redirecting = false;
    setLoading(true);
    setLoadError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (!user) {
        if (authError && authError.name !== "AuthSessionMissingError")
          throw authError;
        if (currentRequest === requestId.current) {
          redirecting = true;
          window.location.href = "/login";
        }
        return;
      }
      if (authError) throw authError;
      if (!user.email)
        throw new Error("The signed-in user has no email address.");

      const [profileRes, eventsRes, plannerRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("name")
          .eq("email", user.email)
          .maybeSingle(),
        supabase
          .from("events")
          .select("*")
          .eq("organizer_email", user.email)
          .order("year", { ascending: false })
          .order("created_at"),
        supabase
          .from("event_planners")
          .select("*")
          .eq("planner_email", user.email),
      ]);
      const initialError =
        profileRes.error || eventsRes.error || plannerRes.error;
      if (initialError) throw initialError;

      const [enriched, enrichedPlanner] = await Promise.all([
        Promise.all(
          (eventsRes.data || []).map(async (event) => {
            const [brandsRes, feesRes] = await Promise.all([
              supabase
                .from("brands")
                .select("id")
                .eq("event", formatEventName(event.slug))
                .eq("organizer_email", user.email),
              supabase
                .from("brands")
                .select("amount_paid, balance")
                .eq("event", formatEventName(event.slug))
                .eq("organizer_email", user.email),
            ]);
            if (brandsRes.error || feesRes.error)
              throw brandsRes.error || feesRes.error;
            return {
              ...event,
              brandsCount: brandsRes.data?.length || 0,
              feesCollected:
                feesRes.data?.reduce((s, b) => s + Number(b.amount_paid), 0) ||
                0,
              outstandingBalance:
                feesRes.data?.reduce((s, b) => s + Number(b.balance), 0) || 0,
            };
          }),
        ),
        Promise.all(
          (plannerRes.data || []).map(async (pe) => {
            const { data, error } = await supabase
              .from("events")
              .select("*")
              .eq("slug", pe.event_slug)
              .maybeSingle();
            if (error) throw error;
            return { ...pe, event: data };
          }),
        ),
      ]);

      if (currentRequest !== requestId.current) return;
      setUserEmail(user.email);
      setUserName(profileRes.data?.name || "");
      setMyEvents(enriched);
      setPlannerEvents(enrichedPlanner);
    } catch (error) {
      console.error("Failed to load events:", error);
      if (currentRequest === requestId.current)
        setLoadError("Could not load events. Please try again.");
    } finally {
      if (!redirecting && currentRequest === requestId.current)
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
    return () => {
      requestId.current += 1;
    };
  }, [fetchAll]);

  const addEvent = async () => {
    if (!newEvent.name.trim() || !newEvent.city.trim()) return;
    const slug =
      newEvent.city.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    const { data } = await supabase
      .from("events")
      .insert({
        slug,
        name: newEvent.name,
        city: newEvent.city,
        dates_label: newEvent.dates_label || "TBD",
        status: newEvent.status,
        start_date: newEvent.start_date || null,
        end_date: newEvent.end_date || null,
        organizer_email: userEmail,
        mode: "multi_brand",
      })
      .select()
      .single();
    if (data) {
      setMyEvents((prev) => [
        ...prev,
        { ...data, brandsCount: 0, feesCollected: 0, outstandingBalance: 0 },
      ]);
      // Auto-create event_settings row so brand portal has a venue address to fill in
      await supabase
        .from("event_settings")
        .insert({
          event: slug,
          organizer_email: userEmail,
          spots_to_fill: 0,
          venue_address: "",
          budget: 0,
        })
        .select()
        .maybeSingle();
      // Apply organizer's default features (chosen during onboarding) to this event
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_features")
        .eq("email", userEmail)
        .maybeSingle();
      if (profile?.default_features) {
        const featPayload: any = {
          organizer_email: userEmail,
          event_slug: slug,
        };
        for (const [k, v] of Object.entries(
          profile.default_features as Record<string, unknown>,
        )) {
          featPayload[k] = v;
        }
        await supabase
          .from("organizer_features")
          .upsert(featPayload, { onConflict: "organizer_email,event_slug" });
      }
    }
    setNewEvent({
      name: "",
      city: "",
      dates_label: "",
      status: "Planning",
      start_date: "",
      end_date: "",
    });
    setAdding(false);
  };

  const addPlannerEvent = async () => {
    if (
      !newPlannerEvent.event_slug.trim() ||
      !newPlannerEvent.brand_name.trim()
    )
      return;
    const { data } = await supabase
      .from("event_planners")
      .insert({
        event_slug: newPlannerEvent.event_slug,
        planner_email: userEmail,
        brand_email: newPlannerEvent.brand_email,
        brand_name: newPlannerEvent.brand_name,
        city: newPlannerEvent.city,
        dates_label:
          newPlannerEvent.start_date && newPlannerEvent.end_date
            ? newPlannerEvent.start_date + " to " + newPlannerEvent.end_date
            : newPlannerEvent.start_date || "TBD",
        start_date: newPlannerEvent.start_date,
      })
      .select()
      .single();
    if (data) setPlannerEvents((prev) => [...prev, data]);
    setNewPlannerEvent({
      event_slug: "",
      brand_name: "",
      brand_email: "",
      city: "",
      start_date: "",
      end_date: "",
    });
    setAdding(false);
  };

  const deleteEvent = async (id: number) => {
    if (!confirm("Remove this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    setMyEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const invitePlannerBrand = async (email: string, id: number) => {
    if (!email.trim()) {
      alert("No email on file for this brand. Edit the card to add one.");
      return;
    }
    setInviting(id);
    try {
      await sendPlannerInvite(email);
      alert("Invite sent to " + email);
    } catch (error) {
      console.error("Could not send invitation:", error);
      alert("Could not send invite. Please try again.");
    } finally {
      setInviting(null);
    }
  };

  const deletePlannerEvent = async (id: number) => {
    if (!confirm("Remove this planning assignment?")) return;
    try {
      await removePlannerEvent(id, userEmail);
      setPlannerEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Could not remove planning assignment:", error);
      alert("Could not remove this planning assignment. Please try again.");
    }
  };

  const updateDates = async (event: Event, dates_label: string) => {
    await supabase.from("events").update({ dates_label }).eq("id", event.id);
    setMyEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, dates_label } : e)),
    );
  };

  const inviteOrganizer = async () => {
    if (!inviteEmail.trim()) return;
    setInvitingOrganizer(true);
    const res = await fetch("/api/invite-organizer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json();
    alert(
      data.success ? "Invite sent to " + inviteEmail : "Failed to send invite.",
    );
    setInviteEmail("");
    setInvitingOrganizer(false);
    setShowInvite(false);
  };

  const archiveEvent = async (id: number) => {
    if (
      !confirm(
        "Archive this event? It will be read-only and moved to your archive.",
      )
    )
      return;
    await supabase
      .from("events")
      .update({ archived: true, status: "Completed" })
      .eq("id", id);
    setMyEvents((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, archived: true, status: "Completed" } : e,
      ),
    );
  };

  const updateStatus = async (event: Event, status: string) => {
    await supabase.from("events").update({ status }).eq("id", event.id);
    setMyEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, status } : e)),
    );
  };

  const years = [...new Set(myEvents.map((e) => e.year || 2026))].sort(
    (a, b) => b - a,
  );
  const filteredEvents = myEvents.filter(
    (e) => !e.year || e.year === yearFilter,
  );

  return (
    <DashboardShell hideSideNav>
      <LoadingView
        loading={loading}
        error={loadError}
        onRetry={() => {
          void fetchAll();
        }}
        customLoader={<EventsSkeleton />}
        page
      >
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <div
            className="flex flex-col gap-4 lg:flex-row lg:justify-between"
            style={{
              alignItems: "flex-start",
              marginBottom: "2rem",
            }}
          >
            <div className="min-w-0">
              <h1
                style={{
                  fontSize: "1.8rem",
                  color: "#1B3A2D",
                  fontWeight: "normal",
                  margin: 0,
                }}
              >
                Welcome back{userName ? `, ${userName}` : ""}
              </h1>
              <p
                style={{
                  color: "#4a5a52",
                  fontSize: "0.9rem",
                  marginTop: "4px",
                }}
              >
                Manage all your pop-up events in one place.
              </p>
            </div>
            <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(Number(e.target.value))}
                style={{
                  padding: "7px 12px",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",

                  background: "#fff",
                  color: "#1B3A2D",
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setAdding(!adding);
                  setAddingType("my_event");
                }}
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
                + My event
              </button>
              <button
                onClick={() => setShowInvite(!showInvite)}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "#1B3A2D",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                + Invite organizer
              </button>
              <button
                onClick={() => {
                  setAdding(!adding);
                  setAddingType("planner_event");
                }}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "#1B3A2D",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                + Planning for a brand
              </button>
            </div>
          </div>

          {showInvite && (
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.25rem",
                border: "1px solid #e4ebe6",
                marginBottom: "1rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "0.82rem",
                  color: "#1B3A2D",
                  whiteSpace: "nowrap" as const,
                }}
              >
                Invite organizer:
              </div>
              <input
                type="email"
                placeholder="their@email.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && inviteOrganizer()}
                style={{
                  flex: 1,
                  minWidth: "min(100%, 180px)",
                  padding: "8px 12px",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",

                  outline: "none",
                }}
                autoFocus
              />
              <button
                onClick={inviteOrganizer}
                disabled={invitingOrganizer || !inviteEmail.trim()}
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
                {invitingOrganizer ? "Sending..." : "Send invite"}
              </button>
              <button
                onClick={() => setShowInvite(false)}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          )}

          {adding && addingType === "my_event" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                border: "1px solid #e4ebe6",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#1B3A2D",
                  marginBottom: "1rem",
                }}
              >
                New event I am organizing
              </div>
              <div
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 [&>input]:min-w-0 [&>input]:w-full [&>select]:min-w-0 [&>select]:w-full"
                style={{
                  marginBottom: "10px",
                }}
              >
                <input
                  placeholder="Event name e.g. Atlanta Pop-up"
                  value={newEvent.name}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, name: e.target.value })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  placeholder="City e.g. Atlanta"
                  value={newEvent.city}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, city: e.target.value })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  placeholder="Dates e.g. Sep 11-13, 2026"
                  value={newEvent.dates_label}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, dates_label: e.target.value })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <select
                  value={newEvent.status}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, status: e.target.value })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                >
                  <option>Planning</option>
                  <option>Active</option>
                  <option>Completed</option>
                </select>
                <input
                  type="date"
                  value={newEvent.start_date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, start_date: e.target.value })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  type="date"
                  value={newEvent.end_date}
                  onChange={(e) =>
                    setNewEvent({ ...newEvent, end_date: e.target.value })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={addEvent}
                  style={{
                    padding: "7px 16px",
                    background: "#1B3A2D",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setAdding(false)}
                  style={{
                    padding: "7px 16px",
                    background: "transparent",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {adding && addingType === "planner_event" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                border: "1px solid #e4ebe6",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#1B3A2D",
                  marginBottom: "0.5rem",
                }}
              >
                Event I am planning for a brand
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#4a5a52",
                  marginBottom: "1rem",
                }}
              >
                Enter the event details and the brand you are planning for.
              </div>
              <div
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 [&>input]:min-w-0 [&>input]:w-full"
                style={{
                  marginBottom: "10px",
                }}
              >
                <input
                  placeholder="Brand name e.g. Wanni Fuga"
                  value={newPlannerEvent.brand_name}
                  onChange={(e) =>
                    setNewPlannerEvent({
                      ...newPlannerEvent,
                      brand_name: e.target.value,
                      event_slug:
                        e.target.value.toLowerCase().replace(/\s+/g, "-") +
                        "-" +
                        Date.now(),
                    })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  placeholder="City e.g. Houston"
                  value={newPlannerEvent.city}
                  onChange={(e) =>
                    setNewPlannerEvent({
                      ...newPlannerEvent,
                      city: e.target.value,
                    })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  placeholder="Brand email (optional)"
                  value={newPlannerEvent.brand_email}
                  onChange={(e) =>
                    setNewPlannerEvent({
                      ...newPlannerEvent,
                      brand_email: e.target.value,
                    })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  type="date"
                  value={newPlannerEvent.start_date}
                  onChange={(e) =>
                    setNewPlannerEvent({
                      ...newPlannerEvent,
                      start_date: e.target.value,
                    })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  type="date"
                  value={newPlannerEvent.end_date}
                  onChange={(e) =>
                    setNewPlannerEvent({
                      ...newPlannerEvent,
                      end_date: e.target.value,
                    })
                  }
                  style={{
                    padding: "8px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={addPlannerEvent}
                  style={{
                    padding: "7px 16px",
                    background: "#1B3A2D",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setAdding(false)}
                  style={{
                    padding: "7px 16px",
                    background: "transparent",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Getting Started checklist — auto-hides once dismissed */}
          <GettingStarted
            myEventsCount={myEvents.length}
            onDismiss={() => {}}
          />

          {/* My Events */}
          <div style={{ marginBottom: "2.5rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#4a5a52",
                letterSpacing: "0.1em",
                marginBottom: "1rem",
              }}
            >
              MY EVENTS
            </div>
            {myEvents.length === 0 ? (
              <div
                style={{
                  background: "#1B3A2D",
                  borderRadius: "16px",
                  padding: "2rem",
                  border: "none",
                  position: "relative" as const,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#E8C97A",
                    letterSpacing: "0.15em",
                    marginBottom: "0.75rem",
                  }}
                >
                  GETTING STARTED
                </div>
                <h2
                  style={{
                    fontSize: "1.4rem",
                    color: "#fff",
                    fontWeight: "normal",
                    marginBottom: "0.5rem",
                    margin: 0,
                  }}
                >
                  Create your first event
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#ffffff88",
                    margin: "0.5rem 0 1.75rem",
                    lineHeight: 1.7,
                  }}
                >
                  Everything starts with an event. Once you create one, you can
                  add brands, set up their portal, track payments and plan every
                  detail.
                </p>
                <div
                  className="grid grid-cols-1 gap-4 sm:grid-cols-3"
                  style={{
                    marginBottom: "2rem",
                  }}
                >
                  {[
                    {
                      step: "1",
                      title: "Create an event",
                      desc: "Add your event name, city and dates to get your dashboard.",
                    },
                    {
                      step: "2",
                      title: "Add your brands",
                      desc: "Invite brands and send them a link to their portal.",
                    },
                    {
                      step: "3",
                      title: "Customise settings",
                      desc: "Enable only the features you need and add your FAQs.",
                    },
                  ].map((s) => (
                    <div
                      key={s.step}
                      style={{
                        background: "#ffffff11",
                        borderRadius: "12px",
                        padding: "1.25rem",
                        border: "1px solid #ffffff22",
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: "#E8C97A",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.8rem",
                          color: "#1B3A2D",
                          fontWeight: "bold",
                          marginBottom: "0.75rem",
                        }}
                      >
                        {s.step}
                      </div>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          color: "#fff",
                          marginBottom: "4px",
                        }}
                      >
                        {s.title}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "#ffffff66",
                          lineHeight: 1.5,
                        }}
                      >
                        {s.desc}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setAdding(true)}
                  style={{
                    padding: "12px 28px",
                    background: "#E8C97A",
                    color: "#1B3A2D",
                    border: "none",
                    borderRadius: "10px",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  + Create your first event
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
                  gap: "1rem",
                }}
              >
                {filteredEvents.slice(0, 3).map((event) => {
                  const statusStyle =
                    STATUS_COLORS[event.status] || STATUS_COLORS.Planning;
                  return (
                    <div
                      key={event.id}
                      style={{
                        background: "#fff",
                        borderRadius: "16px",
                        padding: "1.5rem",
                        border: "1px solid #e4ebe6",
                        position: "relative" as const,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "4px",
                        }}
                      >
                        <Link
                          href={`/organizer/events/${event.slug}`}
                          style={{ textDecoration: "none", minWidth: 0 }}
                        >
                          <div
                            style={{ fontSize: "1.15rem", color: "#1B3A2D" }}
                          >
                            {event.name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#4a5a52",
                              marginTop: "2px",
                            }}
                          >
                            {event.city}
                          </div>
                        </Link>
                      </div>
                      <input
                        value={event.dates_label}
                        onChange={(e) =>
                          setMyEvents((prev) =>
                            prev.map((ev) =>
                              ev.id === event.id
                                ? { ...ev, dates_label: e.target.value }
                                : ev,
                            ),
                          )
                        }
                        onBlur={(e) => updateDates(event, e.target.value)}
                        style={{
                          fontSize: "0.85rem",
                          color: "#E8C97A",
                          border: "none",
                          background: "transparent",

                          padding: "4px 0",
                          marginBottom: "1rem",
                          outline: "none",
                          width: "100%",
                        }}
                        placeholder="Add dates..."
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(70px, 100%), 1fr))",
                          gap: "8px",
                          borderTop: "1px solid #f0f4f1",
                          paddingTop: "1rem",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "#4a5a52",
                              letterSpacing: "0.08em",
                              marginBottom: "2px",
                            }}
                          >
                            BRANDS
                          </div>
                          <div style={{ fontSize: "1.2rem", color: "#1B3A2D" }}>
                            {event.brandsCount}
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "#4a5a52",
                              letterSpacing: "0.08em",
                              marginBottom: "2px",
                            }}
                          >
                            COLLECTED
                          </div>
                          <div style={{ fontSize: "1.2rem", color: "#4a7c59" }}>
                            {formatCurrency(Number(event.feesCollected))}
                          </div>
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "#4a5a52",
                              letterSpacing: "0.08em",
                              marginBottom: "2px",
                            }}
                          >
                            OUTSTANDING
                          </div>
                          <div style={{ fontSize: "1.2rem", color: "#c0392b" }}>
                            {formatCurrency(Number(event.outstandingBalance))}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "1rem",
                        }}
                      >
                        <Link
                          href={`/organizer/events/${event.slug}`}
                          style={{
                            fontSize: "0.78rem",
                            color: "#4a5a52",
                            textDecoration: "none",
                          }}
                        >
                          View dashboard →
                        </Link>
                        {/* {!event.archived && (
                          <button
                            onClick={() => archiveEvent(event.id)}
                            style={{
                              fontSize: "0.72rem",
                              padding: "3px 10px",
                              background: "transparent",
                              border: "1px solid #e4ebe6",
                              borderRadius: "6px",
                              cursor: "pointer",
                              color: "#4a5a52",
                            }}
                          >
                            Archive
                          </button>
                        )} */}
                        {event.archived && (
                          <span
                            style={{ fontSize: "0.72rem", color: "#4a5a52" }}
                          >
                            📦 Archived
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {filteredEvents.length > 3 && (
              <Link
                href="/organizer/my-events"
                style={{
                  display: "inline-block",
                  marginTop: "1rem",
                  color: "#1B3A2D",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  background: "#fff",
                }}
              >
                See all my events →
              </Link>
            )}
          </div>

          {/* Events I am Planning for Others */}
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "#4a5a52",
                letterSpacing: "0.1em",
                marginBottom: "1rem",
              }}
            >
              EVENTS I AM PLANNING FOR OTHERS
            </div>
            {plannerEvents.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "2rem",
                  textAlign: "center",
                  border: "1px solid #e4ebe6",
                }}
              >
                <p style={{ color: "#4a5a52", fontSize: "0.85rem" }}>
                  No planning assignments yet. Click + Planning for a brand to
                  add one.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(min(300px, 100%), 1fr))",
                  gap: "1rem",
                }}
              >
                {plannerEvents.slice(0, 3).map((pe) => (
                  <div
                    key={pe.id}
                    style={{
                      background: "#fff",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      border: "1px solid #e4ebe6",
                      borderLeft: "3px solid #E8C97A",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.65rem",
                            color: "#E8C97A",
                            letterSpacing: "0.08em",
                            marginBottom: "4px",
                          }}
                        >
                          PLANNING FOR
                        </div>
                        <div style={{ fontSize: "1.1rem", color: "#1B3A2D" }}>
                          {pe.brand_name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "#4a5a52",
                            marginTop: "2px",
                          }}
                        >
                          {pe.city || pe.event_slug}
                        </div>
                        {pe.dates_label && (
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "#E8C97A",
                              marginTop: "2px",
                            }}
                          >
                            {formatDatesLabel(pe.dates_label)}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => deletePlannerEvent(pe.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#d4c5b0",
                          fontSize: "12px",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#c0392b")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#d4c5b0")
                        }
                      >
                        ✕
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap" as const,
                      }}
                    >
                      <Link
                        href={`/organizer/planner/${pe.event_slug}`}
                        style={{
                          fontSize: "0.78rem",
                          color: "#E8C97A",
                          textDecoration: "none",
                        }}
                      >
                        View dashboard →
                      </Link>
                      {pe.brand_email && (
                        <button
                          onClick={() =>
                            invitePlannerBrand(pe.brand_email, pe.id)
                          }
                          disabled={inviting === pe.id}
                          style={{
                            fontSize: "0.72rem",
                            padding: "3px 10px",
                            background: "transparent",
                            border: "1px solid #E8C97A",
                            borderRadius: "6px",
                            cursor: "pointer",
                            color: "#E8C97A",
                          }}
                        >
                          {inviting === pe.id ? "Sending..." : "✉ Invite brand"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {plannerEvents.length > 3 && (
              <Link
                href="/organizer/planning-events"
                style={{
                  display: "inline-block",
                  marginTop: "1rem",
                  color: "#1B3A2D",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  background: "#fff",
                }}
              >
                See all planning events →
              </Link>
            )}
          </div>
        </div>
      </LoadingView>
    </DashboardShell>
  );
}
