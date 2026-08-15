"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type Shipment = {
  id: number;
  event_slug: string;
  notes: string;
  shipped: boolean;
  shipped_at?: string;
  courier?: string;
  tracking_number?: string;
  received?: boolean;
  brand_email?: string;
};

export default function ShipmentsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [brands, setBrands] = useState<{email: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchData(); }, [slug]);

  const fetchData = async () => {
    const [shipmentsRes, brandsRes] = await Promise.all([
      supabase.from("shipments").select("*").eq("event_slug", slug).order("created_at"),
      supabase.from("brands").select("email, name").eq("event", slug.charAt(0).toUpperCase() + slug.slice(1)),
    ]);
    if (shipmentsRes.data) setShipments(shipmentsRes.data);
    if (brandsRes.data) setBrands(brandsRes.data);
    setLoading(false);
  };

  const markReceived = async (id: number, received: boolean) => {
    await supabase.from("shipments").update({ received }).eq("id", id);
    setShipments(prev => prev.map(s => s.id === id ? { ...s, received } : s));
  };

  const filtered = filter === "all" ? shipments :
    filter === "shipped" ? shipments.filter(s => s.shipped && !s.received) :
    filter === "received" ? shipments.filter(s => s.received) :
    shipments.filter(s => !s.shipped);

  const getBrandName = (email: string) => brands.find(b => b.email === email)?.name || email;

  if (loading) return <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back to event</Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>Shipments — {slug.charAt(0).toUpperCase() + slug.slice(1)}</div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "TOTAL", value: shipments.length, color: "#1B3A2D" },
            { label: "PENDING", value: shipments.filter(s => !s.shipped).length, color: "#4a5a52" },
            { label: "SHIPPED", value: shipments.filter(s => s.shipped && !s.received).length, color: "#b87333" },
            { label: "RECEIVED", value: shipments.filter(s => s.received).length, color: "#4a7c59" },
          ].map(stat => (
            <div key={stat.label} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
              <div style={{ fontSize: "1.8rem", color: stat.color, fontWeight: "normal" }}>{stat.value}</div>
              <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.12em", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem" }}>
          {["all", "pending", "shipped", "received"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", background: filter === f ? "#1B3A2D" : "#fff", color: filter === f ? "#fff" : "#4a5a52", border: "1px solid " + (filter === f ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif", textTransform: "capitalize" as const }}>{f}</button>
          ))}
        </div>

        {/* Shipments list */}
        {filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No shipments</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Shipments will appear here when brands mark items as shipped.</div>
          </div>
        ) : (
          filtered.map(shipment => (
            <div key={shipment.id} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "8px", border: "1px solid #e4ebe6", borderLeft: `3px solid ${shipment.received ? "#4a7c59" : shipment.shipped ? "#E8C97A" : "#e4ebe6"}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "2px" }}>{shipment.notes}</div>
                  {shipment.brand_email && <div style={{ fontSize: "0.72rem", color: "#4a5a52", marginBottom: "2px" }}>Brand: {getBrandName(shipment.brand_email)}</div>}
                  {shipment.courier && <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>{shipment.courier} {shipment.tracking_number && `· ${shipment.tracking_number}`}</div>}
                  {shipment.shipped_at && <div style={{ fontSize: "0.68rem", color: "#8b7355", marginTop: "2px" }}>Shipped {new Date(shipment.shipped_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "20px", background: shipment.received ? "#4a7c5922" : shipment.shipped ? "#E8C97A22" : "#f0f4f1", color: shipment.received ? "#4a7c59" : shipment.shipped ? "#b87333" : "#4a5a52" }}>
                    {shipment.received ? "✓ Received" : shipment.shipped ? "Shipped" : "Pending"}
                  </span>
                  {shipment.shipped && !shipment.received && (
                    <button onClick={() => markReceived(shipment.id, true)} style={{ fontSize: "0.72rem", padding: "4px 10px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "Georgia, serif" }}>Mark received</button>
                  )}
                  {shipment.received && (
                    <button onClick={() => markReceived(shipment.id, false)} style={{ fontSize: "0.72rem", padding: "4px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", cursor: "pointer", color: "#4a5a52", fontFamily: "Georgia, serif" }}>Undo</button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
