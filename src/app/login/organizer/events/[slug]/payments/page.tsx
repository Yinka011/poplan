"use client";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import PaymentTracker from "@/components/dashboard/PaymentTracker";
import { getEventBySlug } from "@/lib/events";

export default function PaymentsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const event = getEventBySlug(slug);
  if (!event) return null;
  return (
    <DashboardShell event={event}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        <PaymentTracker event={event.city} />
      </div>
    </DashboardShell>
  );
}
