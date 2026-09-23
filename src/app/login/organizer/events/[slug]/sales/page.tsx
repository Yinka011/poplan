/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type BrandPayout = {
  id?: number;
  brand_email: string;
  brand_name: string;
  total_revenue: number;
  commission_rate: number;
  commission_amount: number;
  payout_amount: number;
  payout_status: string;
  payout_date?: string;
};

type BrandSale = {
  id: number;
  brand_email: string;
  brand_name: string;
  product_name: string;
  variation_name: string;
  quantity_sold: number;
  unit_price: number;
  total_revenue: number;
  sale_date: string;
};

export default function SalesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const event = slug.charAt(0).toUpperCase() + slug.slice(1);

  const [payouts, setPayouts] = useState<BrandPayout[]>([]);
  const [sales, setSales] = useState<BrandSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploadingReport, setUploadingReport] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState(20);
  const [startDate, setStartDate] = useState("2026-09-11");
  const [endDate, setEndDate] = useState("2026-09-14");

  useEffect(() => { fetchData(); }, [slug]);

  const fetchData = async () => {
    const reportsRes = await supabase.from("brand_payout_reports").select("*").eq("event", event);
    if (reportsRes.data) setReports(reportsRes.data);
    const [payoutsRes, salesRes] = await Promise.all([
      supabase.from("event_payouts").select("*").eq("event", event).order("brand_name"),
      supabase.from("brand_sales").select("*").eq("event", event).order("sale_date"),
    ]);
    if (payoutsRes.data) setPayouts(payoutsRes.data);
    if (salesRes.data) setSales(salesRes.data);
    setLoading(false);
  };

  const syncSales = async () => {
    setSyncing(true);
    const res = await fetch("/api/square/sync-sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, start_date: startDate, end_date: endDate }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchData();
      alert(`Synced! ${data.orders_processed} orders processed, ${data.sales_inserted} new sales added.`);
    } else {
      alert("Error: " + (data.error || "Sync failed"));
    }
    setSyncing(false);
  };

  const uploadReport = async (brandEmail: string, brandName: string, file: File) => {
    setUploadingReport(brandEmail);
    console.log("Starting upload for", brandEmail, file.name);
    const path = `payout-reports/${event}/${brandEmail}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("brand-uploads").upload(path, file, { upsert: true });
    console.log("Storage upload result:", error || "success");
    if (error) { alert("Upload failed: " + error.message); setUploadingReport(null); return; }
    const { data: urlData } = supabase.storage.from("brand-uploads").getPublicUrl(path);
    // Delete existing and insert fresh
    await supabase.from("brand_payout_reports").delete().eq("event", event).eq("brand_email", brandEmail);
    const { error: insertError } = await supabase.from("brand_payout_reports").insert({
      event,
      brand_email: brandEmail,
      brand_name: brandName,
      file_url: urlData.publicUrl,
      file_name: file.name,
      payment_confirmed: false,
    });
    if (insertError) { console.error("Report insert error:", insertError); alert("Failed to save report: " + insertError.message); setUploadingReport(null); return; }
    setReports(prev => {
      const existing = prev.find(r => r.brand_email === brandEmail);
      if (existing) return prev.map(r => r.brand_email === brandEmail ? { ...r, file_url: urlData.publicUrl, file_name: file.name } : r);
      return [...prev, { event, brand_email: brandEmail, brand_name: brandName, file_url: urlData.publicUrl, file_name: file.name, payment_confirmed: false }];
    });
    setUploadingReport(null);
    // Notify brand
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: brandEmail,
        subject: "Your payout report is ready",
        html: `<div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:2rem"><h2 style="color:#1B3A2D">Your payout report is ready</h2><p style="color:#4a5a52">Log in to your Nalpop portal and go to the Sales tab to view your report and confirm your payment details.</p><a href="https://nalpop.com/brand/portal" style="display:inline-block;padding:12px 24px;background:#1B3A2D;color:#fff;text-decoration:none;border-radius:8px">View my report</a></div>`
      })
    });
    alert(`Report uploaded for ${brandName} and email sent!`);
  };

  const markPaid = async (brandEmail: string) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("event_payouts").update({ payout_status: "paid", payout_date: today }).eq("event", event).eq("brand_email", brandEmail);
    setPayouts(prev => prev.map(p => p.brand_email === brandEmail ? { ...p, payout_status: "paid", payout_date: today } : p));
  };

  const updateCommission = async (brandEmail: string, rate: number) => {
    const payout = payouts.find(p => p.brand_email === brandEmail);
    if (!payout) return;
    const grossRevenue = Number(payout.total_revenue);
    const taxRate = 0.08;
    const netSales = grossRevenue / (1 + taxRate);
    const processingFee = netSales * 0.0271;
    const afterProcessing = netSales - processingFee;
    const commission = afterProcessing * (rate / 100);
    const payoutAmount = afterProcessing - commission;
    await supabase.from("event_payouts").update({ commission_rate: rate, commission_amount: commission, payout_amount: payoutAmount }).eq("event", event).eq("brand_email", brandEmail);
    setPayouts(prev => prev.map(p => p.brand_email === brandEmail ? { ...p, commission_rate: rate, commission_amount: commission, payout_amount: payoutAmount } : p));
  };

  const totalRevenue = payouts.reduce((s, p) => s + Number(p.total_revenue), 0);
  const totalCommission = payouts.reduce((s, p) => s + Number(p.commission_amount), 0);
  const totalPayout = payouts.reduce((s, p) => s + Number(p.payout_amount), 0);
  const brandSales = selectedBrand ? sales.filter(s => s.brand_email === selectedBrand) : [];
  const formatCurrency = (n: number) => `$${Number(n).toFixed(2)}`;

  if (loading) return <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      {/* Header */}
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back to event</Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>Sales & Payouts — {event}</div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* Sync controls */}
        <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "0.75rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "1rem" }}>SYNC SALES FROM SQUARE</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" as const }}>
            <div>
              <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "3px" }}>FROM</div>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
            </div>
            <div>
              <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "3px" }}>TO</div>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: "7px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
            </div>
            <button onClick={syncSales} disabled={syncing} style={{ padding: "8px 20px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif", marginTop: "18px" }}>
              {syncing ? "Syncing..." : "↓ Sync from Square"}
            </button>
          </div>
        </div>

        {/* Summary */}
        {payouts.length > 0 && (
          <div style={{ background: "#1B3A2D", borderRadius: "14px", padding: "1.5rem 2rem", marginBottom: "1.5rem", color: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#E8C97A", letterSpacing: "0.15em", marginBottom: "6px" }}>TOTAL REVENUE</div>
              <div style={{ fontSize: "1.5rem" }}>{formatCurrency(totalRevenue)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#E8C97A", letterSpacing: "0.15em", marginBottom: "6px" }}>YOUR COMMISSION</div>
              <div style={{ fontSize: "1.5rem", color: "#E8C97A" }}>{formatCurrency(totalCommission)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#E8C97A", letterSpacing: "0.15em", marginBottom: "6px" }}>BRAND PAYOUTS</div>
              <div style={{ fontSize: "1.5rem" }}>{formatCurrency(totalPayout)}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: "#E8C97A", letterSpacing: "0.15em", marginBottom: "6px" }}>BRANDS</div>
              <div style={{ fontSize: "1.5rem" }}>{payouts.length}</div>
            </div>
          </div>
        )}

        {/* Charts */}
        {payouts.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            {/* Revenue by brand pie chart */}
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "1rem" }}>REVENUE BY BRAND</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={payouts.map(p => ({ name: p.brand_name, value: Number(p.total_revenue) }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => name && percent ? `${name.toString().split(" ")[0]} ${(percent * 100).toFixed(0)}%` : ""} labelLine={false} fontSize={10}>
                    {payouts.map((_, i) => (
                      <Cell key={i} fill={["#1B3A2D","#E8C97A","#4a7c59","#2a4d3e","#8b6ab0","#5b7fa6","#a0522d","#E8C97A88","#4a7c5988","#1B3A2D88","#d4a574","#7a9e7e","#c4956a"][i % 13]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => `$${Number(val).toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue by brand bar chart */}
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.72rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "1rem" }}>REVENUE RANKING</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[...payouts].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue)).map(p => ({ name: p.brand_name.split(" ")[0], revenue: Number(p.total_revenue) }))} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(val: any) => `$${Number(val).toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="#1B3A2D" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Per brand payouts */}
        {payouts.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "4rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "1rem", color: "#1c1714", marginBottom: "0.5rem" }}>No sales yet</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Sync sales from Square after the event to see payouts.</div>
          </div>
        ) : (
          <div>
            {/* Default commission rate */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <span style={{ fontSize: "0.82rem", color: "#4a5a52" }}>Default commission rate:</span>
              <input type="number" value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value))} style={{ width: "60px", padding: "5px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
              <span style={{ fontSize: "0.82rem", color: "#4a5a52" }}>%</span>
            </div>

            {payouts.map(payout => (
              <div key={payout.brand_email} style={{ background: "#fff", borderRadius: "14px", marginBottom: "1rem", border: "1px solid #e4ebe6", overflow: "hidden" }}>
                {/* Brand header */}
                <div style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "1rem", color: "#1c1714", marginBottom: "4px" }}>{payout.brand_name}</div>
                    <div style={{ display: "flex", gap: "16px" }}>
                      <div><div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.1em" }}>REVENUE</div><div style={{ fontSize: "1rem", color: "#1c1714" }}>{formatCurrency(payout.total_revenue)}</div></div>
                      <div>
                        <div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.1em" }}>COMMISSION</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <input type="number" value={payout.commission_rate} onChange={e => updateCommission(payout.brand_email, Number(e.target.value))} style={{ width: "45px", padding: "2px 6px", border: "1px solid #e4ebe6", borderRadius: "4px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
                          <span style={{ fontSize: "0.72rem", color: "#4a5a52" }}>% = {formatCurrency(payout.commission_amount)}</span>
                        </div>
                      </div>
                      <div><div style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.1em" }}>PAYOUT</div><div style={{ fontSize: "1rem", color: "#4a7c59", fontWeight: 500 }}>{formatCurrency(payout.payout_amount)}</div></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.72rem", padding: "3px 10px", borderRadius: "20px", background: payout.payout_status === "paid" ? "#4a7c5922" : "#f0f4f1", color: payout.payout_status === "paid" ? "#4a7c59" : "#4a5a52" }}>
                      {payout.payout_status === "paid" ? "✓ Paid" : "Pending"}
                    </span>
                    {payout.payout_status !== "paid" && (
                      <button onClick={() => markPaid(payout.brand_email)} style={{ padding: "5px 12px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer" }}>Mark paid</button>
                    )}
                    <button onClick={() => setSelectedBrand(selectedBrand === payout.brand_email ? null : payout.brand_email)} style={{ padding: "5px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer", color: "#4a5a52" }}>
                      {selectedBrand === payout.brand_email ? "Hide" : "View sales"}
                    </button>
                  </div>
                  {/* Report upload */}
                  <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f4f1", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafaf8" }}>
                    <div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>
                      {(() => {
                        const report = reports.find(r => r.brand_email === payout.brand_email);
                        if (report) return (
                          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                            <span style={{ color: "#4a7c59" }}>✓ Report uploaded</span>
                            <a href={report.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "#1B3A2D", textDecoration: "underline" }}>{report.file_name}</a>
                            {report.payment_confirmed && <span style={{ fontSize: "0.72rem", color: "#4a7c59" }}>💳 Payment confirmed: {report.payment_method} · {report.payment_details}</span>}
                            {!report.payment_confirmed && <span style={{ fontSize: "0.72rem", color: "#b87333" }}>⏳ Awaiting payment details</span>}
                          </div>
                        );
                        return <span style={{ color: "#4a5a52" }}>No report uploaded yet</span>;
                      })()}
                    </div>
                    <label style={{ padding: "5px 12px", background: "#1B3A2D", color: "#fff", borderRadius: "8px", fontSize: "0.78rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                      {uploadingReport === payout.brand_email ? "Uploading..." : "↑ Upload report"}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv" onChange={e => { const f = e.target.files?.[0]; if (f) uploadReport(payout.brand_email, payout.brand_name, f); }} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>

                {/* Brand sales breakdown */}
                {selectedBrand === payout.brand_email && (
                  <div style={{ borderTop: "1px solid #f0f4f1" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "8px 16px", background: "#f8faf8", fontSize: "0.68rem", color: "#4a5a52", letterSpacing: "0.08em" }}>
                      <div>PRODUCT</div><div>VARIATION</div><div>QTY</div><div>REVENUE</div>
                    </div>
                    {brandSales.length === 0 ? (
                      <div style={{ padding: "1rem", fontSize: "0.82rem", color: "#4a5a52" }}>No sales recorded yet.</div>
                    ) : (
                      brandSales.map(sale => (
                        <div key={sale.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "10px 16px", borderTop: "1px solid #f5f2ee", alignItems: "center" }}>
                          <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>{sale.product_name}</div>
                          <div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>{sale.variation_name || "—"}</div>
                          <div style={{ fontSize: "0.85rem", color: "#1c1714" }}>{sale.quantity_sold}</div>
                          <div style={{ fontSize: "0.85rem", color: "#4a7c59" }}>{formatCurrency(Number(sale.total_revenue))}</div>
                        </div>
                      ))
                    )}
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #f0f4f1", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.78rem", color: "#4a5a52" }}>{brandSales.length} line items</span>
                      <span style={{ fontSize: "0.85rem", color: "#1c1714" }}>Total: {formatCurrency(brandSales.reduce((s, sale) => s + Number(sale.total_revenue), 0))}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
