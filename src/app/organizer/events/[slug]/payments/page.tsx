"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import PaymentTracker from "@/components/dashboard/PaymentTracker";
import LoadingView from "@/components/LoadingView";
import { supabase } from "@/lib/supabase";

type EventInfo = {
  name: string;
  slug: string;
  city: string;
};

type EventResult =
  | { slug: string; event: EventInfo; error: "" }
  | { slug: string; event: null; error: string };

export default function PaymentsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [result, setResult] = useState<EventResult | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setResult(null);

    const fetchEvent = async () => {
      try {
        const { data, error } = await supabase
          .from("events")
          .select("name, slug, city")
          .eq("slug", slug)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        if (!data) {
          setResult({ slug, event: null, error: "Event not found." });
          return;
        }
        if (
          typeof data.name !== "string" ||
          typeof data.slug !== "string" ||
          typeof data.city !== "string" ||
          !data.name ||
          !data.slug ||
          !data.city
        ) {
          throw new Error("Event is missing a name, slug, or city.");
        }
        setResult({
          slug,
          event: { name: data.name, slug: data.slug, city: data.city },
          error: "",
        });
      } catch (error) {
        console.error("Failed to load event for payments:", error);
        if (active)
          setResult({
            slug,
            event: null,
            error: "Could not load the event. Please try again.",
          });
      }
    };

    void fetchEvent();
    return () => {
      active = false;
    };
  }, [slug, retry]);

  const current = result?.slug === slug ? result : null;
  return (
    <DashboardShell event={current?.event ?? undefined}>
      <LoadingView
        loading={!current}
        error={current?.error}
        onRetry={() => setRetry((value) => value + 1)}
        page
      >
        {current?.event && (
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <PaymentTracker event={current.event.city} />
          </div>
        )}
      </LoadingView>
    </DashboardShell>
  );
}
