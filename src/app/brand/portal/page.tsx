"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Announcements from "@/components/brand/Announcements";
import FileUpload from "@/components/brand/FileUpload";

type Brand = {
  id: number;
  name: string;
  email: string;
  fee_owed: number;
  amount_paid: number;
  balance: number;
  status: string;
  event: string;
};

type Deadline = { id: number; task: string; due_date: string; category: string; };
type BrandTask = { id: number; deadline_id: number; completed: boolean; };

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
  { q: "Do I need to attend the pop-up in person?", a: "No — AO Curates will fully staff the store with trained sales associates. You do not need to send a representative." },
  { q: "When will I receive my payout?", a: "Payouts will be issued by October 5th, 2026." },
  { q: "What is the commission structure?", a: "AO Curates applies a 20% commission on all sales made during the pop-up." },
  { q: "What happens to unsold items?", a: "Unsold items must either be picked up by October 31st, 2026 or shipped back at the brand expense." },
  { q: "What shipping options are available?", a: "AO Curates has secured a discounted rate through Amgray Logistics at 17,500 per kg. Products must arrive in Atlanta between August 3rd and August 28th, 2026." },
  { q: "What are the event hours?", a: "Friday September 11th is a Private Shopping Event from 5PM to 7PM. Saturday September 12th is open 10AM to 6PM. Sunday September 13th is open 12PM to 5PM." },
  { q: "What labelling is required on my products?", a: "Every single item must be tagged with your brand name, product name and selling price before shipping." },
  { q: "Who do I contact if I have questions?", a: "You will be added to a private WhatsApp group where you can reach the AO Curates team directly." },
];

export default function BrandPortal() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<BrandTask[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [venueAddress, setVenueAddress] = useState("5135 Peachtree Pkwy NW Ste 915, Peachtree Corners, GA 30092, United States");

  const eventDate = new Date("2026-09-12");
  const today = new Date();
  const daysToEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUserEmail(user.email || "");

      let resolvedBrandEmail = user.email || "";

      const [brandRes, deadlineRes, taskRes, settingsRes] = await Promise.all([
        supabase.from("brands").select("*").eq("email", user.email).single(),
        supabase.from("event_deadlines").select("*").eq("event", "Atlanta").order("id"),
        supabase.from("brand_tasks").select("*").eq("brand_email", user.email).eq("event", "Atlanta"),
        supabase.from("event_settings").select("venue_address").eq("event", "Atlanta").single(),
      ]);

      if (brandRes.data) {
        setBrand(brandRes.data);
        resolvedBrandEmail = user.email || "";
      } else {
        const { data: memberRes } = await supabase
          .from("brand_members")
          .select("brand_email")
          .eq("member_email", user.email)
          .eq("event", "Atlanta")
          .single();

        if (memberRes?.brand_email) {
          resolvedBrandEmail = memberRes.brand_email;
          const { data: linkedBrand } = await supabase
            .from("brands")
            .select("*")
            .eq("email", memberRes.brand_email)
            .single();
          if (linkedBrand) setBrand(linkedBrand);

          const { data: linkedTasks } = await supabase
            .from("brand_tasks")
            .select("*")
            .eq("brand_email", memberRes.brand_email)
            .eq("event", "Atlanta");
          if (linkedTasks) setTasks(linkedTasks);
        }
      }

      setBrandEmail(resolvedBrandEmail);
      if (deadlineRes.data) setDeadlines(deadlineRes.data);
      if (taskRes.data && brandRes.data) setTasks(taskRes.data);
      if (settingsRes.data?.venue_address) setVenueAddress(settingsRes.data.venue_address);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const isCompleted = (deadlineId: number) =>
    tasks.find(t => t.deadline_id === deadlineId)?.completed || false;

  const toggleTask = async (deadline: Deadline) => {
    if (!brandEmail) return;
    setSaving(deadline.id);
    const existing = tasks.find(t => t.deadline_id === deadline.id);
    if (existing) {
      const { error } = await supabase.from("brand_tasks").update({ completed: !existing.completed }).eq("id", existing.id);
      if (!error) setTasks(tasks.map(t => t.id === existing.id ? { ...t, completed: !t.completed } : t));
    } else {
      const { data, error } = await supabase.from("brand_tasks").insert({
        event: "Atlanta",
        task: deadline.task,
        due_date: deadline.due_date,
        brand_email: brandEmail,
        completed: true,
        deadline_id: deadline.id,
      }).select().single();
      if (!error && data) setTasks([...tasks, data]);
    }
    setSaving(null);
  };

  const parseDate = (d: string) => {
    const [m, day] = d.split(' ');
    return new Date(2026, months[m], parseInt(day));
  };

  const sortedDeadlines = [...deadlines].sort((a, b) =>
    parseDate(a.due_date).getTime() - parseDate(b.due_date).getTime()
  );

  const completed = deadlines.filter(d => isCompleted(d.id)).length;
  const progress = deadlines.length ? Math.round((completed / deadlines.length) * 100) : 0;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading your portal...</div>
  );

  if (!brand) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.5rem", color: "#2c1810", marginBottom: "0.5rem" }}>POPLAN</div>
        <p style={{ color: "#8b7355", marginBottom: "1rem" }}>No brand found for {userEmail}</p>
        <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>Sign out</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e0d5", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", marginTop: "2px" }}></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#8b7355" }}>Brand</span>
          <button onClick={handleLogout} style={{ fontSize: "0.8rem", padding: "5px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", cursor: "pointer", color: "#8b7355", fontFamily: "Georgia, serif" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        <div style={{ background: "#fff", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.75rem", letterSpacing: "0.15em", color: "#b87333", marginBottom: "4px" }}>AO CURATES</div>
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "#2c1810", marginBottom: "2px" }}>Atlanta Pop-Up · Sep 11–13, 2026</div>
          <div style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1.25rem" }}>{venueAddress}</div>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", margin: 0, lineHeight: 1.3 }}>
            Welcome, <span style={{ fontFamily: "Didot, 'Playfair Display', 'Times New Roman', serif", fontStyle: "italic" }}>{brand.name}</span> 🖤
          </h1>
          <p style={{ color: "#8b7355", marginTop: "1rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
            We are so excited to have you as part of this experience. Your brand brings something truly special to our curated space and we cannot wait to showcase what you have created. This portal is your home base — everything you need to prepare for Atlanta is right here.
          </p>
          <p style={{ color: "#8b7355", marginTop: "0.75rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
            Thank you for trusting AO Curates with your brand. Lets make Atlanta unforgettable. 🌟
          </p>
        </div>

        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.5rem 2rem", marginBottom: "1.5rem", color: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", alignItems: "center" }}>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PARTICIPATION FEE</div><div style={{ fontSize: "1.4rem" }}>${Number(brand.fee_owed).toFixed(2)}</div></div>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PAID</div><div style={{ fontSize: "1.4rem" }}>${Number(brand.amount_paid).toFixed(2)}</div></div>
          <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>BALANCE</div><div style={{ fontSize: "1.4rem", color: Number(brand.balance) > 0 ? "#e8c97a" : "#90c9a0" }}>${Number(brand.balance).toFixed(2)}</div></div>
          <div style={{ textAlign: "center", background: "#fff", borderRadius: "10px", padding: "0.75rem" }}>
            <div style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal", lineHeight: 1 }}>{daysToEvent}</div>
            <div style={{ fontSize: "0.7rem", color: "#8b7355", marginTop: "4px" }}>days to event</div>
          </div>
        </div>

        <Announcements event="Atlanta" />

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", marginTop: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "1rem", color: "#2c1810" }}>Your to-do list</div>
            <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{completed} of {deadlines.length} complete</div>
          </div>
          <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px", marginBottom: "1.25rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
          {sortedDeadlines.map(deadline => {
            const done = isCompleted(deadline.id);
            const isSaving = saving === deadline.id;
            return (
              <div key={deadline.id} onClick={() => !isSaving && toggleTask(deadline)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 8px", borderRadius: "8px", cursor: isSaving ? "wait" : "pointer", opacity: isSaving ? 0.7 : 1 }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
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
                {isSaving && <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>Saving...</span>}
              </div>
            );
          })}
        </div>

        <FileUpload brandName={brand.name} brandEmail={brandEmail} />

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginTop: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "1rem" }}>Frequently asked questions</div>
          {faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < faqs.length - 1 ? "1px solid #f0ebe4" : "none" }}>
              <div onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 0", cursor: "pointer" }}>
                <div style={{ fontSize: "0.9rem", color: "#2c1810", paddingRight: "1rem" }}>{faq.q}</div>
                <div style={{ color: "#b87333", fontSize: "1.2rem", flexShrink: 0 }}>{openFaq === i ? "−" : "+"}</div>
              </div>
              {openFaq === i && <div style={{ fontSize: "0.85rem", color: "#8b7355", lineHeight: 1.7, paddingBottom: "0.85rem" }}>{faq.a}</div>}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}