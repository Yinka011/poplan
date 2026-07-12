/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Expense = {
  id: number;
  category: string;
  item: string;
  cost: number;
  deposit: number;
  balance: number;
  notes: string;
};

const MANUAL_CATEGORIES = ["Venue", "Marketing", "Ads", "Operations", "Logistics"];

const categoryColors: Record<string, string> = {
  Venue: "#b87333",
  Marketing: "#4a7c59",
  Ads: "#5b7fa6",
  Operations: "#8b6ab0",
  Logistics: "#a0522d",
};

export default function ExpensesPage({ params }: { params: any }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [decorTotal, setDecorTotal] = useState(0);
  const [refreshTotal, setRefreshTotal] = useState(0);
  const [staffTotal, setStaffTotal] = useState(0);
  const [budget, setBudget] = useState(8000);
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState("8000");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});
  const [newExpense, setNewExpense] = useState({ category: "Venue", item: "", cost: "", deposit: "", notes: "" });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [expRes, decorRes, refreshRes, staffRes] = await Promise.all([
      supabase.from("expenses").select("*").eq("event", "Atlanta").order("category"),
      supabase.from("planning_decor").select("cost").eq("event", "Atlanta"),
      supabase.from("planning_refreshments").select("cost").eq("event", "Atlanta"),
      supabase.from("planning_staff").select("pay_rate").eq("event", "Atlanta"),
    ]);
    if (expRes.data) setExpenses(expRes.data);
    if (decorRes.data) setDecorTotal(decorRes.data.reduce((s, x) => s + Number(x.cost), 0));
    if (refreshRes.data) setRefreshTotal(refreshRes.data.reduce((s, x) => s + Number(x.cost), 0));
    if (staffRes.data) setStaffTotal(staffRes.data.reduce((s, x) => s + Number(x.pay_rate), 0));
  };

  const addExpense = async () => {
    if (!newExpense.item.trim()) return;
    const cost = parseFloat(newExpense.cost) || 0;
    const deposit = parseFloat(newExpense.deposit) || 0;
    const { data } = await supabase.from("expenses").insert({
      category: newExpense.category,
      item: newExpense.item,
      cost,
      deposit,
      balance: cost - deposit,
      notes: newExpense.notes,
      event: "Atlanta"
    }).select().single();
    if (data) setExpenses(prev => [...prev, data]);
    setNewExpense({ category: "Venue", item: "", cost: "", deposit: "", notes: "" });
    setAdding(false);
  };

  const saveEdit = async (id: number) => {
    const cost = Number(editData.cost) || 0;
    const deposit = Number(editData.deposit) || 0;
    const balance = cost - deposit;
    await supabase.from("expenses").update({ item: editData.item, cost, deposit, balance, notes: editData.notes }).eq("id", id);
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, item: editData.item || "", cost, deposit, balance, notes: editData.notes || "" } : e));
    setEditing(null);
  };

  const deleteExpense = async (id: number) => {
    if (!confirm("Remove this expense?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const manualTotal = expenses.reduce((s, e) => s + Number(e.cost), 0);
  const planningTotal = decorTotal + refreshTotal + staffTotal;
  const totalCost = manualTotal + planningTotal;
  const totalDeposit = expenses.reduce((s, e) => s + Number(e.deposit), 0);
  const totalOutstanding = expenses.reduce((s, e) => s + Number(e.balance), 0);
  const remaining = budget - totalCost;

  const grouped = MANUAL_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter(e => e.category === cat);
    return acc;
  }, {} as Record<string, Expense[]>);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/login/organizer/events/atlanta" style={{ fontSize: "0.85rem", color: "#8b7355", textDecoration: "none" }}>← Back to Atlanta</Link>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", marginTop: "0.5rem" }}>Expenses</h1>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Track every cost for Atlanta Pop-up</p>
        </div>

        {/* Summary tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "1.5rem" }}>
          {[
            { label: "BUDGET", value: `$${budget.toLocaleString()}`, color: "#2c1810", clickable: true },
            { label: "TOTAL COST", value: `$${totalCost.toFixed(2)}`, color: "#2c1810", clickable: false },
            { label: "TOTAL DEPOSITED", value: `$${totalDeposit.toFixed(2)}`, color: "#4a7c59", clickable: false },
            { label: "OUTSTANDING", value: `$${totalOutstanding.toFixed(2)}`, color: "#c0392b", clickable: false },
          ].map((card, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5", cursor: card.clickable ? "pointer" : "default" }} onClick={() => card.clickable && setEditingBudget(true)}>
              <div style={{ fontSize: "0.7rem", color: "#8b7355", marginBottom: "4px" }}>{card.label} {card.clickable && <span style={{ color: "#b87333" }}>✎</span>}</div>
              {editingBudget && card.clickable ? (
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <input value={newBudget} onChange={e => setNewBudget(e.target.value)} style={{ width: "80px", padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "13px" }} autoFocus />
                  <button onClick={() => { setBudget(parseFloat(newBudget)); setEditingBudget(false); }} style={{ padding: "3px 8px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "4px", fontSize: "11px", cursor: "pointer" }}>Save</button>
                </div>
              ) : (
                <div style={{ fontSize: "1.3rem", color: card.color }}>{card.value}</div>
              )}
              {card.label === "BUDGET" && !editingBudget && (
                <div style={{ fontSize: "0.75rem", color: remaining >= 0 ? "#4a7c59" : "#c0392b", marginTop: "2px" }}>{remaining >= 0 ? `$${remaining.toFixed(2)} remaining` : `$${Math.abs(remaining).toFixed(2)} over budget`}</div>
              )}
            </div>
          ))}
        </div>

        {/* Planning Hub auto totals */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>FROM PLANNING HUB</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {[
              { label: "Decor", value: decorTotal, color: "#c49a3c" },
              { label: "Refreshments", value: refreshTotal, color: "#4a7c59" },
              { label: "Staffing", value: staffTotal, color: "#5b7fa6" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#faf8f5", borderRadius: "8px", padding: "0.75rem 1rem", border: "1px solid #f0ebe4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color }} />
                  <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{item.label}</div>
                </div>
                <div style={{ fontSize: "1.1rem", color: item.color, fontWeight: 500 }}>${item.value.toFixed(2)}</div>
                
              </div>
            ))}
          </div>
          <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f0ebe4", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>Planning Hub subtotal</div>
            <div style={{ fontSize: "1rem", color: "#2c1810", fontWeight: 500 }}>${planningTotal.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <button onClick={() => setAdding(!adding)} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add expense</button>
        </div>

        {adding && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>New expense</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}>
                {MANUAL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <input placeholder="Item description" value={newExpense.item} onChange={e => setNewExpense({...newExpense, item: e.target.value})} style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="Total cost" value={newExpense.cost} onChange={e => setNewExpense({...newExpense, cost: e.target.value})} style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
              <input placeholder="Deposit paid" value={newExpense.deposit} onChange={e => setNewExpense({...newExpense, deposit: e.target.value})} style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
            </div>
            <input placeholder="Notes" value={newExpense.notes} onChange={e => setNewExpense({...newExpense, notes: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", marginBottom: "8px", boxSizing: "border-box" as const }} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={addExpense} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Save</button>
              <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {MANUAL_CATEGORIES.map(cat => {
          const items = grouped[cat];
          if (!items || items.length === 0) return null;
          const catTotal = items.reduce((s, e) => s + Number(e.cost), 0);
          const catDeposit = items.reduce((s, e) => s + Number(e.deposit), 0);
          const catBalance = items.reduce((s, e) => s + Number(e.balance), 0);
          return (
            <div key={cat} style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: categoryColors[cat] || "#b87333" }} />
                <div style={{ fontSize: "0.9rem", fontWeight: 500, color: "#2c1810" }}>{cat}</div>
                <div style={{ marginLeft: "auto", fontSize: "0.8rem", color: "#8b7355" }}>Total: <strong style={{ color: "#2c1810" }}>${catTotal.toFixed(2)}</strong> · Deposited: <strong style={{ color: "#4a7c59" }}>${catDeposit.toFixed(2)}</strong> · Owed: <strong style={{ color: "#c0392b" }}>${catBalance.toFixed(2)}</strong></div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0ebe4" }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Item</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Cost</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Deposit</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Balance</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Notes</th>
                    <th style={{ padding: "6px 8px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(exp => (
                    <tr key={exp.id} style={{ borderBottom: "1px solid #f8f5f0" }}>
                      <td style={{ padding: "10px 8px", color: "#2c1810" }}>
                        {editing === exp.id ? <input value={editData.item || ""} onChange={e => setEditData({...editData, item: e.target.value})} style={{ padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "13px", width: "150px" }} /> : exp.item}
                      </td>
                      <td style={{ padding: "10px 8px", color: "#2c1810" }}>
                        {editing === exp.id ? <input value={editData.cost || ""} onChange={e => setEditData({...editData, cost: parseFloat(e.target.value) || 0})} style={{ padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "13px", width: "70px" }} /> : `$${Number(exp.cost).toFixed(2)}`}
                      </td>
                      <td style={{ padding: "10px 8px", color: "#4a7c59" }}>
                        {editing === exp.id ? <input value={editData.deposit || ""} onChange={e => setEditData({...editData, deposit: parseFloat(e.target.value) || 0})} style={{ padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "13px", width: "70px" }} /> : `$${Number(exp.deposit).toFixed(2)}`}
                      </td>
                      <td style={{ padding: "10px 8px", color: Number(exp.balance) > 0 ? "#c0392b" : "#4a7c59", fontWeight: 500 }}>${Number(exp.balance).toFixed(2)}</td>
                      <td style={{ padding: "10px 8px", color: "#8b7355", fontSize: "12px" }}>
                        {editing === exp.id ? <input value={editData.notes || ""} onChange={e => setEditData({...editData, notes: e.target.value})} style={{ padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "13px", width: "120px" }} /> : exp.notes}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {editing === exp.id ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button onClick={() => saveEdit(exp.id)} style={{ fontSize: "11px", padding: "3px 8px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Save</button>
                            <button onClick={() => setEditing(null)} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button onClick={() => { setEditing(exp.id); setEditData(exp); }} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "4px", cursor: "pointer", color: "#8b7355" }}>Edit</button>
                            <button onClick={() => deleteExpense(exp.id)} style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #f0ebe4", borderRadius: "4px", cursor: "pointer", color: "#c0392b" }}>Remove</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        {/* Grand total */}
        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.25rem 1.5rem", color: "#fff", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1rem" }}>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PLANNING HUB</div><div style={{ fontSize: "1.1rem" }}>${planningTotal.toFixed(2)}</div></div>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>OTHER EXPENSES</div><div style={{ fontSize: "1.1rem" }}>${manualTotal.toFixed(2)}</div></div>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>TOTAL DEPOSITED</div><div style={{ fontSize: "1.1rem", color: "#90c9a0" }}>${totalDeposit.toFixed(2)}</div></div>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>GRAND TOTAL</div><div style={{ fontSize: "1.3rem", color: "#e8c97a" }}>${totalCost.toFixed(2)}</div></div>
        </div>

      </div>
    </div>
  );
}