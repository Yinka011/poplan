"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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

const categoryColors: Record<string, string> = {
  Admin: "#b87333",
  Marketing: "#4a7c59",
  Operations: "#5b7fa6",
  Logistics: "#8b6ab0",
};

const months: Record<string, number> = {
  Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
  Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
};

type Deadline = {
  id: number;
  task: string;
  due_date: string;
  category: string;
};

export default function BrandPortal() {
  const [checked, setChecked] = useState<number[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  useEffect(() => {
    const fetchDeadlines = async () => {
      const { data } = await supabase
        .from("event_deadlines")
        .select("*")
        .eq("event", "Atlanta")
        .order("id");
      if (data) setDeadlines(data);
    };
    fetchDeadlines();
  }, []);

  const toggle = (id: number) => {
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const parseDate = (d: string) => {
    const [m, day] = d.split(' ');
    return new Date(2026, months[m], parseInt(day));
  };

  const sortedDeadlines = [...deadlines].sort((a, b) =>
    parseDate(a.due_date).getTime() - parseDate(b.due_date).getTime()
  );

  const completed = checked.length;
  const progress = deadlines.length ? Math.round((completed / deadlines.length) * 100) : 0;

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

        <div style={{ background: "#fff", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.75rem", letterSpacing: "0.12em", color: "#b87333", marginBottom: "0.75rem" }}>AO CURATES · ATLANTA 2026</div>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", margin: 0, lineHeight: 1.3 }}>
            Hi {brand.name}, welcome to the<br />AO Curates Atlanta Pop-Up! 🖤
          </h1>
          <p style={{ color: "#8b7355", marginTop: "1rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
            We are so excited to have you as part of this experience. Your brand brings something truly special to our curated space and we cannot wait to showcase what you have created. This portal is your home base — everything you need to prepare for Atlanta is right here.
          </p>
          <p style={{ color: "#8b7355", marginTop: "0.75rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
            Thank you for trusting AO Curates with your brand. Let's make Atlanta unforgettable. 🌟
          </p>
          <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f0ebe4", fontSize: "0.85rem", color: "#b87333" }}>
            {brand.event} Pop-up · {brand.dates}
          </div>
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
            <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{completed} of {deadlines.length} complete</div>
          </div>
          <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px", marginBottom: "1.25rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
          {sortedDeadlines.map(deadline => {
            const done = checked.includes(deadline.id);
            return (
              <div key={deadline.id} onClick={() => toggle(deadline.id)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 8px", borderRadius: "8px", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: done ? "none" : "2px solid #d4c5b0", background: done ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.9rem", color: done ? "#b0a090" : "#2c1810", textDecoration: done ? "line-through" : "none" }}>{deadline.task}</div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>Due {deadline.due_date}</span>
                    <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "10px", background: (categoryColors[deadline.category] || "#8b7355") + "22", color: categoryColors[deadline.category] || "#8b7355" }}>{deadline.category}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>Inventory sheet</div>
          <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1.25rem" }}>Download the inventory template, fill it in with your products, then upload the completed sheet to your folder.</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
            <a href="https://docs.google.com/spreadsheets/d/1ruWERUAd7XQxRzh5rsKeOt_UwCBf9tRb/edit?usp=share_link" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 20px", background: "#5b7fa6", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>
              📥 Download inventory template
            </a>
            <a href="https://drive.google.com/drive/folders/1WloEj6iDYNu41vaF0f1St5UAKx95SNgy?usp=share_link" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 20px", background: "#4a7c59", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>
              📤 Upload completed sheet
            </a>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>Upload documents</div>
          <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1.25rem" }}>Upload your logo, product photos, marketing assets and any other documents to your dedicated folder. AO Curates will be notified when you add files.</p>
          <div style={{ background: "#faf8f5", borderRadius: "10px", padding: "1.25rem", border: "1px solid #e8e0d5", marginBottom: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>YOUR UPLOAD FOLDER</div>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "1rem" }}>Ara Lagos — AO Curates Atlanta 2026</div>
            <a href="https://drive.google.com/drive/folders/1WloEj6iDYNu41vaF0f1St5UAKx95SNgy?usp=share_link" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 20px", background: "#2c1810", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>
              📁 Open my upload folder
            </a>
          </div>
          <div style={{ fontSize: "0.85rem", color: "#8b7355" }}>
            <div style={{ marginBottom: "8px", color: "#2c1810" }}>Please upload the following:</div>
            {[
              "Brand logo (high resolution)",
              "Product photos (high quality)",
              "Completed inventory sheet",
              "Marketing assets (photos and videos)",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 0" }}>
                <span style={{ color: "#b87333" }}>→</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}