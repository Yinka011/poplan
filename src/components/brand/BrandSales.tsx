"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Sale = {
  id: number;
  product_name: string;
  variation_name: string;
  quantity_sold: number;
  unit_price: number;
  total_revenue: number;
  sale_date: string;
};

type Payout = {
  total_revenue: number;
  commission_rate: number;
  commission_amount: number;
  payout_amount: number;
  payout_status: string;
  payout_date?: string;
};

type Props = {
  event: string;
  brandEmail: string;
};

export default function BrandSales({ event, brandEmail }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState("all");

  useEffect(() => {
    fetchSales();
  }, [event, brandEmail]);

  const fetchSales = async () => {
    const [salesRes, payoutRes] = await Promise.all([
      supabase.from("brand_sales").select("*").eq("event", event).eq("brand_email", brandEmail).order("sale_date"),
      supabase.from("event_payouts").select("*").eq("event", event).eq("brand_email", brandEmail).maybeSingle(),
    ]);
    if (salesRes.data) setSales(salesRes.data);
    if (payoutRes.data) setPayout(payoutRes.data);
    setLoading(false);
  };

  const days = [...new Set(sales.map(s => s.sale_date))].sort();
  const filteredSales = activeDay === "all" ? sales : sales.filter(s => s.sale_date === activeDay);

  const dayTotal = filteredSales.reduce((s, sale) => s + Number(sale.total_revenue), 0);
  const dayUnits = filteredSales.reduce((s, sale) => s + sale.quantity_sold, 0);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const formatCurrency = (n: number) => `$${Number(n).toFixed(2)}`;

  if (loading) return <div style={{ fontSize: "0.85rem", color: "#8b7355", padding: "1rem" }}>Loading sales data...</div>;

  if (sales.length === 0) return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
      <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>No sales yet</div>
      <div style={{ fontSize: "0.82rem", color: "#8b7355" }}>Your sales will appear here after the event begins.</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "Georgia, serif" }}>

      {/* Payout summary */}
      {payout && (
        <div style={{ background: "#2c1810", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ fontSize: "0.65rem", color: "#c8b89a", letterSpacing: "0.15em", marginBottom: "1rem" }}>YOUR SALES SUMMARY</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#c8b89a", marginBottom: "6px" }}>TOTAL REVENUE</div>
              <div style={{ fontSize: "1.6rem" }}>{formatCurrency(payout.total_revenue)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#c8b89a", marginBottom: "6px" }}>COMMISSION ({payout.commission_rate}%)</div>
              <div style={{ fontSize: "1.6rem", color: "#e8c97a" }}>{formatCurrency(payout.commission_amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#c8b89a", marginBottom: "6px" }}>YOUR PAYOUT</div>
              <div style={{ fontSize: "1.6rem", color: "#90c9a0" }}>{formatCurrency(payout.payout_amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#c8b89a", marginBottom: "6px" }}>STATUS</div>
              <div style={{ fontSize: "0.9rem", marginTop: "8px" }}>
                <span style={{ padding: "4px 12px", borderRadius: "20px", background: payout.payout_status === "paid" ? "#90c9a022" : "#e8c97a22", color: payout.payout_status === "paid" ? "#90c9a0" : "#e8c97a", fontSize: "0.78rem" }}>
                  {payout.payout_status === "paid" ? "✓ Paid" : "Pending"}
                </span>
                {payout.payout_date && <div style={{ fontSize: "0.7rem", color: "#c8b89a", marginTop: "4px" }}>Expected {payout.payout_date}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
        <button onClick={() => setActiveDay("all")} style={{ padding: "5px 14px", background: activeDay === "all" ? "#2c1810" : "#fff", color: activeDay === "all" ? "#fff" : "#8b7355", border: "1px solid " + (activeDay === "all" ? "#2c1810" : "#e8e0d5"), borderRadius: "20px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>All days</button>
        {days.map(day => (
          <button key={day} onClick={() => setActiveDay(day)} style={{ padding: "5px 14px", background: activeDay === day ? "#2c1810" : "#fff", color: activeDay === day ? "#fff" : "#8b7355", border: "1px solid " + (activeDay === day ? "#2c1810" : "#e8e0d5"), borderRadius: "20px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>{formatDate(day)}</button>
        ))}
      </div>

      {/* Day summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.12em", marginBottom: "8px" }}>UNITS SOLD</div>
          <div style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal" }}>{dayUnits}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.12em", marginBottom: "8px" }}>REVENUE</div>
          <div style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal" }}>{formatCurrency(dayTotal)}</div>
        </div>
      </div>

      {/* Sales table */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e8e0d5", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 16px", background: "#faf8f5", fontSize: "0.68rem", color: "#8b7355", letterSpacing: "0.08em" }}>
          <div>PRODUCT</div><div>VARIATION</div><div>QTY</div><div>REVENUE</div>
        </div>
        {filteredSales.map(sale => (
          <div key={sale.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 16px", borderTop: "1px solid #f0ebe4", alignItems: "center" }}>
            <div style={{ fontSize: "0.88rem", color: "#2c1810" }}>{sale.product_name}</div>
            <div style={{ fontSize: "0.82rem", color: "#8b7355" }}>{sale.variation_name || "—"}</div>
            <div style={{ fontSize: "0.88rem", color: "#2c1810" }}>{sale.quantity_sold}</div>
            <div style={{ fontSize: "0.88rem", color: "#4a7c59" }}>{formatCurrency(Number(sale.total_revenue))}</div>
          </div>
        ))}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0ebe4", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.8rem", color: "#8b7355" }}>{filteredSales.length} line item{filteredSales.length !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: "0.88rem", color: "#2c1810", fontWeight: 500 }}>Total: {formatCurrency(dayTotal)}</span>
        </div>
      </div>
    </div>
  );
}
