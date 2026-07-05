"use client";
import { useState } from "react";

const brand = {
  name: "Ara Lagos",
  event: "Atlanta",
  dates: "Sep 12–13, 2026",
  feeOwed: 400,
  amountPaid: 400,
  balance: 0,
  status: "Paid",
};

const eventDate = new Date("2026-09-12");
const today = new Date();
const daysToEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

const todos = [
  { task: "Sign participation agreement", due: "Jul 15", category: "Admin" },
  { task: "Upload logo and product photos", due: "Aug 1", category: "Marketing" },
  { task: "Submit Instagram reel", due: "Aug 10", category: "Marketing" },
  { task: "Collab post live", due: "Aug 15", category: "Marketing" },
  { task: "Submit final inventory list", due: "Aug 20", category: "Operations" },
  { task: "Share shipping tracking number", due: "Aug 25", category: "Logistics" },
];

const categoryColors: Record<string, string> = {
  Admin: "#b87333",
  Marketing: "#4a7c59",
  Operations: "#5b7fa6",
  Logistics: "#8b6ab0",
};

export default function BrandPortal() {
  const [checked, setChecked] = useState<number[]>([]);
  const [uploads, setUploads] = useState<{ name: string; file: File }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);

  const toggle = (i: number) => {
    setChecked(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploads(prev => [...prev, ...files.map(f => ({ name: f.name, file: f }))]);
  };

  const completed = checked.length;
  const progress = Math.round((completed / todos.length) * 100);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e0d5", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", marginTop: "2px" }}></div>
        </div>
        <span style={{ fontSize: "0.85rem", color: "#8b7355" }}>Brand Portal</span>
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal", margin: 0 }}>Welcome, {brand.name}</h1>
          <p style={{ color: "#8b7355", marginTop: "0.4rem" }}>{brand.event} Pop-up · {brand.dates}</p>
        </div>

        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.5rem 2rem", marginBottom: "1.5rem", color: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>FEE OWED</div>
            <div style={{ fontSize: "1.4rem" }}>${brand.feeOwed}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PAID</div>
            <div style={{ fontSize: "1.4rem" }}>${brand.amountPaid}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>BALANCE</div>
            <div style={{ fontSize: "1.4rem", color: brand.balance > 0 ? "#e8c97a" : "#90c9a0" }}>${brand.balance}</div>
          </div>
          <div style={{ textAlign: "center", background: "#fff", borderRadius: "10px", padding: "0.75rem" }}>
            <div style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal", lineHeight: 1 }}>{daysToEvent}</div>
            <div style={{ fontSize: "0.7rem", color: "#8b7355", marginTop: "4px" }}>days to event</div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "1rem", color: "#2c1810" }}>Your to-do list</div>
            <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{completed} of {todos.length} complete</div>
          </div>
          <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px", marginBottom: "1.25rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
          {["Admin", "Marketing", "Operations", "Logistics"].map(cat => {
            const items = todos.filter(t => t.category === cat);
            if (!items.length) return null;
            return (
              <div key={cat} style={{ marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.7rem", color: categoryColors[cat], letterSpacing: "0.08em", marginBottom: "4px" }}>{cat.toUpperCase()}</div>
                {items.map((todo, i) => {
                  const idx = todos.indexOf(todo);
                  const done = checked.includes(idx);
                  return (
                    <div key={i} onClick={() => toggle(idx)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 8px", borderRadius: "8px", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: done ? "none" : "2px solid #d4c5b0", background: done ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {done && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", color: done ? "#b0a090" : "#2c1810", textDecoration: done ? "line-through" : "none" }}>{todo.task}</div>
                        <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>Due {todo.due}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>Upload documents</div>
          <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1rem" }}>Upload your logo, product photos, inventory list and any other documents here.</p>

          <label style={{ display: "inline-block", padding: "8px 16px", background: "#2c1810", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
            + Choose files
            <input type="file" multiple onChange={handleUpload} style={{ display: "none" }} />
          </label>

          {uploads.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              {uploads.map((u, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: "1px solid #f0ebe4", fontSize: "0.85rem", color: "#2c1810" }}>
                  <span>📄</span>
                  <span>{u.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#4a7c59" }}>Ready to send</span>
                </div>
              ))}
              <button onClick={() => alert("Files submitted! AO Curates will review them shortly.")} style={{ marginTop: "1rem", padding: "8px 16px", background: "#4a7c59", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                Submit files to AO Curates
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}