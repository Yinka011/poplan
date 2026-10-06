"use client";
import { useOrganizer } from "@/context/OrganizerContext";
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
  const [adding, setAdding] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const { organizerEmail } = useOrganizer();
  const [brands, setBrands] = useState<BrandActivity[]>([]);

  useEffect(() => {
  }, []);

  useEffect(() => {
    const fetch = async () => {
      const [brandsRes, productsRes, tasksRes] = await Promise.all([
        supabase.from("brands").select("*").eq("event", eventCity).eq("organizer_email", organizerEmail),
        supabase.from("brand_products").select("brand_email, review_status").eq("event", eventCity).eq("organizer_email", organizerEmail),
        supabase.from("brand_tasks").select("brand_email, completed").eq("event", eventCity).eq("organizer_email", organizerEmail),
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

  const addBrand = async () => {
    if (!newBrand.name.trim() || !newBrand.email.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const orgEmail = user?.email || "";
    const { data } = await supabase.from("brands").insert({
      organizer_email: orgEmail,
      event: eventCity,
      name: newBrand.name.trim(),
      email: newBrand.email.trim(),
      fee_owed: 0,
      amount_paid: 0,
      balance: 0,
      status: "Unpaid",
    }).select().single();
    if (data) setBrands((prev: any[]) => [...prev, data]);
    setNewBrand({ name: "", email: "" });
    setAdding(false);
    setSaving(false);
  };

  return (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.1em" }}>BRAND ACTIVITY</div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link href={`/login/organizer/events/${eventSlug}/payments`} style={{ fontSize: "0.75rem", color: "#E8C97A", textDecoration: "none" }}>View payments →</Link>
          <button onClick={() => setAdding(!adding)} style={{ fontSize: "0.75rem", color: "#E8C97A", background: "transparent", border: "1px solid #E8C97A44", borderRadius: "6px", padding: "3px 10px", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add brand</button>
        </div>
      </div>
      {adding && (
        <div style={{ padding: "12px 0", borderBottom: "1px solid #e4ebe6", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" as const, marginBottom: "8px" }}>
          <input placeholder="Brand name" value={newBrand.name} onChange={e => setNewBrand({...newBrand, name: e.target.value})} style={{ flex: 1, minWidth: "140px", padding: "6px 10px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif", outline: "none" }} />
          <input placeholder="Brand email" value={newBrand.email} onChange={e => setNewBrand({...newBrand, email: e.target.value})} style={{ flex: 1, minWidth: "180px", padding: "6px 10px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif", outline: "none" }} />
          <button onClick={addBrand} disabled={saving || !newBrand.name.trim() || !newBrand.email.trim()} style={{ padding: "6px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>{saving ? "..." : "Add"}</button>
          <button onClick={() => setAdding(false)} style={{ padding: "6px 10px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>✕</button>
        </div>
      )}
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
