"use client";
import NotificationBell from "@/components/shared/NotificationBell";
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
  shipped: boolean;
  shipped_at: string;
  instagram?: string;
  website?: string;
  bio?: string;
  logo_url?: string;
};

type Deadline = { id: number; task: string; due_date: string; category: string; };
type BrandTask = { id: number; deadline_id: number; completed: boolean; };
type Message = { id: number; sender_email: string; sender_name: string; message: string; created_at: string; };

const categoryColors: Record<string, string> = {
  Admin: "#b87333",
  Marketing: "#4a7c59",
  Operations: "#5b7fa6",
  Logistics: "#8b6ab0",
};

const FILE_CATEGORIES = [
  { key: "logo", label: "Brand Logo", desc: "High resolution PNG or SVG, white and dark versions" },
  { key: "lookbook", label: "Lookbook / Catalogue", desc: "PDF or images of your current collection" },
  { key: "photos", label: "Product Photos", desc: "Clean product shots on white or neutral backgrounds" },
  { key: "press", label: "Press Kit", desc: "Brand story, founder bio, previous press coverage" },
  { key: "other", label: "Other", desc: "Any other files you would like to share with us" },
];

const faqs = [
  { q: "Do I need to attend the pop-up in person?", a: "No — AO Curates will fully staff the store with trained sales associates. You do not need to send a representative." },
  { q: "When will I receive my payout?", a: "Payouts will be issued by October 5th, 2026." },
  { q: "What is the commission structure?", a: "AO Curates applies a 20% commission on all sales made during the pop-up." },
  { q: "What happens to unsold items?", a: "Unsold items must either be picked up by October 31st, 2026 or shipped back at the brand's expense." },
  { q: "What shipping options are available?", a: "AO Curates has secured a discounted rate through Amgray Logistics at ₦17,500 per kg. Products must arrive in Atlanta between August 3rd and August 28th, 2026." },
  { q: "What are the event hours?", a: "Friday September 11th is a Private Shopping Event from 5PM to 7PM. Saturday September 12th is open 10AM to 6PM. Sunday September 13th is open 12PM to 5PM." },
  { q: "What labelling is required on my products?", a: "Every single item must be tagged with your brand name, product name and selling price before shipping." },
  { q: "Who do I contact if I have questions?", a: "You will be added to a private WhatsApp group where you can reach the AO Curates team directly." },
];

export default function BrandPortal() {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<BrandTask[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [markingShipped, setMarkingShipped] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "tasks" | "files" | "messages" | "profile" | "faq">("home");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ instagram: "", website: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [eventName, setEventName] = useState("Atlanta Pop-Up");
  const [eventDates, setEventDates] = useState("Sep 11–13, 2026");
  const [organizerName, setOrganizerName] = useState("AO Curates");

  const today = new Date();

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUserEmail(user.email || "");

      let resolvedBrandEmail = user.email || "";
      let resolvedEvent = "Atlanta";

      const brandRes = await supabase.from("brands").select("*").eq("email", user.email).order("id", { ascending: false }).limit(1).maybeSingle();

      if (brandRes.data) {
        setBrand(brandRes.data);
        resolvedEvent = brandRes.data.event;
        setProfileData({ instagram: brandRes.data.instagram || "", website: brandRes.data.website || "", bio: brandRes.data.bio || "" });
      } else {
        const { data: memberRes } = await supabase.from("brand_members").select("brand_email, event").eq("member_email", user.email).limit(1).maybeSingle();
        if (memberRes?.brand_email) {
          resolvedBrandEmail = memberRes.brand_email;
          resolvedEvent = memberRes.event || "Atlanta";
          const { data: linkedBrand } = await supabase.from("brands").select("*").eq("email", memberRes.brand_email).single();
          if (linkedBrand) {
            setBrand(linkedBrand);
            setProfileData({ instagram: linkedBrand.instagram || "", website: linkedBrand.website || "", bio: linkedBrand.bio || "" });
          }
        }
      }

      setBrandEmail(resolvedBrandEmail);

      const [deadlineRes, taskRes, settingsRes, messagesRes, eventRes] = await Promise.all([
        supabase.from("event_deadlines").select("*").eq("event", resolvedEvent).order("id"),
        supabase.from("brand_tasks").select("*").eq("brand_email", resolvedBrandEmail).eq("event", resolvedEvent),
        supabase.from("event_settings").select("venue_address").eq("event", resolvedEvent).single(),
        supabase.from("brand_messages").select("*").eq("event", resolvedEvent).eq("brand_email", resolvedBrandEmail).order("created_at"),
        supabase.from("events").select("name, dates_label, organizer_email").eq("city", resolvedEvent).maybeSingle(),
      ]);

      if (deadlineRes.data) setDeadlines(deadlineRes.data);
      if (taskRes.data) setTasks(taskRes.data);
      if (settingsRes.data?.venue_address) setVenueAddress(settingsRes.data.venue_address);
      if (messagesRes.data) setMessages(messagesRes.data);
      if (eventRes.data) {
        if (eventRes.data.name) setEventName(eventRes.data.name);
        if (eventRes.data.dates_label) setEventDates(eventRes.data.dates_label);
      }

      setLoading(false);
    };
    fetchAll();
  }, []);

  const eventDate = new Date("2026-09-12");
  const daysToEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const markShipped = async () => {
    if (!brand) return;
    setMarkingShipped(true);
    const now = new Date().toISOString();
    await supabase.from("brands").update({ shipped: true, shipped_at: now }).eq("id", brand.id);
    setBrand(prev => prev ? { ...prev, shipped: true, shipped_at: now } : prev);
    setMarkingShipped(false);
  };

  const isCompleted = (deadlineId: number) => tasks.find(t => t.deadline_id === deadlineId)?.completed || false;

  const toggleTask = async (deadline: Deadline) => {
    if (!brandEmail) return;
    setSaving(deadline.id);
    const existing = tasks.find(t => t.deadline_id === deadline.id);
    if (existing) {
      const { error } = await supabase.from("brand_tasks").update({ completed: !existing.completed }).eq("id", existing.id);
      if (!error) setTasks(tasks.map(t => t.id === existing.id ? { ...t, completed: !t.completed } : t));
    } else {
      const { data, error } = await supabase.from("brand_tasks").insert({
        event: brand?.event || "Atlanta", task: deadline.task, due_date: deadline.due_date,
        brand_email: brandEmail, completed: true, deadline_id: deadline.id,
      }).select().single();
      if (!error && data) setTasks([...tasks, data]);
    }
    setSaving(null);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    const { data } = await supabase.from("brand_messages").insert({
      event: brand?.event || "Atlanta", brand_email: brandEmail,
      organizer_email: "aocurates@gmail.com", sender_email: userEmail,
      sender_name: brand?.name || userEmail, message: newMessage,
    }).select().single();
    if (data) setMessages(prev => [...prev, data]);
    setNewMessage("");
  };

  const saveProfile = async () => {
    if (!brand) return;
    setSavingProfile(true);
    await supabase.from("brands").update({ instagram: profileData.instagram, website: profileData.website, bio: profileData.bio }).eq("id", brand.id);
    setBrand(prev => prev ? { ...prev, ...profileData } : prev);
    setEditingProfile(false);
    setSavingProfile(false);
  };

  const completed = deadlines.filter(d => isCompleted(d.id)).length;
  const progress = deadlines.length ? Math.round((completed / deadlines.length) * 100) : 0;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const inp = (style?: object) => ({ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", width: "100%", boxSizing: "border-box" as const, ...style });

  const tabs = [
    { key: "home", label: "Home" },
    { key: "tasks", label: `Tasks (${completed}/${deadlines.length})` },
    { key: "files", label: "Files" },
    { key: "messages", label: `Messages${messages.length > 0 ? ` (${messages.length})` : ""}` },
    { key: "profile", label: "Profile" },
    { key: "faq", label: "FAQ" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading your portal...</div>
  );

  if (!brand) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.5rem", color: "#2c1810", marginBottom: "0.5rem" }}>POPLAN</div>
        <p style={{ color: "#8b7355", marginBottom: "1rem" }}>No brand found for {userEmail}. Please contact your event organizer.</p>
        <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>Sign out</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>

      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e0d5", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky" as const, top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", marginTop: "2px" }}></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#8b7355" }}>{brand.name}</span>
          <NotificationBell userEmail={userEmail} />
          <button onClick={handleLogout} style={{ fontSize: "0.8rem", padding: "5px 12px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", cursor: "pointer", color: "#8b7355", fontFamily: "Georgia, serif" }}>Sign out</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e0d5", padding: "0 1rem", display: "flex", gap: "0", overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{ padding: "0.85rem 1.25rem", background: "transparent", border: "none", borderBottom: activeTab === tab.key ? "2px solid #b87333" : "2px solid transparent", color: activeTab === tab.key ? "#2c1810" : "#8b7355", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" as const, transition: "all 0.15s" }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div>
            {/* Welcome card */}
            <div style={{ background: "#fff", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "0.75rem", letterSpacing: "0.15em", color: "#b87333", marginBottom: "4px" }}>{organizerName.toUpperCase()}</div>
              <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "2px" }}>{eventName} · {eventDates}</div>
              {venueAddress && <div style={{ fontSize: "0.8rem", color: "#8b7355", marginBottom: "1.25rem" }}>{venueAddress}</div>}
              <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", margin: 0, lineHeight: 1.3 }}>
                Welcome, <span style={{ fontFamily: "Didot, 'Playfair Display', 'Times New Roman', serif", fontStyle: "italic" }}>{brand.name}</span> 🖤
              </h1>
              <p style={{ color: "#8b7355", marginTop: "1rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
                We are so excited to have you as part of this experience. Your brand brings something truly special to our curated space and we cannot wait to showcase what you have created. This portal is your home base — everything you need to prepare for {eventName} is right here.
              </p>
              <p style={{ color: "#8b7355", marginTop: "0.75rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
                Thank you for trusting {organizerName} with your brand. Let us make this unforgettable. 🌟
              </p>
            </div>

            {/* Stats */}
            <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.5rem 2rem", marginBottom: "1.5rem", color: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1rem", alignItems: "center" }}>
              <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PARTICIPATION FEE</div><div style={{ fontSize: "1.4rem" }}>${Number(brand.fee_owed).toFixed(2)}</div></div>
              <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PAID</div><div style={{ fontSize: "1.4rem" }}>${Number(brand.amount_paid).toFixed(2)}</div></div>
              <div><div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>BALANCE</div><div style={{ fontSize: "1.4rem", color: Number(brand.balance) > 0 ? "#e8c97a" : "#90c9a0" }}>${Number(brand.balance).toFixed(2)}</div></div>
              <div style={{ textAlign: "center", background: "#fff", borderRadius: "10px", padding: "0.75rem" }}>
                <div style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal", lineHeight: 1 }}>{daysToEvent}</div>
                <div style={{ fontSize: "0.7rem", color: "#8b7355", marginTop: "4px" }}>days to event</div>
              </div>
            </div>

            {/* Shipment */}
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "4px" }}>SHIPMENT STATUS</div>
                {brand.shipped ? (
                  <div>
                    <div style={{ fontSize: "0.95rem", color: "#4a7c59" }}>Products marked as shipped ✓</div>
                    <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>Marked on {formatDate(brand.shipped_at)}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.95rem", color: "#2c1810" }}>Not yet shipped — please mark when your products are on their way</div>
                )}
              </div>
              {!brand.shipped && (
                <button onClick={markShipped} disabled={markingShipped} style={{ padding: "10px 20px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" as const, marginLeft: "1rem" }}>
                  {markingShipped ? "Saving..." : "Mark as shipped"}
                </button>
              )}
            </div>

            {/* Quick task progress */}
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5", cursor: "pointer" }} onClick={() => setActiveTab("tasks")}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>Your to-do list</div>
                <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{completed}/{deadlines.length} complete</div>
              </div>
              <div style={{ height: "4px", background: "#f0ebe4", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "2px", transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: "0.78rem", color: "#b87333", marginTop: "8px" }}>View all tasks →</div>
            </div>

            <Announcements event={brand.event || "Atlanta"} brandEmail={brandEmail} />
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "tasks" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "1rem", color: "#2c1810" }}>Your to-do list</div>
              <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{completed} of {deadlines.length} complete</div>
            </div>
            <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px", marginBottom: "1.25rem", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "3px", transition: "width 0.3s" }} />
            </div>
            {deadlines.length === 0 && <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No tasks assigned yet.</p>}
            {deadlines.map(deadline => {
              const done = isCompleted(deadline.id);
              const isSaving = saving === deadline.id;
              return (
                <div key={deadline.id} onClick={() => !isSaving && toggleTask(deadline)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 8px", borderRadius: "8px", cursor: isSaving ? "wait" : "pointer", opacity: isSaving ? 0.7 : 1 }} onMouseEnter={e => (e.currentTarget.style.background = "#faf8f5")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: done ? "none" : "2px solid #d4c5b0", background: done ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                    {done && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", color: done ? "#b0a090" : "#2c1810", textDecoration: done ? "line-through" : "none" }}>{deadline.task}</div>
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
        )}

        {/* FILES TAB */}
        {activeTab === "files" && (
          <div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
              <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>Upload your brand files</div>
              <p style={{ fontSize: "0.85rem", color: "#8b7355", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Please upload the files below so we can best represent your brand at the pop-up. All files are securely stored and only accessible to the AO Curates team.
              </p>
              <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
                {FILE_CATEGORIES.map(cat => (
                  <div key={cat.key} style={{ padding: "1rem", background: "#faf8f5", borderRadius: "10px", border: "1px solid #f0ebe4" }}>
                    <div style={{ fontSize: "0.88rem", color: "#2c1810", fontWeight: 500, marginBottom: "2px" }}>{cat.label}</div>
                    <div style={{ fontSize: "0.78rem", color: "#8b7355", marginBottom: "8px" }}>{cat.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <FileUpload brandName={brand.name} brandEmail={brandEmail} />
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === "messages" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "1.5rem" }}>Messages with {organizerName}</div>
            <div style={{ height: "400px", overflowY: "auto", display: "flex", flexDirection: "column" as const, gap: "12px", marginBottom: "1rem", padding: "0.5rem" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#8b7355", fontSize: "0.85rem", marginTop: "3rem" }}>
                  No messages yet. Send a message to {organizerName} below.
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_email === userEmail;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: "0.68rem", color: "#8b7355", marginBottom: "3px" }}>{msg.sender_name}</div>
                    <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? "#2c1810" : "#f5f0ea", color: isMe ? "#fff" : "#2c1810", fontSize: "0.88rem", lineHeight: 1.5 }}>{msg.message}</div>
                    <div style={{ fontSize: "0.65rem", color: "#b0a090", marginTop: "3px" }}>{new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="Write a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} style={inp({ flex: 1 })} />
              <button onClick={sendMessage} style={{ padding: "8px 18px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "1rem", color: "#2c1810" }}>Brand profile</div>
              {!editingProfile ? (
                <button onClick={() => setEditingProfile(true)} style={{ fontSize: "0.8rem", padding: "5px 14px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", cursor: "pointer", color: "#8b7355" }}>Edit profile</button>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={saveProfile} disabled={savingProfile} style={{ fontSize: "0.8rem", padding: "5px 14px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>{savingProfile ? "Saving..." : "Save"}</button>
                  <button onClick={() => setEditingProfile(false)} style={{ fontSize: "0.8rem", padding: "5px 14px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.12em", marginBottom: "6px" }}>BRAND NAME</div>
              <div style={{ fontSize: "1.1rem", color: "#2c1810" }}>{brand.name}</div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.12em", marginBottom: "6px" }}>EMAIL</div>
              <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>{brand.email}</div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.12em", marginBottom: "6px" }}>INSTAGRAM</div>
              {editingProfile ? (
                <input placeholder="@yourbrand" value={profileData.instagram} onChange={e => setProfileData({...profileData, instagram: e.target.value})} style={inp()} />
              ) : (
                <div style={{ fontSize: "0.9rem", color: brand.instagram ? "#2c1810" : "#b0a090" }}>{brand.instagram || "Not added yet"}</div>
              )}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.12em", marginBottom: "6px" }}>WEBSITE</div>
              {editingProfile ? (
                <input placeholder="https://yourbrand.com" value={profileData.website} onChange={e => setProfileData({...profileData, website: e.target.value})} style={inp()} />
              ) : (
                <div style={{ fontSize: "0.9rem", color: brand.website ? "#2c1810" : "#b0a090" }}>{brand.website || "Not added yet"}</div>
              )}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.12em", marginBottom: "6px" }}>BRAND BIO</div>
              {editingProfile ? (
                <textarea placeholder="Tell us about your brand..." value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} style={{ ...inp(), height: "100px", resize: "vertical" as const }} />
              ) : (
                <div style={{ fontSize: "0.9rem", color: brand.bio ? "#2c1810" : "#b0a090", lineHeight: 1.6 }}>{brand.bio || "Not added yet"}</div>
              )}
            </div>
          </div>
        )}

        {/* FAQ TAB */}
        {activeTab === "faq" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
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
        )}

      </div>
    </div>
  );
}
