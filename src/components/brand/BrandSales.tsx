"use client";
import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import PageSkeleton from "@/components/shared/PageSkeleton";

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

type Report = {
  id: number;
  file_url: string;
  file_name: string;
  payment_confirmed: boolean;
  payment_method?: string;
  payment_details?: string;
};

type Props = {
  event: string;
  brandEmail: string;
};

export default function BrandSales({ event, brandEmail }: Props) {
  return <BrandSalesContent key={JSON.stringify([event, brandEmail])} event={event} brandEmail={brandEmail} />;
}

function BrandSalesContent({ event, brandEmail }: Props) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [payout, setPayout] = useState<Payout | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ method: "Zelle", details: "" });
  const [savingPayment, setSavingPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const savingRef = useRef(false);
  const [activeDay, setActiveDay] = useState("all");

  useEffect(() => {
    let active = true;
    const fetchSales = async () => {
    setLoading(true);
    setLoadError("");
    try {
    const reportRes = await supabase.from("brand_payout_reports").select("*").eq("brand_email", brandEmail).eq("event", event).maybeSingle();
    const [salesRes, payoutRes] = await Promise.all([
      supabase.from("brand_sales").select("*").eq("event", event).eq("brand_email", brandEmail).order("sale_date"),
      supabase.from("event_payouts").select("*").eq("event", event).eq("brand_email", brandEmail).maybeSingle(),
    ]);
    if (reportRes.error || salesRes.error || payoutRes.error) throw reportRes.error || salesRes.error || payoutRes.error;
    if (!active) return;
    setReport(reportRes.data);
    setShowPaymentForm(!!reportRes.data && !reportRes.data.payment_confirmed);
    setSales(salesRes.data ?? []);
    setPayout(payoutRes.data);
    } catch (error) {
      console.error("Could not load sales:", error);
      if (active) setLoadError("Could not load sales data. Please try again.");
    } finally {
      if (active) setLoading(false);
    }
    };
    void fetchSales();
    return () => { active = false; };
  }, [event, brandEmail, retry]);

  const days = [...new Set(sales.map(s => s.sale_date))].sort();
  const filteredSales = activeDay === "all" ? sales : sales.filter(s => s.sale_date === activeDay);

  const dayTotal = filteredSales.reduce((s, sale) => s + Number(sale.total_revenue), 0);
  const dayUnits = filteredSales.reduce((s, sale) => s + Number(sale.quantity_sold), 0);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const savePaymentDetails = async () => {
    if (savingRef.current || !report) return;
    if (!paymentForm.details.trim()) { alert("Enter your payment details."); return; }
    savingRef.current = true;
    setSavingPayment(true);
    try {
    const { error } = await supabase.from("brand_payout_reports").update({ payment_method: paymentForm.method, payment_details: paymentForm.details, payment_confirmed: true }).eq("id", report.id).select("id").single();
    if (error) throw error;
    setReport(prev => prev ? { ...prev, payment_method: paymentForm.method, payment_details: paymentForm.details, payment_confirmed: true } : prev);
    setShowPaymentForm(false);
    } catch (error) {
      console.error("Could not save payment details:", error);
      alert("Could not save payment details. Please try again.");
    } finally {
    savingRef.current = false;
    setSavingPayment(false);
    }
  };

  if (loading || loadError) return <LoadingView loading={loading} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<PageSkeleton label="Loading sales data" />} />;

  if (sales.length === 0 && !report && !payout) return (
    <div style={{ background: "#fff", borderRadius: "14px", padding: "3rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
      <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No sales yet</div>
      <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Your sales will appear here after the event begins.</div>
    </div>
  );

  return (
    <div className="[overflow-wrap:anywhere]">

      {/* Payout summary */}
      {payout && (
        <div style={{ background: "#1B3A2D", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
          <div style={{ fontSize: "0.65rem", color: "#d4c87a", letterSpacing: "0.15em", marginBottom: "1rem" }}>YOUR SALES SUMMARY</div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
        <button onClick={() => setActiveDay("all")} style={{ padding: "5px 14px", background: activeDay === "all" ? "#1B3A2D" : "#fff", color: activeDay === "all" ? "#fff" : "#4a5a52", border: "1px solid " + (activeDay === "all" ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.78rem", cursor: "pointer" }}>All days</button>
        {days.map(day => (
          <button key={day} onClick={() => setActiveDay(day)} style={{ padding: "5px 14px", background: activeDay === day ? "#1B3A2D" : "#fff", color: activeDay === day ? "#fff" : "#4a5a52", border: "1px solid " + (activeDay === day ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.78rem", cursor: "pointer" }}>{formatDate(day)}</button>
        ))}
      </div>

      {/* Day summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" style={{ marginBottom: "1.5rem" }}>
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "8px" }}>UNITS SOLD</div>
          <div style={{ fontSize: "2rem", color: "#1B3A2D", fontWeight: "normal" }}>{dayUnits.toLocaleString("en-US")}</div>
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center" }}>
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                <select disabled={savingPayment} value={paymentForm.method} onChange={e => setPaymentForm({...paymentForm, method: e.target.value})} style={{ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem" }}>
                  {["Zelle","Bank Transfer","Cash App","PayPal","Venmo"].map(m => <option key={m}>{m}</option>)}
                </select>
                <input disabled={savingPayment} placeholder="Phone, email or account number" value={paymentForm.details} onChange={e => setPaymentForm({...paymentForm, details: e.target.value})} style={{ flex: "1 1 160px", minWidth: 0, padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem" }} />
              </div>
              <button onClick={savePaymentDetails} disabled={savingPayment || !paymentForm.details.trim()} style={{ padding: "7px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.82rem", cursor: "pointer" }}>
                {savingPayment ? "Saving..." : "Confirm payment details"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Charts */}
      {filteredSales.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 [&>div]:min-w-0">
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
                <Tooltip formatter={(val) => formatCurrency(Number(val))} />
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
      <div role="region" aria-label="Sales breakdown" tabIndex={0} style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e4ebe6", overflowX: "auto" }}>
        <div style={{ minWidth: "560px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) repeat(3, minmax(0, 1fr))", padding: "10px 16px", background: "#f8faf8", fontSize: "0.68rem", color: "#4a5a52", letterSpacing: "0.08em" }}>
          <div>PRODUCT</div><div>VARIATION</div><div>QTY</div><div>REVENUE</div>
        </div>
        {filteredSales.map(sale => (
          <div key={sale.id} style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) repeat(3, minmax(0, 1fr))", padding: "12px 16px", borderTop: "1px solid #f0f4f1", alignItems: "center" }}>
            <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{sale.product_name}</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>{sale.variation_name || "—"}</div>
            <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{Number(sale.quantity_sold).toLocaleString("en-US")}</div>
            <div style={{ fontSize: "0.88rem", color: "#4a7c59" }}>{formatCurrency(Number(sale.total_revenue))}</div>
          </div>
        ))}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f4f1", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.8rem", color: "#4a5a52" }}>{filteredSales.length} line item{filteredSales.length !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: "0.88rem", color: "#1B3A2D", fontWeight: 500 }}>Total: {formatCurrency(dayTotal)}</span>
        </div>
        </div>
      </div>
    </div>
  );
}
