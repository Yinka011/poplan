"use client";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
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
  const [report, setReport] = useState<any>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ method: "Zelle", details: "" });
  const [savingPayment, setSavingPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState("all");

  useEffect(() => {
    fetchSales();
  }, [event, brandEmail]);

  const fetchSales = async () => {
    const reportRes = await supabase.from("brand_payout_reports").select("*").eq("brand_email", brandEmail).eq("event", event).maybeSingle();
    if (reportRes.data) {
      setReport(reportRes.data);
      if (!reportRes.data.payment_confirmed) setShowPaymentForm(true);
    }
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
  const savePaymentDetails = async () => {
    if (!paymentForm.details.trim() || !report) return;
    setSavingPayment(true);
    await supabase.from("brand_payout_reports").update({ payment_method: paymentForm.method, payment_details: paymentForm.details, payment_confirmed: true }).eq("id", report.id);
    setReport((prev: any) => ({ ...prev, payment_method: paymentForm.method, payment_details: paymentForm.details, payment_confirmed: true }));
    setShowPaymentForm(false);
    setSavingPayment(false);
  };

  const formatCurrency = (n: number) => `$${Number(n).toFixed(2)}`;

  if (loading) return <div style={{ fontSize: "0.85rem", color: "#4a5a52", padding: "1rem" }}>Loading sales data...</div>;

  if (sales.length === 0) return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
      <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No sales yet</div>
      <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Your sales will appear here after the event begins.</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "Georgia, serif" }}>

      {/* Payout summary */}
      {payout && (
        <div style={{ background: "#1B3A2D", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ fontSize: "0.65rem", color: "#d4c87a", letterSpacing: "0.15em", marginBottom: "1rem" }}>YOUR SALES SUMMARY</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#d4c87a", marginBottom: "6px" }}>TOTAL REVENUE</div>
              <div style={{ fontSize: "1.6rem" }}>{formatCurrency(payout.total_revenue)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#d4c87a", marginBottom: "6px" }}>COMMISSION ({payout.commission_rate}%)</div>
              <div style={{ fontSize: "1.6rem", color: "#e8c97a" }}>{formatCurrency(payout.commission_amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#d4c87a", marginBottom: "6px" }}>YOUR PAYOUT</div>
              <div style={{ fontSize: "1.6rem", color: "#90c9a0" }}>{formatCurrency(payout.payout_amount)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#d4c87a", marginBottom: "6px" }}>STATUS</div>
              <div style={{ fontSize: "0.9rem", marginTop: "8px" }}>
                <span style={{ padding: "4px 12px", borderRadius: "20px", background: payout.payout_status === "paid" ? "#90c9a022" : "#e8c97a22", color: payout.payout_status === "paid" ? "#90c9a0" : "#e8c97a", fontSize: "0.78rem" }}>
                  {payout.payout_status === "paid" ? "✓ Paid" : "Pending"}
                </span>
                {payout.payout_date && <div style={{ fontSize: "0.7rem", color: "#d4c87a", marginTop: "4px" }}>Expected {payout.payout_date}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
        <button onClick={() => setActiveDay("all")} style={{ padding: "5px 14px", background: activeDay === "all" ? "#1B3A2D" : "#fff", color: activeDay === "all" ? "#fff" : "#4a5a52", border: "1px solid " + (activeDay === "all" ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>All days</button>
        {days.map(day => (
          <button key={day} onClick={() => setActiveDay(day)} style={{ padding: "5px 14px", background: activeDay === day ? "#1B3A2D" : "#fff", color: activeDay === day ? "#fff" : "#4a5a52", border: "1px solid " + (activeDay === day ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>{formatDate(day)}</button>
        ))}
      </div>

      {/* Day summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "8px" }}>UNITS SOLD</div>
          <div style={{ fontSize: "2rem", color: "#1B3A2D", fontWeight: "normal" }}>{dayUnits}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "8px" }}>REVENUE</div>
          <div style={{ fontSize: "2rem", color: "#1B3A2D", fontWeight: "normal" }}>{formatCurrency(dayTotal)}</div>
        </div>
      </div>

      {/* Payout report */}
      {report && (
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>PAYOUT REPORT</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href={report.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.88rem", color: "#1B3A2D", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }}>
              📄 <span style={{ textDecoration: "underline" }}>{report.file_name}</span>
            </a>
            <span style={{ fontSize: "0.72rem", color: "#4a7c59" }}>↓ Download</span>
          </div>
          {report.payment_confirmed && (
            <div style={{ marginTop: "8px", fontSize: "0.78rem", color: "#4a7c59" }}>✓ Payment details confirmed · {report.payment_method} · {report.payment_details}</div>
          )}
          {showPaymentForm && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "#f8faf8", borderRadius: "8px", border: "1px solid #E8C97A" }}>
              <div style={{ fontSize: "0.72rem", color: "#b87333", marginBottom: "0.75rem" }}>Please confirm your payment details to receive your payout</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <select value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} style={{ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }}>
                  {["Zelle","Bank Transfer","Cash App","PayPal","Venmo"].map(m => <option key={m}>{m}</option>)}
                </select>
                <input placeholder="Phone, email or account number" value={paymentForm.details} onChange={e => setPaymentForm({...paymentForm, details: e.target.value})} style={{ flex: 1, padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
              </div>
              <button onClick={savePaymentDetails} disabled={savingPayment || !paymentForm.details.trim()} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {savingPayment ? "Saving..." : "Confirm payment details"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {filteredSales.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>REVENUE BY PRODUCT</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={Object.entries(filteredSales.reduce((acc: Record<string, number>, s) => { acc[s.product_name] = (acc[s.product_name] || 0) + Number(s.total_revenue); return acc; }, {})).map(([name, value]) => ({ name, value }))}
                  dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                  label={({ name, percent }) => name && percent ? `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""}
                  labelLine={false} fontSize={9}>
                  {filteredSales.map((_, i) => <Cell key={i} fill={["#1B3A2D","#E8C97A","#4a7c59","#2a4d3e","#8b6ab0","#5b7fa6","#a0522d","#d4a574"][i % 8]} />)}
                </Pie>
                <Tooltip formatter={(val: any) => `$${Number(val).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>UNITS SOLD BY PRODUCT</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={Object.entries(filteredSales.reduce((acc: Record<string, number>, s) => { acc[s.product_name] = (acc[s.product_name] || 0) + Number(s.quantity_sold); return acc; }, {})).map(([name, value]) => ({ name: name.split(" ")[0], value }))}
                layout="vertical">
                <XAxis type="number" tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={70} />
                <Tooltip />
                <Bar dataKey="value" fill="#1B3A2D" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Sales table */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e4ebe6", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 16px", background: "#f8faf8", fontSize: "0.68rem", color: "#4a5a52", letterSpacing: "0.08em" }}>
          <div>PRODUCT</div><div>VARIATION</div><div>QTY</div><div>REVENUE</div>
        </div>
        {filteredSales.map(sale => (
          <div key={sale.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "12px 16px", borderTop: "1px solid #f0f4f1", alignItems: "center" }}>
            <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{sale.product_name}</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>{sale.variation_name || "—"}</div>
            <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{sale.quantity_sold}</div>
            <div style={{ fontSize: "0.88rem", color: "#4a7c59" }}>{formatCurrency(Number(sale.total_revenue))}</div>
          </div>
        ))}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f4f1", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.8rem", color: "#4a5a52" }}>{filteredSales.length} line item{filteredSales.length !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: "0.88rem", color: "#1B3A2D", fontWeight: 500 }}>Total: {formatCurrency(dayTotal)}</span>
        </div>
      </div>
    </div>
  );
}
