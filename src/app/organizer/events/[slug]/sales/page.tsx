/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { folderSegment, uploadToCloudinary } from "@/lib/cloudinary";
import { formatCurrency, formatEventName } from "@/lib/events";
import { calculatePayout, DEFAULT_PROCESSING_RATE } from "@/lib/payouts";
import { useParams } from "next/navigation";
import { useOrganizer } from "@/context/OrganizerContext";
import Link from "next/link";
import LoadingView from "@/components/LoadingView";
import SalesSkeleton from "./SalesSkeleton";

type BrandPayout = {
  id?: number;
  brand_email: string;
  brand_name: string;
  total_revenue: number;
  commission_rate: number;
  square_processing_rate: number | null;
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
  // const event = slug.charAt(0).toUpperCase() + slug.slice(1);

  const { organizerEmail, loading: organizerLoading } = useOrganizer();
  const [payouts, setPayouts] = useState<BrandPayout[]>([]);
  const [sales, setSales] = useState<BrandSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const requestId = useRef(0);

  const [syncing, setSyncing] = useState(false);
  const [uploadingReport, setUploadingReport] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [commissionRate, setCommissionRate] = useState(20);
  const [commissionRates, setCommissionRates] = useState<Record<string, string>>({});
  const [processingRates, setProcessingRates] = useState<Record<string, string>>({});
  const [savingPayout, setSavingPayout] = useState<string | null>(null);
  const savingPayoutRef = useRef(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = useCallback(
    async (showLoading = false) => {
      const currentRequest = ++requestId.current;
      if (showLoading) setLoading(true);
      setLoadError("");
      try {
        if (!organizerEmail)
          throw new Error("Please sign in to view sales and payouts.");
        const [reportsRes, payoutsRes, salesRes] = await Promise.all([
          supabase
            .from("brand_payout_reports")
            .select("*")
            .eq("event", formatEventName(slug)),
          supabase
            .from("event_payouts")
            .select("*")
            .eq("event", formatEventName(slug))
            .order("brand_name"),
          supabase
            .from("brand_sales")
            .select("*")
            .eq("event", formatEventName(slug))
            .not("square_order_id", "is", null)
            .neq("square_order_id", "")
            .order("sale_date"),
        ]);
        const error = reportsRes.error || payoutsRes.error || salesRes.error;
        if (error) throw error;
        if (currentRequest !== requestId.current) return false;
        setReports(reportsRes.data || []);
        setPayouts(payoutsRes.data || []);
        setCommissionRates(
          Object.fromEntries(
            (payoutsRes.data || []).map((payout) => [
              payout.brand_email,
              String(payout.commission_rate),
            ]),
          ),
        );
        setProcessingRates(
          Object.fromEntries(
            (payoutsRes.data || []).map((payout) => [
              payout.brand_email,
              String(payout.square_processing_rate ?? DEFAULT_PROCESSING_RATE),
            ]),
          ),
        );
        setSales(salesRes.data || []);
        return true;
      } catch (error) {
        console.error("Failed to load sales and payouts:", error);
        if (currentRequest === requestId.current)
          setLoadError("Could not load sales and payouts. Please try again.");
        return false;
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [organizerEmail, slug],
  );

  useEffect(() => {
    if (organizerLoading) return;
    void fetchData(true);
    return () => {
      requestId.current += 1;
    };
  }, [fetchData, organizerLoading]);

  const syncSales = async () => {
    if (!startDate || !endDate) {
      alert("Please select a FROM and TO date before syncing.");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/square/sync-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: formatEventName(slug),
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const refreshed = await fetchData();
        if (refreshed)
          alert(
            `Synced! ${data.orders_processed} orders processed, ${data.sales_inserted} new sales added.`,
          );
      } else {
        alert("Error: " + (data.error || "Sync failed"));
      }
    } catch (error) {
      console.error("Failed to sync sales:", error);
      alert("Failed to sync sales. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const uploadReport = async (
    brandEmail: string,
    brandName: string,
    file: File,
  ) => {
    setUploadingReport(brandEmail);
    let uploadedUrl: string;
    try {
      const uploaded = await uploadToCloudinary(
        file,
        `payout-reports/${folderSegment(formatEventName(slug))}/${folderSegment(brandEmail)}`,
      );
      uploadedUrl = uploaded.url;
    } catch (error) {
      alert(
        "Upload failed: " +
          (error instanceof Error ? error.message : "Please try again."),
      );
      setUploadingReport(null);
      return;
    }
    await supabase
      .from("brand_payout_reports")
      .delete()
      .eq("event", formatEventName(slug))
      .eq("brand_email", brandEmail);
    const { error: insertError } = await supabase
      .from("brand_payout_reports")
      .insert({
        event: formatEventName(slug),
        brand_email: brandEmail,
        brand_name: brandName,
        file_url: uploadedUrl,
        file_name: file.name,
        payment_confirmed: false,
      });
    if (insertError) {
      alert("Failed to save report: " + insertError.message);
      setUploadingReport(null);
      return;
    }
    setReports((prev) => {
      const existing = prev.find((r) => r.brand_email === brandEmail);
      if (existing)
        return prev.map((r) =>
          r.brand_email === brandEmail
            ? { ...r, file_url: uploadedUrl, file_name: file.name }
            : r,
        );
      return [
        ...prev,
        {
          event: formatEventName(slug),
          brand_email: brandEmail,
          brand_name: brandName,
          file_url: uploadedUrl,
          file_name: file.name,
          payment_confirmed: false,
        },
      ];
    });
    setUploadingReport(null);
    // Notify brand — only send if we have a valid email
    if (brandEmail) {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: brandEmail,
          subject: "Your payout report is ready",
          html: `<div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:2rem"><h2 style="color:#1B3A2D">Your payout report is ready</h2><p style="color:#4a5a52">Log in to your Nalpop portal and go to the Sales tab to view your report and confirm your payment details.</p><a href="https://nalpop.com/brand/portal" style="display:inline-block;padding:12px 24px;background:#1B3A2D;color:#fff;text-decoration:none;border-radius:8px">View my report</a></div>`,
        }),
      }).catch(() => {});
    }
    alert(`Report uploaded for ${brandName}!`);
  };

  const markPaid = async (brandEmail: string) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase
      .from("event_payouts")
      .update({ payout_status: "paid", payout_date: today })
      .eq("event", formatEventName(slug))
      .eq("brand_email", brandEmail);
    setPayouts((prev) =>
      prev.map((p) =>
        p.brand_email === brandEmail
          ? { ...p, payout_status: "paid", payout_date: today }
          : p,
      ),
    );
  };

  const saveRates = async (brandEmail: string, commissionRate: number, processingRate: number) => {
    if (savingPayoutRef.current) return;
    const payout = payouts.find((p) => p.brand_email === brandEmail);
    if (!payout) return;
    if (![commissionRate, processingRate].every((rate) => Number.isFinite(rate) && rate >= 0 && rate <= 100)) {
      alert("Enter a rate between 0 and 100%.");
      return;
    }
    const { commissionAmount, payoutAmount } = calculatePayout(
      Number(payout.total_revenue),
      commissionRate,
      processingRate,
    );
    savingPayoutRef.current = true;
    setSavingPayout(brandEmail);
    try {
      const { error } = await supabase
        .from("event_payouts")
        .update({
          commission_rate: commissionRate,
          square_processing_rate: processingRate,
          commission_amount: commissionAmount,
          payout_amount: payoutAmount,
        })
        .eq("event", formatEventName(slug))
        .eq("brand_email", brandEmail)
        .select("id")
        .single();
      if (error) throw error;
      setPayouts((prev) =>
        prev.map((p) =>
          p.brand_email === brandEmail
            ? {
                ...p,
                commission_rate: commissionRate,
                square_processing_rate: processingRate,
                commission_amount: commissionAmount,
                payout_amount: payoutAmount,
              }
            : p,
        ),
      );
      setProcessingRates((prev) => ({ ...prev, [brandEmail]: String(processingRate) }));
      setCommissionRates((prev) => ({ ...prev, [brandEmail]: String(commissionRate) }));
    } catch (error) {
      console.error("Failed to save payout rates:", error);
      alert("Could not save payout rates. Please try again.");
    } finally {
      savingPayoutRef.current = false;
      setSavingPayout(null);
    }
  };

  const totalRevenue = payouts.reduce((s, p) => s + Number(p.total_revenue), 0);
  const totalCommission = payouts.reduce(
    (s, p) => s + Number(p.commission_amount),
    0,
  );
  const totalPayout = payouts.reduce((s, p) => s + Number(p.payout_amount), 0);
  const brandSales = selectedBrand
    ? sales.filter((s) => s.brand_email === selectedBrand)
    : [];

  return (
    <div
      className="[overflow-wrap:anywhere]"
      style={{ minHeight: "100vh", background: "#f8faf8" }}
    >
      {/* Header */}
      <div
        style={{
          background: "#1B3A2D",
          padding: "1rem 2rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <Link
          href={`/organizer/events/${slug}`}
          style={{
            fontSize: "0.8rem",
            color: "#E8C97A",
            textDecoration: "none",
          }}
        >
          ← Back to event
        </Link>
        <div style={{ fontSize: "1rem", color: "#fff" }}>
          Sales & Payouts — {formatEventName(slug)}
        </div>
      </div>

      <div
        style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        <LoadingView
          loading={loading || organizerLoading}
          error={loadError}
          onRetry={() => {
            void fetchData(true);
          }}
          customLoader={<SalesSkeleton />}
        >
          {/* Sync controls */}
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "1.5rem",
              marginBottom: "1.5rem",
              border: "1px solid #e4ebe6",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#4a5a52",
                letterSpacing: "0.12em",
                marginBottom: "1rem",
              }}
            >
              SYNC SALES FROM SQUARE
            </div>
            <div
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
                flexWrap: "wrap" as const,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "#4a5a52",
                    marginBottom: "3px",
                  }}
                >
                  FROM
                </div>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.68rem",
                    color: "#4a5a52",
                    marginBottom: "3px",
                  }}
                >
                  TO
                </div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    padding: "7px 10px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                  }}
                />
              </div>
              <button
                onClick={syncSales}
                disabled={syncing || !startDate || !endDate}
                style={{
                  padding: "8px 20px",
                  background: "#1B3A2D",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  marginTop: "18px",
                }}
              >
                {syncing ? "Syncing..." : "↓ Sync from Square"}
              </button>
            </div>
          </div>

          {/* Summary */}
          {payouts.length > 0 && (
            <p className="mb-3 text-sm text-[#4a5a52]">
              Sales lists show Square-linked sales only. Payout totals are
              stored separately and may include other sales or adjustments.
            </p>
          )}
          {payouts.length > 0 && (
            <div
              className="grid grid-cols-2 gap-6 lg:grid-cols-4"
              style={{
                background: "#1B3A2D",
                borderRadius: "14px",
                padding: "1.5rem 2rem",
                marginBottom: "1.5rem",
                color: "#fff",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#E8C97A",
                    letterSpacing: "0.15em",
                    marginBottom: "6px",
                  }}
                >
                  TOTAL REVENUE
                </div>
                <div style={{ fontSize: "1.5rem" }}>
                  {formatCurrency(totalRevenue)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#E8C97A",
                    letterSpacing: "0.15em",
                    marginBottom: "6px",
                  }}
                >
                  YOUR COMMISSION
                </div>
                <div style={{ fontSize: "1.5rem", color: "#E8C97A" }}>
                  {formatCurrency(totalCommission)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#E8C97A",
                    letterSpacing: "0.15em",
                    marginBottom: "6px",
                  }}
                >
                  BRAND PAYOUTS
                </div>
                <div style={{ fontSize: "1.5rem" }}>
                  {formatCurrency(totalPayout)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#E8C97A",
                    letterSpacing: "0.15em",
                    marginBottom: "6px",
                  }}
                >
                  BRANDS
                </div>
                <div style={{ fontSize: "1.5rem" }}>{payouts.length}</div>
              </div>
            </div>
          )}

          {/* Charts */}
          {payouts.length > 0 && (
            <div
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              style={{
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "1.5rem",
                  border: "1px solid #e4ebe6",
                }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#4a5a52",
                    letterSpacing: "0.12em",
                    marginBottom: "1rem",
                  }}
                >
                  REVENUE BY BRAND
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={payouts.map((p) => ({
                        name: p.brand_name,
                        value: Number(p.total_revenue),
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        name && percent
                          ? `${name.toString().split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                          : ""
                      }
                      labelLine={false}
                      fontSize={10}
                    >
                      {payouts.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            [
                              "#1B3A2D",
                              "#E8C97A",
                              "#4a7c59",
                              "#2a4d3e",
                              "#8b6ab0",
                              "#5b7fa6",
                              "#a0522d",
                              "#E8C97A88",
                              "#4a7c5988",
                              "#1B3A2D88",
                              "#d4a574",
                              "#7a9e7e",
                              "#c4956a",
                            ][i % 13]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "1.5rem",
                  border: "1px solid #e4ebe6",
                }}
              >
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#4a5a52",
                    letterSpacing: "0.12em",
                    marginBottom: "1rem",
                  }}
                >
                  REVENUE RANKING
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={[...payouts]
                      .sort(
                        (a, b) =>
                          Number(b.total_revenue) - Number(a.total_revenue),
                      )
                      .map((p) => ({
                        name: p.brand_name.split(" ")[0],
                        revenue: Number(p.total_revenue),
                      }))}
                    layout="vertical"
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) =>
                        `$${Number(v).toLocaleString("en-US", { maximumFractionDigits: 20 })}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      width={70}
                    />
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val))}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#1B3A2D"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Per brand payouts */}
          {payouts.length === 0 ? (
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "4rem",
                textAlign: "center",
                border: "1px solid #e4ebe6",
              }}
            >
              <div
                style={{
                  fontSize: "1rem",
                  color: "#1c1714",
                  marginBottom: "0.5rem",
                }}
              >
                No sales yet
              </div>
              <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                Sync sales from Square after the event to see payouts.
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "1rem",
                }}
              >
                <span style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                  Default commission rate:
                </span>
                <input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  style={{
                    width: "60px",
                    padding: "5px 8px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                  }}
                />
                <span style={{ fontSize: "0.82rem", color: "#4a5a52" }}>%</span>
              </div>

              {payouts.map((payout) => {
                const report = reports.find(
                  (r) => r.brand_email === payout.brand_email,
                );
                return (
                  <div
                    key={payout.brand_email}
                    style={{
                      background: "#fff",
                      borderRadius: "14px",
                      marginBottom: "1rem",
                      border: "1px solid #e4ebe6",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "1.25rem",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "1rem",
                            color: "#1c1714",
                            marginBottom: "4px",
                          }}
                        >
                          {payout.brand_name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "16px",
                            flexWrap: "wrap" as const,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "0.62rem",
                                color: "#4a5a52",
                                letterSpacing: "0.1em",
                              }}
                            >
                              REVENUE
                            </div>
                            <div style={{ fontSize: "1rem", color: "#1c1714" }}>
                              {formatCurrency(payout.total_revenue)}
                            </div>
                          </div>
                          <div>
                            <label htmlFor={`processing-${payout.brand_email}`} style={{ fontSize: "0.62rem", color: "#4a5a52", letterSpacing: "0.1em", display: "block" }}>
                              PROCESSING FEE
                            </label>
                            <input
                              id={`processing-${payout.brand_email}`}
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={processingRates[payout.brand_email] ?? String(payout.square_processing_rate ?? DEFAULT_PROCESSING_RATE)}
                              onChange={(e) => setProcessingRates((prev) => ({ ...prev, [payout.brand_email]: e.target.value }))}
                              style={{ width: "65px", padding: "2px 6px", border: "1px solid #e4ebe6", borderRadius: "4px", fontSize: "0.82rem" }}
                            />
                            <span style={{ fontSize: "0.72rem", color: "#4a5a52" }}> %</span>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.62rem",
                                color: "#4a5a52",
                                letterSpacing: "0.1em",
                              }}
                            >
                              COMMISSION
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                aria-label={`Commission rate for ${payout.brand_name}`}
                                value={commissionRates[payout.brand_email] ?? String(payout.commission_rate)}
                                onChange={(e) => setCommissionRates((prev) => ({ ...prev, [payout.brand_email]: e.target.value }))}
                                style={{
                                  width: "45px",
                                  padding: "2px 6px",
                                  border: "1px solid #e4ebe6",
                                  borderRadius: "4px",
                                  fontSize: "0.82rem",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#4a5a52",
                                }}
                              >
                                % = {formatCurrency(payout.commission_amount)}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={savingPayout !== null}
                            onClick={() => {
                              const commission = commissionRates[payout.brand_email] ?? String(payout.commission_rate);
                              const processing = processingRates[payout.brand_email] ?? String(payout.square_processing_rate ?? DEFAULT_PROCESSING_RATE);
                              if (!commission.trim() || !processing.trim()) {
                                alert("Enter both payout rates.");
                                return;
                              }
                              void saveRates(payout.brand_email, Number(commission), Number(processing));
                            }}
                            style={{ alignSelf: "center", padding: "4px 8px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.72rem", cursor: "pointer" }}
                          >
                            {savingPayout === payout.brand_email ? "Saving..." : "Save rates"}
                          </button>
                          <div>
                            <div
                              style={{
                                fontSize: "0.62rem",
                                color: "#4a5a52",
                                letterSpacing: "0.1em",
                              }}
                            >
                              PAYOUT
                            </div>
                            <div
                              style={{
                                fontSize: "1rem",
                                color: "#4a7c59",
                                fontWeight: 500,
                              }}
                            >
                              {formatCurrency(payout.payout_amount)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            background:
                              payout.payout_status === "paid"
                                ? "#4a7c5922"
                                : "#f0f4f1",
                            color:
                              payout.payout_status === "paid"
                                ? "#4a7c59"
                                : "#4a5a52",
                          }}
                        >
                          {payout.payout_status === "paid"
                            ? "✓ Paid"
                            : "Pending"}
                        </span>
                        {payout.payout_status !== "paid" && (
                          <button
                            onClick={() => markPaid(payout.brand_email)}
                            style={{
                              padding: "5px 12px",
                              background: "#4a7c59",
                              color: "#fff",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "0.78rem",
                              cursor: "pointer",
                            }}
                          >
                            Mark paid
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setSelectedBrand(
                              selectedBrand === payout.brand_email
                                ? null
                                : payout.brand_email,
                            )
                          }
                          style={{
                            padding: "5px 12px",
                            background: "transparent",
                            border: "1px solid #e4ebe6",
                            borderRadius: "8px",
                            fontSize: "0.78rem",
                            cursor: "pointer",
                            color: "#4a5a52",
                          }}
                        >
                          {selectedBrand === payout.brand_email
                            ? "Hide"
                            : "View sales"}
                        </button>
                      </div>
                    </div>

                    {/* Report upload */}
                    <div
                      style={{
                        padding: "10px 16px",
                        borderTop: "1px solid #f0f4f1",
                        background: "#fafaf8",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column" as const,
                          gap: "3px",
                        }}
                      >
                        {report ? (
                          <>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#4a7c59",
                                }}
                              >
                                ✓ Report ready
                              </span>
                              <a
                                href={report.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#4a5a52",
                                  textDecoration: "underline",
                                }}
                              >
                                View
                              </a>
                            </div>
                            {report.payment_confirmed ? (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#1B3A2D",
                                }}
                              >
                                💳 {report.payment_method} ·{" "}
                                <strong>{report.payment_details}</strong>
                              </div>
                            ) : (
                              <div
                                style={{
                                  fontSize: "0.72rem",
                                  color: "#b87333",
                                }}
                              >
                                ⏳ Awaiting payment details from brand
                              </div>
                            )}
                          </>
                        ) : (
                          <div
                            style={{ fontSize: "0.72rem", color: "#4a5a52" }}
                          >
                            No report uploaded
                          </div>
                        )}
                      </div>
                      <label
                        style={{
                          padding: "5px 12px",
                          background: report ? "transparent" : "#1B3A2D",
                          color: report ? "#4a5a52" : "#fff",
                          border: report ? "1px solid #e4ebe6" : "none",
                          borderRadius: "8px",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        {uploadingReport === payout.brand_email
                          ? "Uploading..."
                          : report
                            ? "↑ Replace"
                            : "↑ Upload report"}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f)
                              uploadReport(
                                payout.brand_email,
                                payout.brand_name,
                                f,
                              );
                          }}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>

                    {/* Brand sales breakdown */}
                    {selectedBrand === payout.brand_email && (
                      <div
                        role="region"
                        aria-label={`${payout.brand_name} sales`}
                        tabIndex={0}
                        style={{
                          borderTop: "1px solid #f0f4f1",
                          overflowX: "auto",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(0, 2fr) repeat(3, minmax(0, 1fr))",
                            minWidth: "500px",
                            padding: "8px 16px",
                            background: "#f8faf8",
                            fontSize: "0.68rem",
                            color: "#4a5a52",
                            letterSpacing: "0.08em",
                          }}
                        >
                          <div>PRODUCT</div>
                          <div>VARIATION</div>
                          <div>QTY</div>
                          <div>REVENUE</div>
                        </div>
                        {brandSales.length === 0 ? (
                          <div
                            style={{
                              padding: "1rem",
                              fontSize: "0.82rem",
                              color: "#4a5a52",
                            }}
                          >
                            No sales recorded yet.
                          </div>
                        ) : (
                          brandSales.map((sale) => (
                            <div
                              key={sale.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "minmax(0, 2fr) repeat(3, minmax(0, 1fr))",
                                minWidth: "500px",
                                padding: "10px 16px",
                                borderTop: "1px solid #f5f2ee",
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#1c1714",
                                }}
                              >
                                {sale.product_name}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  color: "#4a5a52",
                                }}
                              >
                                {sale.variation_name || "—"}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#1c1714",
                                }}
                              >
                                {sale.quantity_sold}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.85rem",
                                  color: "#4a7c59",
                                }}
                              >
                                {formatCurrency(Number(sale.total_revenue))}
                              </div>
                            </div>
                          ))
                        )}
                        <div
                          style={{
                            padding: "10px 16px",
                            borderTop: "1px solid #f0f4f1",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span
                            style={{ fontSize: "0.78rem", color: "#4a5a52" }}
                          >
                            {brandSales.length} line items
                          </span>
                          <span
                            style={{ fontSize: "0.85rem", color: "#1c1714" }}
                          >
                            Total:{" "}
                            {formatCurrency(
                              brandSales.reduce(
                                (s, sale) => s + Number(sale.total_revenue),
                                0,
                              ),
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </LoadingView>
      </div>
    </div>
  );
}
