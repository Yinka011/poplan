"use client";
import { useOrganizer } from "@/context/OrganizerContext";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import PaymentTrackerSkeleton from "@/components/dashboard/PaymentTrackerSkeleton";
import { Loader2Icon } from "lucide-react";

type Brand = {
  id: number;
  name: string;
  email: string;
  fee_owed: number;
  amount_paid: number;
  balance: number;
  status: string;
  invited: boolean;
};

const PencilIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

export default function PaymentTracker({ event }: { event: string }) {
  const { organizerEmail, loading: organizerLoading } = useOrganizer();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState<{
    event: string;
    email: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const fetchBrandsRef = useRef<(() => Promise<void>) | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [newFee, setNewFee] = useState("");
  const [adding, setAdding] = useState(false);
  const [addingBrand, setAddingBrand] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [inviting, setInviting] = useState<number | null>(null);
  const [newBrand, setNewBrand] = useState({
    name: "",
    email: "",
    fee_owed: "400",
    amount_paid: "0",
  });

  useEffect(() => {
    if (organizerLoading) return;
    let active = true;
    let latestRequest = 0;
    setLoading(true);
    setLoadError("");

    const fetchBrands = async () => {
      const request = ++latestRequest;
      try {
        if (!organizerEmail)
          throw new Error("Please sign in to view payments.");
        const { data, error } = await supabase
          .from("brands")
          .select("*")
          .eq("event", event)
          .eq("organizer_email", organizerEmail);
        if (error) throw error;
        if (active && request === latestRequest) {
          setBrands(data || []);
          setLoadError("");
        }
      } catch (error) {
        console.error("Failed to load payment tracker:", error);
        if (active && request === latestRequest) {
          setLoadError("Could not load payments. Please try again.");
        }
      } finally {
        if (active && request === latestRequest) {
          setLoadedFor({ event, email: organizerEmail });
          setLoading(false);
        }
      }
    };

    fetchBrandsRef.current = fetchBrands;
    void fetchBrands();
    const channel = supabase
      .channel("brands-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brands" },
        () => {
          void fetchBrands();
        },
      )
      .subscribe();
    return () => {
      active = false;
      if (fetchBrandsRef.current === fetchBrands) fetchBrandsRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [event, organizerEmail, organizerLoading, retry]);

  const updatePayment = async (brand: Brand) => {
    if (savingPayment) return;
    const paid = Number(newAmount);
    const fee = Number(newFee);
    if (
      !newAmount.trim() ||
      !newFee.trim() ||
      !Number.isFinite(paid) ||
      !Number.isFinite(fee)
    ) {
      alert("Enter valid amounts for the fee and payment.");
      return;
    }
    const balance = fee - paid;
    const status = balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
    setSavingPayment(true);
    try {
      const { error } = await supabase
        .from("brands")
        .update({ amount_paid: paid, fee_owed: fee, balance, status })
        .eq("id", brand.id)
        .select("id")
        .single();
      if (error) throw error;
      setEditing(null);
      setNewAmount("");
      setNewFee("");
      await fetchBrandsRef.current?.();
    } catch (error) {
      console.error("Failed to update payment:", error);
      alert("Could not save the payment. Please try again.");
    } finally {
      setSavingPayment(false);
    }
  };

  const addBrand = async () => {
    if (addingBrand) return;
    if (!newBrand.name.trim()) {
      alert("Enter a brand name.");
      return;
    }
    const fee = Number(newBrand.fee_owed);
    const paid = Number(newBrand.amount_paid);
    if (
      !newBrand.fee_owed.trim() ||
      !newBrand.amount_paid.trim() ||
      !Number.isFinite(fee) ||
      !Number.isFinite(paid)
    ) {
      alert("Enter valid amounts for the fee and payment.");
      return;
    }
    const balance = fee - paid;
    const status = balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
    setAddingBrand(true);
    try {
      const { data, error } = await supabase
        .from("brands")
        .insert({
          organizer_email: organizerEmail,
          name: newBrand.name,
          email: newBrand.email,
          fee_owed: fee,
          amount_paid: paid,
          balance,
          status,
          event: event,
          invited: false,
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("The new brand was not returned.");
      setNewBrand({ name: "", email: "", fee_owed: "400", amount_paid: "0" });
      setAdding(false);
      await fetchBrandsRef.current?.();
    } catch (error) {
      console.error("Failed to add brand:", error);
      alert("Could not add the brand. Please try again.");
    } finally {
      setAddingBrand(false);
    }
  };

  const inviteBrand = async (brand: Brand) => {
    if (!brand.email) {
      alert("Please add an email for this brand first");
      return;
    }
    setInviting(brand.id);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: brand.email }),
    });
    const data = await res.json();
    if (data.error) {
      alert("Could not send invite: " + data.error);
    } else {
      const { error } = await supabase
        .from("brands")
        .update({ invited: true })
        .eq("id", brand.id)
        .select("id")
        .single();
      if (error) {
        console.error("Failed to update invitation status:", error);
        alert("The invitation was sent, but its status could not be saved.");
      } else {
        await fetchBrandsRef.current?.();
        alert(`Invitation sent to ${brand.email}`);
      }
    }
    setInviting(null);
  };

  const deleteBrand = async (id: number) => {
    if (!confirm("Remove this brand?")) return;
    await supabase.from("brands").delete().eq("id", id);
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  const statusColor = (s: string) => {
    if (s === "Paid") return { background: "#4a7c5922", color: "#4a7c59" };
    if (s === "Partial") return { background: "#E8C97A22", color: "#E8C97A" };
    return { background: "#c0392b22", color: "#c0392b" };
  };

  const totalFees = brands.reduce((sum, b) => sum + Number(b.fee_owed), 0);
  const totalReceived = brands.reduce(
    (sum, b) => sum + Number(b.amount_paid),
    0,
  );
  const totalOutstanding = brands.reduce(
    (sum, b) => sum + Math.max(0, Number(b.fee_owed) - Number(b.amount_paid)),
    0,
  );

  const iconBtn = (
    onClick: () => void,
    icon: React.ReactNode,
    title: string,
    danger = false,
    disabled = false,
  ) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        background: "transparent",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: "4px 5px",
        borderRadius: "5px",
        color: danger ? "#E8C97A" : "#E8C97A",
        display: "flex",
        alignItems: "center",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f4f1")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
    </button>
  );

  return (
    <LoadingView
      loading={
        organizerLoading ||
        loading ||
        loadedFor?.event !== event ||
        loadedFor?.email !== organizerEmail
      }
      error={loadError}
      onRetry={() => setRetry((value) => value + 1)}
      customLoader={<PaymentTrackerSkeleton />}
    >
      <div
        className="min-w-0 [overflow-wrap:anywhere]"
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "1.5rem",
          border: "1px solid #e4ebe6",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.1rem",
                color: "#1B3A2D",
              }}
            >
              Payment tracker
            </div>
            <div
              style={{ fontSize: "0.8rem", color: "#4a5a52", marginTop: "2px" }}
            >
              Brand fees for {event} pop-up
            </div>
          </div>
          <button
            onClick={() => setAdding(!adding)}
            disabled={addingBrand}
            style={{
              fontSize: "0.8rem",
              padding: "6px 14px",
              background: "#1B3A2D",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            + Add brand
          </button>
        </div>

        {/* Summary row */}
        <div
          className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
          style={{
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              background: "#f8faf8",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              border: "1px solid #f0f4f1",
            }}
          >
            <div
              style={{
                fontSize: "0.65rem",
                color: "#4a5a52",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              TOTAL FEES
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                color: "#1B3A2D",
              }}
            >
              {formatCurrency(totalFees)}
            </div>
          </div>
          <div
            style={{
              background: "#f8faf8",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              border: "1px solid #f0f4f1",
            }}
          >
            <div
              style={{
                fontSize: "0.65rem",
                color: "#4a5a52",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              RECEIVED
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                color: "#4a7c59",
              }}
            >
              {formatCurrency(totalReceived)}
            </div>
          </div>
          <div
            style={{
              background: "#f8faf8",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              border: "1px solid #f0f4f1",
            }}
          >
            <div
              style={{
                fontSize: "0.65rem",
                color: "#4a5a52",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              OUTSTANDING
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                color: totalOutstanding > 0 ? "#c0392b" : "#4a7c59",
              }}
            >
              {formatCurrency(totalOutstanding)}
            </div>
          </div>
        </div>

        {adding && (
          <div
            style={{
              background: "#f8faf8",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "1rem",
              border: "1px solid #e4ebe6",
            }}
          >
            <div
              style={{
                fontSize: "0.85rem",
                color: "#1B3A2D",
                marginBottom: "8px",
              }}
            >
              Add new brand
            </div>
            <input
              placeholder="Brand name"
              disabled={addingBrand}
              value={newBrand.name}
              onChange={(e) =>
                setNewBrand({ ...newBrand, name: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #e4ebe6",
                borderRadius: "8px",
                fontSize: "0.85rem",

                marginBottom: "8px",
                boxSizing: "border-box" as const,
              }}
            />
            <input
              placeholder="Brand email"
              disabled={addingBrand}
              value={newBrand.email}
              onChange={(e) =>
                setNewBrand({ ...newBrand, email: e.target.value })
              }
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #e4ebe6",
                borderRadius: "8px",
                fontSize: "0.85rem",

                marginBottom: "8px",
                boxSizing: "border-box" as const,
              }}
            />
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 [&>*]:min-w-0"
              style={{
                marginBottom: "8px",
              }}
            >
              <input
                placeholder="Fee owed"
                disabled={addingBrand}
                value={newBrand.fee_owed}
                onChange={(e) =>
                  setNewBrand({ ...newBrand, fee_owed: e.target.value })
                }
                style={{
                  padding: "8px",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                }}
              />
              <input
                placeholder="Amount paid"
                disabled={addingBrand}
                value={newBrand.amount_paid}
                onChange={(e) =>
                  setNewBrand({ ...newBrand, amount_paid: e.target.value })
                }
                style={{
                  padding: "8px",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={addBrand}
                disabled={addingBrand}
                style={{
                  padding: "7px 16px",
                  background: "#1B3A2D",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                {addingBrand ? (
                  <Loader2Icon className="animate-spin size-5" />
                ) : (
                  "Save"
                )}
              </button>
              <button
                onClick={() => setAdding(false)}
                disabled={addingBrand}
                style={{
                  padding: "7px 16px",
                  background: "transparent",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto" role="region" aria-label="Brand payments" tabIndex={0}>
        <table
          style={{
            width: "100%",
            minWidth: "700px",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #e4ebe6" }}>
              {[
                "Brand",
                "Fee Owed",
                "Amount Paid",
                "Balance",
                "Status",
                "Portal",
                "",
              ].map((h, i) => (
                <th
                  key={i}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    fontSize: "11px",
                    color: "#4a5a52",
                    fontWeight: 400,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brands.map((brand) => (
              <tr key={brand.id} style={{ borderBottom: "1px solid #f0f4f1" }}>
                <td
                  style={{
                    padding: "10px",
                    fontWeight: 500,
                  }}
                >
                  <a
                    href={`/organizer/events/atlanta/brands/${encodeURIComponent(
                      brand.name,
                    )}`}
                    style={{
                      color: "#E8C97A",
                      textDecoration: "none",
                      borderBottom: "1px solid #E8C97A44",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#1B3A2D")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#E8C97A")
                    }
                  >
                    {brand.name}
                  </a>
                </td>
                <td style={{ padding: "10px", color: "#1B3A2D" }}>
                  {editing === brand.id ? (
                    <input
                      type="number"
                      disabled={savingPayment}
                      value={newFee}
                      onChange={(e) => setNewFee(e.target.value)}
                      style={{
                        width: "70px",
                        padding: "4px",
                        border: "1px solid #E8C97A",
                        borderRadius: "4px",
                        fontSize: "13px",
                      }}
                      autoFocus
                    />
                  ) : (
                    <span>{formatCurrency(Number(brand.fee_owed))}</span>
                  )}
                </td>
                <td style={{ padding: "10px" }}>
                  {editing === brand.id ? (
                    <input
                      type="number"
                      disabled={savingPayment}
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      style={{
                        width: "70px",
                        padding: "4px",
                        border: "1px solid #E8C97A",
                        borderRadius: "4px",
                        fontSize: "13px",
                      }}
                    />
                  ) : (
                    <span style={{ color: "#1B3A2D" }}>
                      {formatCurrency(Number(brand.amount_paid))}
                    </span>
                  )}
                </td>
                <td
                  style={{
                    padding: "10px",
                    fontWeight: 500,
                    color:
                      Number(brand.fee_owed) - Number(brand.amount_paid) > 0
                        ? "#c0392b"
                        : "#4a7c59",
                  }}
                >
                  {formatCurrency(
                    Math.max(
                      0,
                      Number(brand.fee_owed) - Number(brand.amount_paid),
                    ),
                  )}
                </td>
                <td style={{ padding: "10px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "20px",
                      ...statusColor(brand.status),
                    }}
                  >
                    {brand.status}
                  </span>
                </td>
                <td style={{ padding: "10px" }}>
                  {brand.email ? (
                    brand.invited ? (
                      <span
                        style={{
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background: "#4a7c5922",
                          color: "#4a7c59",
                        }}
                      >
                        ✓ Invited
                      </span>
                    ) : (
                      <button
                        onClick={() => inviteBrand(brand)}
                        disabled={inviting === brand.id}
                        style={{
                          fontSize: "11px",
                          padding: "3px 10px",
                          background: "#E8C97A22",
                          color: "#E8C97A",
                          border: "1px solid #E8C97A44",
                          borderRadius: "20px",
                          cursor: "pointer",
                        }}
                      >
                        {inviting === brand.id ? "..." : "✉"}
                      </button>
                    )
                  ) : (
                    <span style={{ fontSize: "11px", color: "#d4c5b0" }}>
                      No email
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px" }}>
                  {editing === brand.id ? (
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        onClick={() => updatePayment(brand)}
                        disabled={savingPayment}
                        style={{
                          fontSize: "11px",
                          padding: "4px 10px",
                          background: "#1B3A2D",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        {savingPayment ? (
                          <Loader2Icon className="animate-spin size-4" />
                        ) : (
                          "Save"
                        )}
                      </button>
                      <button
                        onClick={() => setEditing(null)}
                        disabled={savingPayment}
                        style={{
                          fontSize: "11px",
                          padding: "4px 10px",
                          background: "transparent",
                          border: "1px solid #e4ebe6",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "2px" }}>
                      {iconBtn(
                        () => {
                          setEditing(brand.id);
                          setNewAmount(String(brand.amount_paid));
                          setNewFee(String(brand.fee_owed));
                        },
                        <PencilIcon />,
                        "Edit payment",
                        false,
                        savingPayment,
                      )}
                      {iconBtn(
                        () => deleteBrand(brand.id),
                        <TrashIcon />,
                        "Remove brand",
                        true,
                        savingPayment,
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </LoadingView>
  );
}
