"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Brand = {
  id: number;
  name: string;
  fee_owed: number;
  amount_paid: number;
  balance: number;
  status: string;
};

export default function PaymentTracker() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [newAmount, setNewAmount] = useState("");

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    const { data } = await supabase.from("brands").select("*").eq("event", "Atlanta");
    if (data) setBrands(data);
  };

  const updatePayment = async (brand: Brand) => {
    const paid = parseFloat(newAmount);
    const balance = brand.fee_owed - paid;
    const status = balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
    await supabase.from("brands").update({ amount_paid: paid, balance, status }).eq("id", brand.id);
    setEditing(null);
    setNewAmount("");
    fetchBrands();
  };

  const statusColor = (s: string) => {
    if (s === "Paid") return { background: "#4a7c5922", color: "#4a7c59" };
    if (s === "Partial") return { background: "#b8733322", color: "#b87333" };
    return { background: "#c0392b22", color: "#c0392b" };
  };

  return (
    <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
      <div style={{ fontSize: "1.1rem", color: "#2c1810", marginBottom: "0.3rem" }}>Payment tracker</div>
      <div style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1.25rem" }}>Brand fees for Atlanta pop-up</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e8e0d5" }}>
            {["Brand", "Fee Owed", "Amount Paid", "Balance", "Status", ""].map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "8px 10px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brands.map((brand) => (
            <tr key={brand.id} style={{ borderBottom: "1px solid #f0ebe4" }}>
              <td style={{ padding: "10px", fontWeight: 500, color: "#2c1810" }}>{brand.name}</td>
              <td style={{ padding: "10px", color: "#2c1810" }}>${brand.fee_owed}</td>
              <td style={{ padding: "10px" }}>
                {editing === brand.id ? (
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    style={{ width: "80px", padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "13px" }}
                    autoFocus
                  />
                ) : (
                  <span style={{ color: "#2c1810" }}>${brand.amount_paid}</span>
                )}
              </td>
              <td style={{ padding: "10px", fontWeight: 500, color: brand.balance > 0 ? "#c0392b" : "#4a7c59" }}>${brand.balance}</td>
              <td style={{ padding: "10px" }}>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "20px", ...statusColor(brand.status) }}>{brand.status}</span>
              </td>
              <td style={{ padding: "10px" }}>
                {editing === brand.id ? (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => updatePayment(brand)} style={{ fontSize: "11px", padding: "4px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditing(null)} style={{ fontSize: "11px", padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditing(brand.id); setNewAmount(String(brand.amount_paid)); }} style={{ fontSize: "11px", padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "4px", cursor: "pointer", color: "#8b7355" }}>Edit</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}