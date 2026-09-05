"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type BrandActivity = {
  id: number;
  name: string;
  email: string;
  fee_owed: number;
  amount_paid: number;
  status: string;
  shipped: boolean;
  inventoryCount: number;
  inventoryApproved: number;
  tasksTotal: number;
  tasksCompleted: number;
};

export default function BrandActivityOverview({ eventCity, eventSlug }: { eventCity: string; eventSlug: string }) {
  const [brands, setBrands] = useState<BrandActivity[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [brandsRes, productsRes, tasksRes] = await Promise.all([
        supabase.from("brands").select("*").eq("event", eventCity),
        supabase.from("brand_products").select("brand_email, review_status").eq("event", eventCity),
        supabase.from("brand_tasks").select("brand_email, completed").eq("event", eventCity),
      ]);

      if (brandsRes.data) {
        const enriched = brandsRes.data.map(b => ({
          ...b,
          inventoryCount: productsRes.data?.filter(p => p.brand_email === b.email).length || 0,
          inventoryApproved: productsRes.data?.filter(p => p.brand_email === b.email && p.review_status === "approved").length || 0,
          tasksTotal: tasksRes.data?.filter(t => t.brand_email === b.email).length || 0,
          tasksCompleted: tasksRes.data?.filter(t => t.brand_email === b.email && t.completed).length || 0,
        }));
        setBrands(enriched);
      }
    };
    fetch();
  }, [eventCity]);

  if (brands.length === 0) return null;

  return (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.1em" }}>BRAND ACTIVITY</div>
        <Link href={`/login/organizer/events/${eventSlug}/payments`} style={{ fontSize: "0.75rem", color: "#E8C97A", textDecoration: "none" }}>View payments →</Link>
      </div>
      <div style={{ overflowX: "auto" as const }}>
        <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e4ebe6" }}>
              <th style={{ textAlign: "left" as const, padding: "6px 8px", fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.08em", fontWeight: "normal" }}>BRAND</th>
              <th style={{ textAlign: "center" as const, padding: "6px 8px", fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.08em", fontWeight: "normal" }}>PAYMENT</th>
              <th style={{ textAlign: "center" as const, padding: "6px 8px", fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.08em", fontWeight: "normal" }}>SHIPPED</th>
              <th style={{ textAlign: "center" as const, padding: "6px 8px", fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.08em", fontWeight: "normal" }}>INVENTORY</th>
              <th style={{ textAlign: "center" as const, padding: "6px 8px", fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.08em", fontWeight: "normal" }}>TASKS</th>
            </tr>
          </thead>
          <tbody>
            {brands.map(brand => (
              <tr key={brand.id} style={{ borderBottom: "1px solid #f5f2ee" }}>
                <td style={{ padding: "8px 8px" }}><Link href={`/login/organizer/events/${eventSlug}/brands/${encodeURIComponent(brand.name)}`} style={{ color: "#1B3A2D", textDecoration: "none", fontSize: "0.85rem" }}>{brand.name}</Link></td>
                <td style={{ padding: "8px 8px", textAlign: "center" as const }}>
                  <span style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: "10px", background: brand.status === "Paid" ? "#4a7c5922" : brand.status === "Partial" ? "#E8C97A22" : "#f0f4f1", color: brand.status === "Paid" ? "#4a7c59" : brand.status === "Partial" ? "#b87333" : "#4a5a52" }}>{brand.status || "Unpaid"}</span>
                </td>
                <td style={{ padding: "8px 8px", textAlign: "center" as const }}>
                  {brand.shipped ? <span style={{ color: "#4a7c59", fontSize: "0.85rem" }}>✓</span> : <span style={{ color: "#d4c5b0", fontSize: "0.85rem" }}>—</span>}
                </td>
                <td style={{ padding: "8px 8px", textAlign: "center" as const }}>
                  {brand.inventoryCount === 0 ? (
                    <span style={{ color: "#d4c5b0", fontSize: "0.75rem" }}>None</span>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: brand.inventoryApproved === brand.inventoryCount ? "#4a7c59" : "#b87333" }}>{brand.inventoryApproved}/{brand.inventoryCount} approved</span>
                  )}
                </td>
                <td style={{ padding: "8px 8px", textAlign: "center" as const }}>
                  {brand.tasksTotal === 0 ? (
                    <span style={{ color: "#d4c5b0", fontSize: "0.75rem" }}>—</span>
                  ) : (
                    <span style={{ fontSize: "0.75rem", color: brand.tasksCompleted === brand.tasksTotal ? "#4a7c59" : "#b87333" }}>{brand.tasksCompleted}/{brand.tasksTotal}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
