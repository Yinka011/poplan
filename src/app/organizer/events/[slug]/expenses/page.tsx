"use client";
import { useOrganizer } from "@/context/OrganizerContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency, formatEventName } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import Link from "next/link";
import { useParams } from "next/navigation";
import ExpensesSkeleton from "./ExpensesSkeleton";

type Expense = {
  id: number;
  category: string;
  item: string;
  cost: number;
  deposit: number;
  balance: number;
  notes: string;
};

const MANUAL_CATEGORIES = [
  "Venue",
  "Marketing",
  "Ads",
  "Operations",
  "Logistics",
];

const categoryColors: Record<string, string> = {
  Venue: "#E8C97A",
  Marketing: "#4a7c59",
  Ads: "#5b7fa6",
  Operations: "#8b6ab0",
  Logistics: "#a0522d",
};

export default function ExpensesPage() {
  const { organizerEmail, loading: organizerLoading } = useOrganizer();
  const { slug } = useParams<{ slug: string }>();
  const fallbackEventName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const [eventName, setEventName] = useState(fallbackEventName);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [decorTotal, setDecorTotal] = useState(0);
  const [refreshTotal, setRefreshTotal] = useState(0);
  const [staffTotal, setStaffTotal] = useState(0);
  const [budget, setBudget] = useState(8000);
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState("8000");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    item: "",
    cost: "",
    deposit: "",
    notes: "",
  });
  const [newExpense, setNewExpense] = useState({
    category: "Venue",
    item: "",
    cost: "",
    deposit: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [retry, setRetry] = useState(0);
  const [savingNew, setSavingNew] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const loadKey = `${slug}:${organizerEmail}`;

  useEffect(() => {
    if (organizerLoading) return;
    let active = true;
    const fetchAll = async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (!organizerEmail)
          throw new Error("Please sign in to view expenses.");
        const [expRes, decorRes, refreshRes, staffRes, settingsRes, eventRes] =
          await Promise.all([
            supabase
              .from("expenses")
              .select("*")
              .eq("event", formatEventName(slug))
              .eq("organizer_email", organizerEmail)
              .order("category"),
            supabase
              .from("planning_decor")
              .select("cost")
              .eq("event", formatEventName(slug))
              .eq("organizer_email", organizerEmail),
            supabase
              .from("planning_refreshments")
              .select("cost")
              .eq("event", formatEventName(slug))
              .eq("organizer_email", organizerEmail),
            supabase
              .from("planning_staff")
              .select("pay_rate")
              .eq("event", formatEventName(slug))
              .eq("organizer_email", organizerEmail),
            supabase
              .from("event_settings")
              .select("budget")
              .eq("event", formatEventName(slug))
              .eq("organizer_email", organizerEmail)
              .maybeSingle(),
            supabase
              .from("events")
              .select("name, city")
              .eq("slug", slug)
              .maybeSingle(),
          ]);
        const error =
          expRes.error ||
          decorRes.error ||
          refreshRes.error ||
          staffRes.error ||
          settingsRes.error ||
          eventRes.error;
        if (error) throw error;
        if (!active) return;
        setExpenses(expRes.data ?? []);
        setDecorTotal(
          (decorRes.data ?? []).reduce((s, x) => s + Number(x.cost), 0),
        );
        setRefreshTotal(
          (refreshRes.data ?? []).reduce((s, x) => s + Number(x.cost), 0),
        );
        setStaffTotal(
          (staffRes.data ?? []).reduce((s, x) => s + Number(x.pay_rate), 0),
        );
        const savedBudget =
          settingsRes.data?.budget == null
            ? 0
            : Number(settingsRes.data.budget);
        setBudget(savedBudget);
        setNewBudget(String(savedBudget));
        setEventName(
          eventRes.data?.name || eventRes.data?.city || fallbackEventName,
        );
        setLoadedFor(loadKey);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load expenses:", error);
        setLoadError(
          error instanceof Error &&
            error.message === "Please sign in to view expenses."
            ? error.message
            : "Could not load expenses. Please try again.",
        );
        setLoadedFor(loadKey);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchAll();
    return () => {
      active = false;
    };
  }, [slug, loadKey, organizerEmail, organizerLoading, retry, fallbackEventName]);

  const saveBudget = async () => {
    if (savingBudget) return;
    const value = Number(newBudget);
    if (!newBudget.trim() || !Number.isFinite(value) || value < 0) {
      alert("Enter a valid budget.");
      return;
    }
    setSavingBudget(true);
    try {
      const { error } = await supabase
        .from("event_settings")
        .upsert(
          {
            event: formatEventName(slug),
            organizer_email: organizerEmail,
            budget: value,
          },
          { onConflict: "event,organizer_email" },
        );
      if (error) throw error;
      setBudget(value);
      setEditingBudget(false);
    } catch (error) {
      console.error("Failed to save budget:", error);
      alert("Could not save budget. Please try again.");
    } finally {
      setSavingBudget(false);
    }
  };

  const addExpense = async () => {
    if (savingNew) return;
    const cost = Number(newExpense.cost);
    const deposit = Number(newExpense.deposit);
    if (
      !newExpense.item.trim() ||
      !Number.isFinite(cost) ||
      cost < 0 ||
      !Number.isFinite(deposit) ||
      deposit < 0
    ) {
      alert("Enter an item and valid non-negative amounts.");
      return;
    }
    setSavingNew(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          organizer_email: organizerEmail,
          category: newExpense.category,
          item: newExpense.item,
          cost,
          deposit,
          notes: newExpense.notes,
          event: formatEventName(slug),
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("The saved expense was not returned.");
      setExpenses((prev) => [...prev, data]);
      setNewExpense({
        category: "Venue",
        item: "",
        cost: "",
        deposit: "",
        notes: "",
      });
      setAdding(false);
    } catch (error) {
      console.error("Failed to add expense:", error);
      alert("Could not add expense. Please try again.");
    } finally {
      setSavingNew(false);
    }
  };

  const saveEdit = async (id: number) => {
    if (savingEdit) return;
    const cost = Number(editData.cost);
    const deposit = Number(editData.deposit);
    if (
      !editData.item.trim() ||
      !Number.isFinite(cost) ||
      cost < 0 ||
      !Number.isFinite(deposit) ||
      deposit < 0
    ) {
      alert("Enter an item and valid non-negative amounts.");
      return;
    }
    const balance = cost - deposit;
    setSavingEdit(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .update({ item: editData.item, cost, deposit, notes: editData.notes })
        .eq("id", id)
        .eq("event", formatEventName(slug))
        .eq("organizer_email", organizerEmail)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("The updated expense was not returned.");
      setExpenses((prev) => prev.map((e) => (e.id === id ? data : e)));
      setEditing(null);
    } catch (error) {
      console.error("Failed to update expense:", error);
      alert("Could not save expense. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Remove this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const manualTotal = expenses.reduce((s, e) => s + Number(e.cost), 0);
  const planningTotal = decorTotal + refreshTotal + staffTotal;
  const totalCost = manualTotal + planningTotal;
  const totalDeposit = expenses.reduce((s, e) => s + Number(e.deposit), 0);
  const totalOutstanding = expenses.reduce((s, e) => s + Number(e.balance), 0);
  const remaining = budget - totalCost;

  const grouped = MANUAL_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = expenses.filter((e) => e.category === cat);
      return acc;
    },
    {} as Record<string, Expense[]>,
  );

  return (
    <div
      className="[overflow-wrap:anywhere]"
      style={{
        minHeight: "100vh",
        background: "#f8faf8",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <LoadingView
          loading={organizerLoading || loading || loadedFor !== loadKey}
          error={loadError}
          onRetry={() => setRetry((value) => value + 1)}
          customLoader={<ExpensesSkeleton />}
        >
          <div style={{ marginBottom: "1.5rem" }}>
            <Link
              href={`/organizer/events/${slug}`}
              style={{
                fontSize: "0.85rem",
                color: "#4a5a52",
                textDecoration: "none",
              }}
            >
              ← Back to {eventName}
            </Link>
            <h1
              style={{
                fontSize: "1.8rem",
                color: "#1B3A2D",
                fontWeight: "normal",
                marginTop: "0.5rem",
              }}
            >
              Expenses
            </h1>
            <p style={{ color: "#4a5a52", fontSize: "0.9rem" }}>
              Track every cost for {eventName} Pop-up
            </p>
          </div>

          {/* Summary tiles */}
          <div
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
            style={{
              marginBottom: "1.5rem",
            }}
          >
            {[
              {
                label: "BUDGET",
                value: formatCurrency(budget),
                color: "#1B3A2D",
                clickable: true,
              },
              {
                label: "TOTAL COST",
                value: formatCurrency(totalCost),
                color: "#1B3A2D",
                clickable: false,
              },
              {
                label: "TOTAL DEPOSITED",
                value: formatCurrency(totalDeposit),
                color: "#4a7c59",
                clickable: false,
              },
              {
                label: "OUTSTANDING",
                value: formatCurrency(totalOutstanding),
                color: "#c0392b",
                clickable: false,
              },
            ].map((card, i) => (
              <div
                key={i}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                  border: "1px solid #e4ebe6",
                  cursor: card.clickable ? "pointer" : "default",
                }}
                onClick={() =>
                  card.clickable && !editingBudget && setEditingBudget(true)
                }
              >
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#4a5a52",
                    marginBottom: "4px",
                  }}
                >
                  {card.label}{" "}
                  {card.clickable && (
                    <span style={{ color: "#E8C97A" }}>✎</span>
                  )}
                </div>
                {editingBudget && card.clickable ? (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      disabled={savingBudget}
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                      style={{
                        width: "80px",
                        padding: "4px",
                        border: "1px solid #E8C97A",
                        borderRadius: "4px",
                        fontSize: "13px",
                      }}
                      autoFocus
                    />
                    <button
                      disabled={savingBudget}
                      onClick={saveBudget}
                      style={{
                        padding: "3px 8px",
                        background: "#1B3A2D",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        fontSize: "11px",
                        cursor: "pointer",
                      }}
                    >
                      {savingBudget ? "Saving..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: "1.3rem", color: card.color }}>
                    {card.value}
                  </div>
                )}
                {card.label === "BUDGET" && !editingBudget && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: remaining >= 0 ? "#4a7c59" : "#c0392b",
                      marginTop: "2px",
                    }}
                  >
                    {remaining >= 0
                      ? `${formatCurrency(remaining)} remaining`
                      : `${formatCurrency(Math.abs(remaining))} over budget`}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Planning Hub auto totals */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1.25rem",
              marginBottom: "1rem",
              border: "1px solid #e4ebe6",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                color: "#4a5a52",
                letterSpacing: "0.08em",
                marginBottom: "0.75rem",
              }}
            >
              FROM PLANNING HUB
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                { label: "Decor", value: decorTotal, color: "#c49a3c" },
                {
                  label: "Refreshments",
                  value: refreshTotal,
                  color: "#4a7c59",
                },
                { label: "Staffing", value: staffTotal, color: "#5b7fa6" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "#f8faf8",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    border: "1px solid #f0f4f1",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: item.color,
                      }}
                    />
                    <div style={{ fontSize: "0.8rem", color: "#4a5a52" }}>
                      {item.label}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "1.1rem",
                      color: item.color,
                      fontWeight: 500,
                    }}
                  >
                    {formatCurrency(item.value)}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: "10px",
                paddingTop: "10px",
                borderTop: "1px solid #f0f4f1",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "#4a5a52" }}>
                Planning Hub subtotal
              </div>
              <div
                style={{ fontSize: "1rem", color: "#1B3A2D", fontWeight: 500 }}
              >
                {formatCurrency(planningTotal)}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: "1rem",
            }}
          >
            <button
              disabled={savingNew}
              onClick={() => setAdding(!adding)}
              style={{
                padding: "8px 16px",
                background: "#1B3A2D",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              + Add expense
            </button>
          </div>

          {adding && (
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.25rem",
                marginBottom: "1rem",
                border: "1px solid #e4ebe6",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#1B3A2D",
                  marginBottom: "1rem",
                }}
              >
                New expense
              </div>
              <div
                className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_2fr_1fr_1fr] [&>*]:min-w-0"
                style={{
                  marginBottom: "8px",
                }}
              >
                <select
                  disabled={savingNew}
                  value={newExpense.category}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, category: e.target.value })
                  }
                  style={{
                    padding: "8px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                >
                  {MANUAL_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  disabled={savingNew}
                  placeholder="Item description"
                  value={newExpense.item}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, item: e.target.value })
                  }
                  style={{
                    padding: "8px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  disabled={savingNew}
                  placeholder="Total cost"
                  value={newExpense.cost}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, cost: e.target.value })
                  }
                  style={{
                    padding: "8px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
                <input
                  disabled={savingNew}
                  placeholder="Deposit paid"
                  value={newExpense.deposit}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, deposit: e.target.value })
                  }
                  style={{
                    padding: "8px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                />
              </div>
              <input
                disabled={savingNew}
                placeholder="Notes"
                value={newExpense.notes}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, notes: e.target.value })
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
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  disabled={savingNew}
                  onClick={addExpense}
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
                  {savingNew ? "Saving..." : "Save"}
                </button>
                <button
                  disabled={savingNew}
                  onClick={() => setAdding(false)}
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

          {MANUAL_CATEGORIES.map((cat) => {
            const items = grouped[cat];
            if (!items || items.length === 0) return null;
            const catTotal = items.reduce((s, e) => s + Number(e.cost), 0);
            const catDeposit = items.reduce((s, e) => s + Number(e.deposit), 0);
            const catBalance = items.reduce((s, e) => s + Number(e.balance), 0);
            return (
              <div
                key={cat}
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  marginBottom: "1rem",
                  border: "1px solid #e4ebe6",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: categoryColors[cat] || "#E8C97A",
                    }}
                  />
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#1B3A2D",
                    }}
                  >
                    {cat}
                  </div>
                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: "0.8rem",
                      color: "#4a5a52",
                    }}
                  >
                    Total:{" "}
                    <strong style={{ color: "#1B3A2D" }}>
                      {formatCurrency(catTotal)}
                    </strong>{" "}
                    · Deposited:{" "}
                    <strong style={{ color: "#4a7c59" }}>
                      {formatCurrency(catDeposit)}
                    </strong>{" "}
                    · Owed:{" "}
                    <strong style={{ color: "#c0392b" }}>
                      {formatCurrency(catBalance)}
                    </strong>
                  </div>
                </div>
                <div
                  className="overflow-x-auto"
                  role="region"
                  aria-label={`${cat} expenses`}
                  tabIndex={0}
                >
                  <table
                    style={{
                      width: "100%",
                      minWidth: "700px",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr style={{ borderBottom: "1px solid #f0f4f1" }}>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            fontSize: "11px",
                            color: "#4a5a52",
                            fontWeight: 400,
                          }}
                        >
                          Item
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            fontSize: "11px",
                            color: "#4a5a52",
                            fontWeight: 400,
                          }}
                        >
                          Cost
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            fontSize: "11px",
                            color: "#4a5a52",
                            fontWeight: 400,
                          }}
                        >
                          Deposit
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            fontSize: "11px",
                            color: "#4a5a52",
                            fontWeight: 400,
                          }}
                        >
                          Balance
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "6px 8px",
                            fontSize: "11px",
                            color: "#4a5a52",
                            fontWeight: 400,
                          }}
                        >
                          Notes
                        </th>
                        <th style={{ padding: "6px 8px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((exp) => (
                        <tr
                          key={exp.id}
                          style={{ borderBottom: "1px solid #f8f5f0" }}
                        >
                          <td style={{ padding: "10px 8px", color: "#1B3A2D" }}>
                            {editing === exp.id ? (
                              <input
                                disabled={savingEdit}
                                value={editData.item}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    item: e.target.value,
                                  })
                                }
                                style={{
                                  padding: "4px",
                                  border: "1px solid #E8C97A",
                                  borderRadius: "4px",
                                  fontSize: "13px",
                                  width: "150px",
                                }}
                              />
                            ) : (
                              exp.item
                            )}
                          </td>
                          <td style={{ padding: "10px 8px", color: "#1B3A2D" }}>
                            {editing === exp.id ? (
                              <input
                                disabled={savingEdit}
                                value={editData.cost}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    cost: e.target.value,
                                  })
                                }
                                style={{
                                  padding: "4px",
                                  border: "1px solid #E8C97A",
                                  borderRadius: "4px",
                                  fontSize: "13px",
                                  width: "70px",
                                }}
                              />
                            ) : (
                              formatCurrency(Number(exp.cost))
                            )}
                          </td>
                          <td style={{ padding: "10px 8px", color: "#4a7c59" }}>
                            {editing === exp.id ? (
                              <input
                                disabled={savingEdit}
                                value={editData.deposit}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    deposit: e.target.value,
                                  })
                                }
                                style={{
                                  padding: "4px",
                                  border: "1px solid #E8C97A",
                                  borderRadius: "4px",
                                  fontSize: "13px",
                                  width: "70px",
                                }}
                              />
                            ) : (
                              formatCurrency(Number(exp.deposit))
                            )}
                          </td>
                          <td
                            style={{
                              padding: "10px 8px",
                              color:
                                Number(exp.balance) > 0 ? "#c0392b" : "#4a7c59",
                              fontWeight: 500,
                            }}
                          >
                            {formatCurrency(Number(exp.balance))}
                          </td>
                          <td
                            style={{
                              padding: "10px 8px",
                              color: "#4a5a52",
                              fontSize: "12px",
                            }}
                          >
                            {editing === exp.id ? (
                              <input
                                disabled={savingEdit}
                                value={editData.notes}
                                onChange={(e) =>
                                  setEditData({
                                    ...editData,
                                    notes: e.target.value,
                                  })
                                }
                                style={{
                                  padding: "4px",
                                  border: "1px solid #E8C97A",
                                  borderRadius: "4px",
                                  fontSize: "13px",
                                  width: "120px",
                                }}
                              />
                            ) : (
                              exp.notes
                            )}
                          </td>
                          <td style={{ padding: "10px 8px" }}>
                            {editing === exp.id ? (
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  disabled={savingEdit}
                                  onClick={() => saveEdit(exp.id)}
                                  style={{
                                    fontSize: "11px",
                                    padding: "3px 8px",
                                    background: "#1B3A2D",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                  }}
                                >
                                  {savingEdit ? "Saving..." : "Save"}
                                </button>
                                <button
                                  disabled={savingEdit}
                                  onClick={() => setEditing(null)}
                                  style={{
                                    fontSize: "11px",
                                    padding: "3px 8px",
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
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  disabled={savingEdit}
                                  onClick={() => {
                                    setEditing(exp.id);
                                    setEditData({
                                      item: exp.item,
                                      cost: String(exp.cost),
                                      deposit: String(exp.deposit),
                                      notes: exp.notes || "",
                                    });
                                  }}
                                  title="Edit"
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#4a5a52",
                                    fontSize: "14px",
                                    padding: "2px 4px",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.color = "#1B3A2D")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.color = "#4a5a52")
                                  }
                                >
                                  ✎
                                </button>
                                <button
                                  onClick={() => deleteExpense(exp.id)}
                                  title="Remove"
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#d4c5b0",
                                    fontSize: "12px",
                                    padding: "2px 4px",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.color = "#c0392b")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.color = "#d4c5b0")
                                  }
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Grand total */}
          <div
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
            style={{
              background: "#1B3A2D",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              color: "#fff",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#d4c87a",
                  marginBottom: "4px",
                }}
              >
                PLANNING HUB
              </div>
              <div style={{ fontSize: "1.1rem" }}>
                {formatCurrency(planningTotal)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#d4c87a",
                  marginBottom: "4px",
                }}
              >
                OTHER EXPENSES
              </div>
              <div style={{ fontSize: "1.1rem" }}>
                {formatCurrency(manualTotal)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#d4c87a",
                  marginBottom: "4px",
                }}
              >
                TOTAL DEPOSITED
              </div>
              <div style={{ fontSize: "1.1rem", color: "#90c9a0" }}>
                {formatCurrency(totalDeposit)}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#d4c87a",
                  marginBottom: "4px",
                }}
              >
                GRAND TOTAL
              </div>
              <div style={{ fontSize: "1.3rem", color: "#e8c97a" }}>
                {formatCurrency(totalCost)}
              </div>
            </div>
          </div>
        </LoadingView>
      </div>
    </div>
  );
}
