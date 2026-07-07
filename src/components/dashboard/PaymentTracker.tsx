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

const brandLinks: Record<string, string> = {
  "Ara Lagos": "/login/brand",
  "Lola Signatures": "/login/brand/lola",
  "Yinka MB": "/brand/portal",
};

export default function PaymentTracker() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [newAmount, setNewAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", fee_owed: "400", amount_paid: "0" });

  useEffect(() => {
    fetchBrands();

    const channel = supabase
      .channel("brands-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "brands" }, () => {
        fetchBrands();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
    setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, amount_paid: paid, balance, status } : b));
    setEditing(null);
    setNewAmount("");
  };

  const addBrand = async () => {
    if (!newBrand.name.trim()) return;
    const fee = parseFloat(newBrand.fee_owed);
    const paid = parseFloat(newBrand.amount_paid);
    const balance = fee - paid;
    const status = balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
    const { data } = await supabase.from("brands").insert({ name: newBrand.name, fee_owed: fee, amount_paid: paid, balance, status, event: "Atlanta" }).select().single();
    if (data) setBrands(prev => [...prev, data]);
    setNewBrand({ name: "", fee_owed: "400", amount_paid: "0" });
    setAdding(false);
  };

  const deleteBrand = async (id: number) => {
    if (!confirm("Remove this brand?")) return;
    await supabase.from("brands").delete().eq("id", id);
    setBrands(prev => prev.filter(b => b.id !== id));
  };

  const statusColor = (s: string) => {
    if (s === "Paid") return { background: "#4a7c5922", color: "#4a7c59" };
    if (s === "Partial") return { background: "#b8733322", color: "#b87333" };
    return { background: "#c0392b22", color: "#c0392b" };
  };

  const iconBtn = (onClick: () => void, icon: string, title: string, danger = false) => (
    <button
      onClick={onClick}
      title={title}
      style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "14px", padding: "4px 6px", borderRadius: "6px", color: danger ? "#c0392b" : "#8b7355" }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? "#c0392b11" : "#f0ebe4")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
    </button>
  );

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontSize: "1.1rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>Payment tracker</div>
          <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>Brand fees for Atlanta pop-up</div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ fontSize: "0.8rem", padding: "6px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add brand</button>
      </div>

      {adding && (
        <div style={{ background: "#faf8f5", borderRadius: "12px", padding: "1rem", marginBottom: "1rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.85rem", color: "#2c1810", marginBottom: "8px", fontFamily: "Georgia, serif" }}>Add new brand</div>
          <input placeholder="Brand name" value={newBrand.name} onChange={e => setNewBrand({...newBrand, name: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", marginBottom: "8px", boxSizing: "border-box" as const }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Fee owed" value={newBrand.fee_owed} onChange={e => setNewBrand({...newBrand, fee_owed: e.target.value})} style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
            <input placeholder="Amount paid" value={newBrand.amount_paid} onChange={e => setNewBrand({...newBrand, amount_paid: e.target.value})} style={{ padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addBrand} style={{ padding: "7px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save</button>
            <button onClick={() => setAdding(false)} style={{ padding: "7px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

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
              <td style={{ padding: "10px", fontWeight: 500, fontFamily: "Georgia, serif" }}>
                {brandLinks[brand.name] ? (
                  <a href={brandLinks[brand.name]} style={{ color: "#b87333", textDecoration: "none", borderBottom: "1px solid #b8733344" }} onMouseEnter={e => (e.currentTarget.style.color = "#2c1810")} onMouseLeave={e => (e.currentTarget.style.color = "#b87333")}>
                    {brand.name}
                  </a>
                ) : (
                  <span style={{ color: "#2c1810" }}>{brand.name}</span>
                )}
              </td>
              <td style={{ padding: "10px", color: "#2c1810" }}>${Number(brand.fee_owed).toFixed(2)}</td>
              <td style={{ padding: "10px" }}>
                {editing === brand.id ? (
                  <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} style={{ width: "80px", padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "13px" }} autoFocus />
                ) : (
                  <span style={{ color: "#2c1810" }}>${Number(brand.amount_paid).toFixed(2)}</span>
                )}
              </td>
              <td style={{ padding: "10px", fontWeight: 500, color: Number(brand.balance) > 0 ? "#c0392b" : "#4a7c59" }}>${Number(brand.balance).toFixed(2)}</td>
              <td style={{ padding: "10px" }}>
                <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "20px", ...statusColor(brand.status) }}>{brand.status}</span>
              </td>
              <td style={{ padding: "10px" }}>
                {editing === brand.id ? (
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={() => updatePayment(brand)} style={{ fontSize: "11px", padding: "4px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Save</button>
                    <button onClick={() => setEditing(null)} style={{ fontSize: "11px", padding: "4px 10px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "2px" }}>
                    {iconBtn(() => { setEditing(brand.id); setNewAmount(String(brand.amount_paid)); }, "✏️", "Edit payment")}
                    {iconBtn(() => deleteBrand(brand.id), "🗑️", "Remove brand", true)}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}