"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const brand = {
  name: "Ara Lagos",
  event: "Atlanta",
  dates: "Sep 11–13, 2026",
  feeOwed: 400,
  amountPaid: 400,
  balance: 0,
  status: "Paid",
};

const eventDate = new Date("2026-09-11");
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

const faqs = [
  {
    q: "Do I need to attend the pop-up in person?",
    a: "No — AO Curates will fully staff the store with trained sales associates. You do not need to send a representative. Our team will be briefed using your brand book and product details."
  },
  {
    q: "When will I receive my payout?",
    a: "Payouts will be issued by October 5th, 2026. A final inventory list will also be sent to you by the same date so you know exactly what sold."
  },
  {
    q: "What is the commission structure?",
    a: "AO Curates applies a 20% commission on all sales made during the pop-up. Your payout will reflect your total sales minus the 20% commission."
  },
  {
    q: "What happens to unsold items?",
    a: "Unsold items must either be picked up by October 31st, 2026 or shipped back at the brand's expense. We will coordinate with you after the event."
  },
  {
    q: "How many units can I send?",
    a: "Brands may ship up to 50 units total. However all units must fall within the AO Curates approved selection based on your catalogue review."
  },
  {
    q: "What shipping options are available?",
    a: "You may use any courier of your choice. AO Curates has secured an affordable bulk shipping option from Lagos to Atlanta through Amgray Logistics. Products must arrive in Atlanta between August 3rd and August 28th, 2026. Items leaving Lagos should depart at least two weeks before your intended arrival date."
  },
  {
    q: "What are the event hours?",
    a: "Friday September 11th is a Private Shopping Event from 5PM–7PM. Saturday September 12th is open 10AM–6PM. Sunday September 13th is open 12PM–5PM."
  },
  {
    q: "What marketing support does AO Curates provide?",
    a: "AO Curates will provide high-quality graphics, event posters, customizable social media templates and official event talking points. We will also run paid Instagram ads, organic content, email marketing campaigns and a public Opening Day event."
  },
  {
    q: "What are my marketing responsibilities?",
    a: "Each brand is expected to post the provided promotional asset on their Instagram feed, share at least one Instagram Story featuring the provided materials, and communicate the event details to their US and Atlanta-based audience through social media or email."
  },
  {
    q: "What is the Digital Brand Book and when is it due?",
    a: "The Digital Brand Book is due two weeks before the pop-up — around August 28th, 2026. Please include your brand story, founder bio, product details, care instructions, brand values and any key selling points for our associates."
  },
  {
    q: "What labelling is required on my products?",
    a: "Every single item must be tagged before shipping with your brand name, product name and selling price. Items that are not properly tagged may experience delays in being displayed for sale."
  },
  {
    q: "Who do I contact if I have questions?",
    a: "Once participation is confirmed you will be added to a private WhatsApp group where you can reach the AO Curates team directly for any questions or updates."
  },
];

type Deadline = {
  id: number;
  task: string;
  due_date: string;
  category: string;
};

export default function BrandPortal() {
  const [checked, setChecked] = useState<number[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

        {/* Welcome */}
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

        {/* Payment + Countdown */}
        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.5rem 2rem", marginBottom: "1.5rem", color: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PARTICIPATION FEE</div>
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

        {/* To-do list */}
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
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: done ? "none" : "2px solid #d4c5b0", background: done ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                  {done && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.9rem", color: done ? "#b0a090" : "#2c1810", textDecoration: done ? "line-through" : "none", transition: "all 0.2s" }}>{deadline.task}</div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>Due {deadline.due_date}</span>
                    <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "10px", background: (categoryColors[deadline.category] || "#8b7355") + "22", color: categoryColors[deadline.category] || "#8b7355" }}>{deadline.category}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inventory */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>Inventory sheet</div>
          <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1.25rem" }}>Download the inventory template, fill it in with your approved products, then upload the completed sheet to your folder. Remember — only ship items approved by AO Curates.</p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" as const }}>
            <a href="https://docs.google.com/spreadsheets/d/1ruWERUAd7XQxRzh5rsKeOt_UwCBf9tRb/edit?usp=share_link" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 20px", background: "#5b7fa6", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>
              📥 Download inventory template
            </a>
            <a href="https://drive.google.com/drive/folders/1WloEj6iDYNu41vaF0f1St5UAKx95SNgy?usp=share_link" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", padding: "10px 20px", background: "#4a7c59", color: "#fff", borderRadius: "8px", fontSize: "0.85rem", textDecoration: "none", fontFamily: "Georgia, serif" }}>
              📤 Upload completed sheet
            </a>
          </div>
        </div>

        {/* Upload documents */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>Upload documents</div>
          <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1.25rem" }}>Upload your logo, product photos, digital brand book and marketing assets to your dedicated folder. AO Curates will be notified when you add files.</p>
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
              "Product photos (clean neutral background preferred)",
              "Digital brand book (due 2 weeks before event)",
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

        {/* FAQ */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "1rem" }}>Frequently asked questions</div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < faqs.length - 1 ? "1px solid #f0ebe4" : "none" }}>
              <div onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 0", cursor: "pointer" }}>
                <div style={{ fontSize: "0.9rem", color: "#2c1810", paddingRight: "1rem" }}>{faq.q}</div>
                <div style={{ color: "#b87333", fontSize: "1.2rem", flexShrink: 0 }}>{openFaq === i ? "−" : "+"}</div>
              </div>
              {openFaq === i && (
                <div style={{ fontSize: "0.85rem", color: "#8b7355", lineHeight: 1.7, paddingBottom: "0.85rem" }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}