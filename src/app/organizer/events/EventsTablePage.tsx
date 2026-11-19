"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import LoadingView from "@/components/LoadingView";
import { supabase } from "@/lib/supabase";
import { invitePlannerBrand, removePlannerEvent } from "./plannerActions";

type MyEvent = {
  id: number;
  slug: string;
  name: string;
  city: string;
  dates_label: string | null;
  status: string;
  year: number | null;
  archived: boolean | null;
};

type PlannerEvent = {
  id: number;
  event_slug: string;
  brand_name: string;
  brand_email: string | null;
  city: string | null;
  dates_label: string | null;
};

const buttonClass = "rounded-md border border-[#e4ebe6] px-3 py-1.5 text-sm text-[#1B3A2D] disabled:opacity-50";
const cellClass = "px-4 py-3 align-middle";

function TableSkeleton() {
  return (
    <div role="status" aria-label="Loading events" className="w-full animate-pulse space-y-5">
      <div aria-hidden="true" className="h-8 w-48 rounded bg-[#e4ebe6]" />
      <div aria-hidden="true" className="space-y-4 rounded-xl border border-[#e4ebe6] bg-white p-5">
        {[0, 1, 2, 3].map(index => <div key={index} className="h-10 w-full rounded bg-[#e4ebe6]" />)}
      </div>
    </div>
  );
}

export default function EventsTablePage({ kind }: { kind: "mine" | "planning" }) {
  const [events, setEvents] = useState<MyEvent[]>([]);
  const [plannerEvents, setPlannerEvents] = useState<PlannerEvent[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dates, setDates] = useState("");
  const requestId = useRef(0);
  const actionRef = useRef(false);
  const isMine = kind === "mine";

  const load = useCallback(async () => {
    const request = ++requestId.current;
    let redirecting = false;
    setLoading(true);
    setError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user) {
        if (authError && authError.name !== "AuthSessionMissingError") throw authError;
        if (request === requestId.current) {
          redirecting = true;
          window.location.href = "/login";
        }
        return;
      }
      if (authError) throw authError;
      if (!user.email) throw new Error("The signed-in user has no email address.");
      if (isMine) {
        const { data, error: queryError } = await supabase.from("events")
          .select("id, slug, name, city, dates_label, status, year, archived")
          .eq("organizer_email", user.email).order("year", { ascending: false }).order("created_at");
        if (queryError) throw queryError;
        if (request === requestId.current) setEvents(data ?? []);
      } else {
        const { data, error: queryError } = await supabase.from("event_planners")
          .select("id, event_slug, brand_name, brand_email, city, dates_label")
          .eq("planner_email", user.email);
        if (queryError) throw queryError;
        if (request === requestId.current) setPlannerEvents(data ?? []);
      }
      if (request === requestId.current) setEmail(user.email);
    } catch (loadError) {
      console.error("Could not load events:", loadError);
      if (request === requestId.current) setError("Could not load events. Please try again.");
    } finally {
      if (!redirecting && request === requestId.current) setLoading(false);
    }
  }, [isMine]);

  useEffect(() => {
    void load();
    return () => { requestId.current += 1; };
  }, [load]);

  const runAction = async (key: string, message: string, callback: () => Promise<void>) => {
    if (actionRef.current) return;
    actionRef.current = true;
    setAction(key);
    try {
      await callback();
    } catch (actionError) {
      console.error(message, actionError);
      alert(message);
    } finally {
      actionRef.current = false;
      setAction(null);
    }
  };

  const saveDates = async (event: MyEvent) => {
    await runAction(`dates-${event.id}`, "Could not save event dates. Please try again.", async () => {
      const { error: saveError } = await supabase.from("events").update({ dates_label: dates })
        .eq("id", event.id).eq("organizer_email", email).select("id").single();
      if (saveError) throw saveError;
      setEvents(previous => previous.map(item => item.id === event.id ? { ...item, dates_label: dates } : item));
      setEditingId(null);
    });
  };

  const invite = async (event: PlannerEvent) => {
    const brandEmail = event.brand_email;
    if (!brandEmail) return;
    await runAction(`invite-${event.id}`, "Could not send invite. Please try again.", async () => {
      await invitePlannerBrand(brandEmail);
      alert(`Invite sent to ${brandEmail}`);
    });
  };

  const remove = async (event: PlannerEvent) => {
    if (actionRef.current || !confirm("Remove this planning assignment?")) return;
    await runAction(`remove-${event.id}`, "Could not remove this planning assignment. Please try again.", async () => {
      await removePlannerEvent(event.id, email);
      setPlannerEvents(previous => previous.filter(item => item.id !== event.id));
    });
  };

  return (
    <DashboardShell hideSideNav>
      <Link href="/organizer/events" className="mb-4 inline-block text-sm text-[#4a5a52]">← Back to events</Link>
      <h1 className="mb-5 text-2xl font-normal text-[#1B3A2D]">{isMine ? "My events" : "Events I am planning"}</h1>
      <LoadingView loading={loading} error={error} onRetry={() => { void load(); }} customLoader={<TableSkeleton />}>
        {action && <div role="status" className="mb-3 text-sm text-[#4a5a52]">{action.startsWith("invite-") ? "Sending invitation..." : "Saving changes..."}</div>}
        <div className="overflow-x-auto rounded-xl border border-[#e4ebe6] bg-white">
          <table className="w-full min-w-[700px] text-left text-sm text-[#1B3A2D]">
            <thead className="border-b border-[#e4ebe6] bg-[#f8faf8] text-xs uppercase text-[#4a5a52]">
              <tr>
                <th scope="col" className={cellClass}>{isMine ? "Event" : "Brand"}</th>
                <th scope="col" className={cellClass}>City</th>
                <th scope="col" className={cellClass}>Dates</th>
                <th scope="col" className={cellClass}>{isMine ? "Status" : "Brand email"}</th>
                <th scope="col" className={cellClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isMine ? events.map(event => (
                <tr key={event.id} className="border-b border-[#f0f4f1] last:border-0">
                  <td className={cellClass}><Link className="font-medium underline" href={`/organizer/events/${event.slug}`}>{event.name}</Link>{event.year && <div className="text-xs text-[#4a5a52]">{event.year}</div>}</td>
                  <td className={cellClass}>{event.city}</td>
                  <td className={cellClass}>
                    {editingId === event.id ? (
                      <div className="flex items-center gap-2">
                        <input aria-label={`Dates for ${event.name}`} value={dates} onChange={e => setDates(e.target.value)} disabled={action !== null} className="w-36 rounded border border-[#e4ebe6] p-1.5" />
                        <button className={buttonClass} disabled={action !== null} onClick={() => saveDates(event)}>{action === `dates-${event.id}` ? "Saving..." : "Save"}</button>
                        <button className={buttonClass} disabled={action !== null} onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{event.dates_label || "TBD"}</span>
                        <button className={buttonClass} disabled={action !== null} onClick={() => { setEditingId(event.id); setDates(event.dates_label || ""); }} aria-label={`Edit dates for ${event.name}`}>Edit</button>
                      </div>
                    )}
                  </td>
                  <td className={cellClass}>{event.status}{event.archived ? " · Archived" : ""}</td>
                  <td className={cellClass}><Link className="text-[#4a5a52] underline" href={`/organizer/events/${event.slug}`}>View dashboard →</Link></td>
                </tr>
              )) : plannerEvents.map(event => (
                <tr key={event.id} className="border-b border-[#f0f4f1] last:border-0">
                  <td className={cellClass}><Link className="font-medium underline" href={`/organizer/planner/${event.event_slug}`}>{event.brand_name}</Link></td>
                  <td className={cellClass}>{event.city || event.event_slug}</td>
                  <td className={cellClass}>{event.dates_label || "TBD"}</td>
                  <td className={cellClass}>{event.brand_email || "—"}</td>
                  <td className={cellClass}>
                    <div className="flex flex-wrap gap-2">
                      <Link className="self-center text-[#4a5a52] underline" href={`/organizer/planner/${event.event_slug}`}>View dashboard →</Link>
                      {event.brand_email && <button className={buttonClass} disabled={action !== null} onClick={() => invite(event)}>{action === `invite-${event.id}` ? "Sending..." : "Invite brand"}</button>}
                      <button className={buttonClass} disabled={action !== null} onClick={() => remove(event)} aria-label={`Remove planning assignment for ${event.brand_name}`}>{action === `remove-${event.id}` ? "Removing..." : "Remove"}</button>
                    </div>
                  </td>
                </tr>
              ))}
              {(isMine ? events.length === 0 : plannerEvents.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#4a5a52]">{isMine ? "No events yet." : "No planning assignments yet."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </LoadingView>
    </DashboardShell>
  );
}
