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

const CATEGORIES = ["Venue", "Marketing", "Staffing", "Operations", "Logistics"];

const tooltips: Record<string, string> = {
  category: "The type of expense — e.g. Venue, Marketing, Staffing",
  item: "The specific expense item — e.g. Venue rental fee",
  cost: "The total cost of this item",
  deposit: "How much you have already paid",
  balance: "What you still owe — calculated automatically",
  notes: "Any extra details — e.g. invoice number or payment deadline",
};

const categoryColors: Record<string, string> = {
  Venue: "#b87333",
  Marketing: "#4a7c59",
  Staffing: "#5b7fa6",
  Operations: "#8b6ab0",
  Logistics: "#a0522d",
};

export default function ExpensesPage({ params }: { params: { slug: string } }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudget] = useState(8000);
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState("8000");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});
  const [newExpense, setNewExpense] = useState({ category: "Venue", item: "", cost: "", deposit: "", notes: "" });
  const [tooltip, setTooltip] = useState("");

  useEffect(() => { fetchExpenses(); }, []);

  const fetchExpenses = async () => {
    const { data } = await supabase.from("expenses").select("*").eq("event", "Atlanta").order("category");
    if (data) setExpenses(data);
  };

  const addExpense = async () => {
    if (!newExpense.item.trim()) return;
    await supabase.from("expenses").insert({
      category: newExpense.category,
      item: newExpense.item,
      cost: parseFloat(newExpense.cost) || 0,
      deposit: parseFloat(newExpense.deposit) || 0,
      notes: newExpense.notes,
      event: "Atlanta"
    });
    setNewExpense({ category: "Venue", item: "", cost: "", deposit: "", notes: "" });
    setAdding(false);
    fetchExpenses();
  };

  const saveEdit = async (id: number) => {
    await supabase.from("expenses").update({
      item: editData.item,
      cost: editData.cost,
      deposit: editData.deposit,
      notes: editData.notes,
    }).eq("id", id);
    setEditing(null);
    fetchExpenses();
  };

  const deleteExpense = async (id: number) => {
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  };

  const totalCost = expenses.reduce((s, e) => s + Number(e.cost), 0);
  const totalDeposit = expenses.reduce((s, e) => s + Number(e.deposit), 0);
  const totalOutstanding = expenses.reduce((s, e) => s + Number(e.balance), 0);
  const remaining = budget - totalCost;

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter(e => e.category === cat);
    return acc;
  }, {} as Record<string, Expense[]>);

  const Tooltip = ({ field }: { field: string }) => (
    <span
      onMouseEnter={() => setTooltip(field)}
      onMouseLeave={() => setTooltip("")}
      style={{ marginLeft: "4px", cursor: "help", color: "#b87333", fontSize: "11px", position: "relative" }}
    >
      ⓘ
      {tooltip === field && (
        <span style={{ position: "absolute", bottom: "120%", left: "50%", transform: "translateX(-50%)", background: "#2c1810", color: "#fff", padding: "6px 10px", borderRadius: "8px", fontSize: "11px", whiteSpace: "nowrap", zIndex: 100, fontFamily: "Calibri, sans-serif" }}>
          {tooltips[field]}
        </span>
      )}
    </span>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/login/organizer/events/${params.slug}`} style={{ fontSize: "0.85rem", color: "#8b7355", textDecoration: "none" }}>← Back to Atlanta</Link>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", marginTop: "0.5rem" }}>Expenses</h1>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Track every cost for Atlanta Pop-up</p>
        </div>

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

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <button onClick={() => setAdding(!adding)} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add expense</button>
        </div>

        {adding && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>New expense</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
              <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
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

        {CATEGORIES.map(cat => {
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
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Item <Tooltip field="item" /></th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Cost <Tooltip field="cost" /></th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Deposit <Tooltip field="deposit" /></th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Balance <Tooltip field="balance" /></th>
                    <th style={{ textAlign: "left", padding: "6px 8px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>Notes <Tooltip field="notes" /></th>
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

        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.25rem 1.5rem", color: "#fff", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>TOTAL COST</div><div style={{ fontSize: "1.3rem" }}>${totalCost.toFixed(2)}</div></div>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>TOTAL DEPOSITED</div><div style={{ fontSize: "1.3rem", color: "#90c9a0" }}>${totalDeposit.toFixed(2)}</div></div>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>TOTAL OUTSTANDING</div><div style={{ fontSize: "1.3rem", color: "#e8a090" }}>${totalOutstanding.toFixed(2)}</div></div>
        </div>

      </div>
    </div>
  );
}
