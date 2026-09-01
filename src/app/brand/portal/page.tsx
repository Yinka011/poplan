"use client";
import { notifyOrganizer } from "@/lib/organizerNotify";
import { sendEmail, emailTemplate } from "@/lib/email";
import NotificationBell from "@/components/shared/NotificationBell";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Announcements from "@/components/brand/Announcements";
import FileUpload from "@/components/brand/FileUpload";
import BrandInventory from "@/components/brand/BrandInventory";
import BrandSales from "@/components/brand/BrandSales";
import BrandTutorial from "@/components/brand/BrandTutorial";

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
  courier?: string;
  tracking_number?: string;
  shipping_invoice?: string;
  instagram?: string;
  website?: string;
  bio?: string;
  logo_url?: string;
  organizer_email?: string;
};

type Deadline = { id: number; task: string; due_date: string; category: string; };
type BrandTask = { id: number; deadline_id: number; completed: boolean; };
type Message = { id: number; sender_email: string; sender_name: string; message: string; created_at: string; };

const categoryColors: Record<string, string> = {
  Admin: "#E8C97A",
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
  const [shipmentInvoices, setShipmentInvoices] = useState<{id: number; file_name: string; file_url: string; amount: number; description: string; created_at: string;}[]>([]);
  const [brandShipments, setBrandShipments] = useState<{id: number; courier: string; tracking_number: string; description: string; shipped: boolean; received: boolean; created_at: string;}[]>([]);
  const [addingShipment, setAddingShipment] = useState(false);
  const [newShipment, setNewShipment] = useState({ courier: "", tracking_number: "", description: "" });
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [newInvoiceFile, setNewInvoiceFile] = useState<File | null>(null);
  const [newInvoiceDesc, setNewInvoiceDesc] = useState("");
  const [newInvoiceAmount, setNewInvoiceAmount] = useState("");
  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({ courier: "", tracking_number: "", shipping_invoice: "" });
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "tasks" | "files" | "messages" | "inventory" | "sales" | "shipments" | "profile" | "faq">("home");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({ instagram: "", website: "", bio: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [eventName, setEventName] = useState("Atlanta Pop-Up");
  const [resolvedEvent, setResolvedEvent] = useState("");
  const [eventDates, setEventDates] = useState("Sep 11–13, 2026");
  const [organizerName] = useState("AO Curates");

  const today = new Date();

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUserEmail(user.email || "");

      let resolvedBrandEmail = user.email || "";
      let resolvedEvent = "";

      const brandRes = await supabase.from("brands").select("*").eq("email", user.email).order("id", { ascending: false }).limit(1).maybeSingle();

      if (brandRes.data) {
        setBrand(brandRes.data);
        resolvedEvent = brandRes.data.event;
        setResolvedEvent(brandRes.data.event);
        setProfileData({ instagram: brandRes.data.instagram || "", website: brandRes.data.website || "", bio: brandRes.data.bio || "" });
      } else {
        const { data: memberRes } = await supabase.from("brand_members").select("brand_email, event").eq("member_email", user.email).limit(1).maybeSingle();
        if (memberRes?.brand_email) {
          resolvedBrandEmail = memberRes.brand_email;
          resolvedEvent = memberRes.event || "";
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

      const invRes = await supabase.from("brand_shipment_invoices").select("*").eq("brand_email", resolvedBrandEmail).order("created_at", { ascending: false });
      const shipRes = await supabase.from("brand_shipments").select("*").eq("brand_email", resolvedBrandEmail).order("created_at", { ascending: false });
      if (shipRes.data) setBrandShipments(shipRes.data);
      if (invRes.data) setShipmentInvoices(invRes.data);
      setLoading(false);

      // Notify organizer of brand login
      const loginKey = `brand_login_notified_${user.email}`;
      if (!localStorage.getItem(loginKey)) {
        await notifyOrganizer({
          event: resolvedEvent,
          brandEmail: resolvedBrandEmail,
          brandName: brand?.name || resolvedBrandEmail,
          type: "login",
          message: `logged in to their portal for the first time`,
        });
        localStorage.setItem(loginKey, "true");
      }

      // Show tutorial on first visit
      if (!localStorage.getItem("brand_tutorial_seen_dismissed")) {
        setShowTutorial(true);
      }
    };
    fetchAll();
  }, []);

  const eventDate = new Date("2026-09-12");
  const daysToEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const addShipmentPackage = async () => {
    if (!newShipment.courier || !brandEmail) return;
    const { data } = await supabase.from("brand_shipments").insert({
      brand_email: brandEmail,
      event: brand?.event || "",
      courier: newShipment.courier,
      tracking_number: newShipment.tracking_number,
      description: newShipment.description,
      shipped: true,
      shipped_at: new Date().toISOString(),
    }).select().single();
    if (data) setBrandShipments(prev => [data, ...prev]);
    setNewShipment({ courier: "", tracking_number: "", description: "" });
    setAddingShipment(false);
  };

  const saveShippingDetails = async () => {
    if (!brand) return;
    await supabase.from("brands").update({
      courier: shippingDetails.courier,
      tracking_number: shippingDetails.tracking_number,
      shipping_invoice: shippingDetails.shipping_invoice,
    }).eq("id", brand.id);
    setBrand(prev => prev ? { ...prev, ...shippingDetails } : prev);
    setEditingShipping(false);
  };

  const uploadShipmentInvoice = async () => {
    if (!newInvoiceFile || !brandEmail) return;
    setUploadingInvoice(true);
    const path = `${brandEmail}/shipment-invoices/${Date.now()}_${newInvoiceFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await supabase.storage.from("brand-uploads").upload(path, newInvoiceFile, { upsert: true });
    if (!error) {
      const { data: urlData } = supabase.storage.from("brand-uploads").getPublicUrl(path);
      const { data } = await supabase.from("brand_shipment_invoices").insert({ brand_email: brandEmail, event: brand?.event || "Atlanta", file_name: newInvoiceFile.name, file_url: urlData.publicUrl, amount: parseFloat(newInvoiceAmount) || 0, description: newInvoiceDesc }).select().single();
      if (data) setShipmentInvoices(prev => [data, ...prev]);
      setNewInvoiceFile(null); setNewInvoiceDesc(""); setNewInvoiceAmount("");
    }
    setUploadingInvoice(false);
  };

  const toggleShipped = async () => {
    if (!brand) return;
    setMarkingShipped(true);
    const newShipped = !brand.shipped;
    const now = new Date().toISOString();
    await supabase.from("brands").update({ shipped: newShipped, shipped_at: newShipped ? now : null }).eq("id", brand.id);
    setBrand(prev => prev ? { ...prev, shipped: newShipped, shipped_at: newShipped ? now : "" } : prev);
    if (newShipped && brand) {
      await notifyOrganizer({
        event: brand.event || "Atlanta",
        brandEmail,
        brandName: brand.name,
        type: "shipment",
        message: `marked their products as shipped`,
      });
    }
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
      organizer_email: brand?.organizer_email || "", sender_email: userEmail,
      sender_name: brand?.name || userEmail, message: newMessage,
    }).select().single();
    if (data) {
      setMessages(prev => [...prev, data]);
      await notifyOrganizer({
        event: brand?.event || "Atlanta",
        brandEmail,
        brandName: brand?.name || brandEmail,
        type: "message",
        message: `sent a message: "${newMessage.slice(0, 60)}${newMessage.length > 60 ? "..." : ""}"`,
      });
      // Email the organizer
      await sendEmail({
        to: brand?.organizer_email || "",

        subject: `New message from ${brand?.name}`,
        html: emailTemplate({
          title: `Message from ${brand?.name}`,
          message: newMessage,
          buttonText: "Reply in Nalpop",
          buttonUrl: `https://nalpop.com/login/organizer/events`,
        }),
      });
    }
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

  const inp = (style?: object) => ({ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", width: "100%", boxSizing: "border-box" as const, ...style });

  const tabs = [
    { key: "home", label: "Home" },
    { key: "shipments", label: "Shipments" },
    { key: "tasks", label: `Tasks (${completed}/${deadlines.length})` },
    { key: "files", label: "Files" },
    { key: "messages", label: `Messages${messages.length > 0 ? ` (${messages.length})` : ""}` },
    { key: "inventory", label: "Inventory" },
    { key: "sales", label: "Sales & Payout" },
    { key: "profile", label: "Profile" },
    { key: "faq", label: "FAQ" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading your portal...</div>
  );

  if (!brand) return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "1.5rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>NALPOP</div>
        <p style={{ color: "#4a5a52", marginBottom: "1rem" }}>No brand found for {userEmail}. Please contact your event organizer.</p>
        <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "Georgia, serif" }}>Sign out</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      {showTutorial && <BrandTutorial brandName={brand?.name || ""} eventName={eventName} onClose={() => setShowTutorial(false)} />}

      {/* Top bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e4ebe6", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky" as const, top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#1B3A2D" }}>NALPOP</div>
          <div style={{ width: "2rem", height: "1px", background: "#E8C97A", marginTop: "2px" }}></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#4a5a52" }}>{brand.name}</span>
          <NotificationBell userEmail={userEmail} />
          <button onClick={handleLogout} style={{ fontSize: "0.8rem", padding: "5px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", cursor: "pointer", color: "#4a5a52", fontFamily: "Georgia, serif" }}>Sign out</button>
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e4ebe6", padding: "0 1rem", display: "flex", gap: "0", overflowX: "auto" as const, scrollbarWidth: "none" as const }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as "home" | "tasks" | "files" | "messages" | "inventory" | "sales" | "shipments" | "profile" | "faq")} style={{ padding: "0.85rem 1.25rem", background: "transparent", border: "none", borderBottom: activeTab === tab.key ? "2px solid #E8C97A" : "2px solid transparent", color: activeTab === tab.key ? "#1B3A2D" : "#4a5a52", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif", whiteSpace: "nowrap" as const, transition: "all 0.15s" }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2rem 1.5rem" }}>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div>
            {/* Welcome card */}
            <div style={{ background: "#fff", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.75rem", letterSpacing: "0.15em", color: "#E8C97A", marginBottom: "4px" }}>{organizerName.toUpperCase()}</div>
              <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "2px" }}>{eventName} · {eventDates}</div>
              {venueAddress && <div style={{ fontSize: "0.8rem", color: "#4a5a52", marginBottom: "1.25rem" }}>{venueAddress}</div>}
              <h1 style={{ fontSize: "1.8rem", color: "#1B3A2D", fontWeight: "normal", margin: 0, lineHeight: 1.3 }}>
                Welcome, <span style={{ fontFamily: "Didot, 'Playfair Display', 'Times New Roman', serif", fontStyle: "italic" }}>{brand.name}</span> 🖤
              </h1>
              <p style={{ color: "#4a5a52", marginTop: "1rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
                We are so excited to have you as part of this experience. Your brand brings something truly special to our curated space and we cannot wait to showcase what you have created. This portal is your home base — everything you need to prepare for {eventName} is right here.
              </p>
              <p style={{ color: "#4a5a52", marginTop: "0.75rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
                Thank you for trusting {organizerName} with your brand. Let us make this unforgettable. 🌟
              </p>
            </div>

            {/* Fee tracker */}
            <div style={{ background: "#1B3A2D", borderRadius: "16px", padding: "1.75rem 2rem", marginBottom: "1.5rem", color: "#fff" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#d4c87a", letterSpacing: "0.15em", marginBottom: "8px" }}>PARTICIPATION FEE</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: "normal" }}>${Number(brand.fee_owed).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#d4c87a", letterSpacing: "0.15em", marginBottom: "8px" }}>PAID</div>
                  <div style={{ fontSize: "1.6rem", color: "#90c9a0", fontWeight: "normal" }}>${Number(brand.amount_paid).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", color: "#d4c87a", letterSpacing: "0.15em", marginBottom: "8px" }}>BALANCE DUE</div>
                  <div style={{ fontSize: "1.6rem", color: Number(brand.balance) > 0 ? "#e8c97a" : "#90c9a0", fontWeight: "normal" }}>${Number(brand.balance).toFixed(2)}</div>
                  {Number(brand.balance) > 0 && <div style={{ fontSize: "0.68rem", color: "#e8c97a", marginTop: "4px" }}>Payment outstanding</div>}
                </div>
                <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem", textAlign: "center" as const }}>
                  <div style={{ fontSize: "2.5rem", color: "#1B3A2D", lineHeight: 1, fontWeight: "normal" }}>{daysToEvent}</div>
                  <div style={{ fontSize: "0.65rem", color: "#4a5a52", marginTop: "6px", letterSpacing: "0.1em" }}>DAYS TO EVENT</div>
                </div>
              </div>
            </div>

            {/* Announcements */}
            <Announcements event={brand.event || "Atlanta"} brandEmail={brandEmail} />

            {/* Shipment + Tasks side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1.5rem" }}>
              {/* Shipment card */}
              {/* Shipment card */}
              <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6", cursor: "pointer" }} onClick={() => setActiveTab("shipments")}>
                <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.15em", marginBottom: "8px" }}>SHIPMENT STATUS</div>
                <div style={{ fontSize: "1.8rem", color: brand.shipped ? "#4a7c59" : "#1B3A2D", fontWeight: "normal", marginBottom: "4px" }}>{brand.shipped ? "✓" : "—"}</div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "8px" }}>{brand.shipped ? `Shipped · ${formatDate(brand.shipped_at)}` : "Not yet shipped"}</div>
                {brand.courier && <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>🚚 {brand.courier}</div>}
                {brand.tracking_number && <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>Tracking: {brand.tracking_number}</div>}
                <div style={{ fontSize: "0.72rem", color: "#E8C97A", marginTop: "8px" }}>Manage shipments →</div>
              </div>

              <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6", cursor: "pointer" }} onClick={() => setActiveTab("tasks")}>
                <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.15em", marginBottom: "12px" }}>TO-DO LIST</div>
                <div style={{ fontSize: "2rem", color: "#1B3A2D", fontWeight: "normal", lineHeight: 1, marginBottom: "4px" }}>{completed}<span style={{ fontSize: "1rem", color: "#4a5a52" }}>/{deadlines.length}</span></div>
                <div style={{ fontSize: "0.75rem", color: "#4a5a52", marginBottom: "12px" }}>tasks completed</div>
                <div style={{ height: "4px", background: "#f0f4f1", borderRadius: "2px", overflow: "hidden", marginBottom: "10px" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "#E8C97A", borderRadius: "2px", transition: "width 0.3s" }} />
                </div>
                <div style={{ fontSize: "0.78rem", color: "#E8C97A" }}>View all tasks →</div>
              </div>
            </div>

          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === "shipments" && (
          <div>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.15em" }}>SHIPMENT PACKAGES</div>
                <button onClick={() => setAddingShipment(true)} style={{ fontSize: "0.78rem", padding: "5px 12px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add package</button>
              </div>
              <div style={{ background: "#f0f4f1", borderRadius: "8px", padding: "8px 10px", marginBottom: "12px", borderLeft: "3px solid #1B3A2D" }}>
                <div style={{ fontSize: "0.65rem", color: "#1B3A2D", letterSpacing: "0.08em", marginBottom: "3px" }}>SHIP TO</div>
                <div style={{ fontSize: "0.78rem", color: "#1c1714", lineHeight: 1.6 }}>{venueAddress || "Contact your organizer for shipping address"}</div>
              </div>
              {addingShipment && (
                <div style={{ border: "1px solid #e4ebe6", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "8px" }}>
                    <input placeholder="Description e.g. Box 1 - 10 dresses" value={newShipment.description} onChange={e => setNewShipment({...newShipment, description: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
                    <select value={newShipment.courier} onChange={e => setNewShipment({...newShipment, courier: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }}>
                      <option value="">Select courier...</option>
                      {["DHL", "UPS", "FedEx", "USPS", "Amgray Logistics", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input placeholder="Tracking number" value={newShipment.tracking_number} onChange={e => setNewShipment({...newShipment, tracking_number: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={addShipmentPackage} style={{ flex: 1, padding: "8px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Save package</button>
                      <button onClick={() => setAddingShipment(false)} style={{ padding: "8px 12px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              {brandShipments.length === 0 ? (
                <div style={{ textAlign: "center" as const, padding: "1.5rem", color: "#4a5a52", fontSize: "0.82rem" }}>No packages added yet. Click + Add package to start.</div>
              ) : brandShipments.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f0f4f1" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>{s.description || "Shipment package"}</div>
                    <div style={{ fontSize: "0.72rem", color: "#4a5a52", marginTop: "2px" }}>🚚 {s.courier} {s.tracking_number && `· ${s.tracking_number}`}</div>
                  </div>
                  <span style={{ fontSize: "0.68rem", padding: "2px 8px", borderRadius: "10px", background: s.received ? "#4a7c5922" : "#E8C97A22", color: s.received ? "#4a7c59" : "#b87333" }}>{s.received ? "✓ Received" : "Shipped"}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.15em", marginBottom: "8px" }}>SHIPPING INVOICES</div>
              <p style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1rem" }}>Upload invoices from your shipping carrier so your organizer can reconcile payments.</p>
              <div style={{ border: "1px dashed #e4ebe6", borderRadius: "10px", padding: "1rem", marginBottom: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                  <input placeholder="Description e.g. DHL invoice" value={newInvoiceDesc} onChange={e => setNewInvoiceDesc(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
                  <input placeholder="Amount" type="number" value={newInvoiceAmount} onChange={e => setNewInvoiceAmount(e.target.value)} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
                </div>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setNewInvoiceFile(e.target.files?.[0] || null)} style={{ marginBottom: "8px", fontSize: "0.82rem", width: "100%" }} />
                <button onClick={uploadShipmentInvoice} disabled={uploadingInvoice || !newInvoiceFile} style={{ width: "100%", padding: "8px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                  {uploadingInvoice ? "Uploading..." : "↑ Upload invoice"}
                </button>
              </div>
              {shipmentInvoices.length === 0 ? (
                <div style={{ textAlign: "center" as const, padding: "1.5rem", color: "#4a5a52", fontSize: "0.82rem" }}>No invoices uploaded yet.</div>
              ) : shipmentInvoices.map(inv => (
                <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f4f1" }}>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>{inv.description || inv.file_name}</div>
                    <div style={{ fontSize: "0.7rem", color: "#4a5a52" }}>{new Date(inv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {inv.amount > 0 && <span style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>${Number(inv.amount).toFixed(2)}</span>}
                    <a href={inv.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", padding: "4px 10px", background: "#f0f4f1", color: "#1B3A2D", borderRadius: "6px", textDecoration: "none" }}>↓</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "1rem", color: "#1B3A2D" }}>Your to-do list</div>
              <div style={{ fontSize: "0.8rem", color: "#4a5a52" }}>{completed} of {deadlines.length} complete</div>
            </div>
            <div style={{ height: "5px", background: "#f0f4f1", borderRadius: "3px", marginBottom: "1.25rem", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "#E8C97A", borderRadius: "3px", transition: "width 0.3s" }} />
            </div>
            {deadlines.length === 0 && <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>No tasks assigned yet.</p>}
            {deadlines.map(deadline => {
              const done = isCompleted(deadline.id);
              const isSaving = saving === deadline.id;
              return (
                <div key={deadline.id} onClick={() => !isSaving && toggleTask(deadline)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 8px", borderRadius: "8px", cursor: isSaving ? "wait" : "pointer", opacity: isSaving ? 0.7 : 1 }} onMouseEnter={e => (e.currentTarget.style.background = "#f8faf8")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: done ? "none" : "2px solid #d4c5b0", background: done ? "#E8C97A" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                    {done && <span style={{ color: "#fff", fontSize: "11px" }}>✓</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.9rem", color: done ? "#b0a090" : "#1B3A2D", textDecoration: done ? "line-through" : "none" }}>{deadline.task}</div>
                    <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                      <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>Due {deadline.due_date}</span>
                      <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "10px", background: (categoryColors[deadline.category] || "#4a5a52") + "22", color: categoryColors[deadline.category] || "#4a5a52" }}>{deadline.category}</span>
                    </div>
                  </div>
                  {isSaving && <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>Saving...</span>}
                </div>
              );
            })}
          </div>
        )}

        {/* FILES TAB */}
        {activeTab === "files" && (
          <div>
            <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>Upload your brand files</div>
              <p style={{ fontSize: "0.85rem", color: "#4a5a52", lineHeight: 1.7, marginBottom: "1.5rem" }}>
                Please upload the files below so we can best represent your brand at the pop-up. All files are securely stored and only accessible to the AO Curates team.
              </p>
              <div style={{ display: "grid", gap: "1rem", marginBottom: "1.5rem" }}>
                {FILE_CATEGORIES.map(cat => (
                  <div key={cat.key} style={{ padding: "1rem", background: "#f8faf8", borderRadius: "10px", border: "1px solid #f0f4f1" }}>
                    <div style={{ fontSize: "0.88rem", color: "#1B3A2D", fontWeight: 500, marginBottom: "2px" }}>{cat.label}</div>
                    <div style={{ fontSize: "0.78rem", color: "#4a5a52", marginBottom: "8px" }}>{cat.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <FileUpload brandName={brand.name} brandEmail={brandEmail} event={brand.event || "Atlanta"} />
          </div>
        )}

        {/* MESSAGES TAB */}
        {activeTab === "messages" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "1.5rem" }}>Messages with {organizerName}</div>
            <div style={{ height: "400px", overflowY: "auto", display: "flex", flexDirection: "column" as const, gap: "12px", marginBottom: "1rem", padding: "0.5rem" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#4a5a52", fontSize: "0.85rem", marginTop: "3rem" }}>
                  No messages yet. Send a message to {organizerName} below.
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.sender_email === userEmail;
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const, alignItems: isMe ? "flex-end" : "flex-start" }}>
                    <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "3px" }}>{msg.sender_name}</div>
                    <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", background: isMe ? "#1B3A2D" : "#f8faf8", color: isMe ? "#fff" : "#1B3A2D", fontSize: "0.88rem", lineHeight: 1.5 }}>{msg.message}</div>
                    <div style={{ fontSize: "0.65rem", color: "#b0a090", marginTop: "3px" }}>{new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="Write a message..." value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} style={inp({ flex: 1 })} />
              <button onClick={sendMessage} style={{ padding: "8px 18px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer" }}>Send</button>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === "inventory" && (
          <BrandInventory event={brand.event || "Atlanta"} brandEmail={brandEmail} brandName={brand.name} />
        )}

        {/* SALES TAB */}
        {activeTab === "sales" && (
          <BrandSales event={brand.event || "Atlanta"} brandEmail={brandEmail} />
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ fontSize: "1rem", color: "#1B3A2D" }}>Brand profile</div>
              {!editingProfile ? (
                <button onClick={() => setEditingProfile(true)} style={{ fontSize: "0.8rem", padding: "5px 14px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", cursor: "pointer", color: "#4a5a52" }}>Edit profile</button>
              ) : (
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={saveProfile} disabled={savingProfile} style={{ fontSize: "0.8rem", padding: "5px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>{savingProfile ? "Saving..." : "Save"}</button>
                  <button onClick={() => setEditingProfile(false)} style={{ fontSize: "0.8rem", padding: "5px 14px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", cursor: "pointer" }}>Cancel</button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "6px" }}>BRAND NAME</div>
              <div style={{ fontSize: "1.1rem", color: "#1B3A2D" }}>{brand.name}</div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "6px" }}>EMAIL</div>
              <div style={{ fontSize: "0.9rem", color: "#1B3A2D" }}>{brand.email}</div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "6px" }}>INSTAGRAM</div>
              {editingProfile ? (
                <input placeholder="@yourbrand" value={profileData.instagram} onChange={e => setProfileData({...profileData, instagram: e.target.value})} style={inp()} />
              ) : (
                <div style={{ fontSize: "0.9rem", color: brand.instagram ? "#1B3A2D" : "#b0a090" }}>{brand.instagram || "Not added yet"}</div>
              )}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "6px" }}>WEBSITE</div>
              {editingProfile ? (
                <input placeholder="https://yourbrand.com" value={profileData.website} onChange={e => setProfileData({...profileData, website: e.target.value})} style={inp()} />
              ) : (
                <div style={{ fontSize: "0.9rem", color: brand.website ? "#1B3A2D" : "#b0a090" }}>{brand.website || "Not added yet"}</div>
              )}
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.12em", marginBottom: "6px" }}>BRAND BIO</div>
              {editingProfile ? (
                <textarea placeholder="Tell us about your brand..." value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} style={{ ...inp(), height: "100px", resize: "vertical" as const }} />
              ) : (
                <div style={{ fontSize: "0.9rem", color: brand.bio ? "#1B3A2D" : "#b0a090", lineHeight: 1.6 }}>{brand.bio || "Not added yet"}</div>
              )}
            </div>
          </div>
        )}

        {/* FAQ TAB */}
        {activeTab === "faq" && (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "1rem" }}>Frequently asked questions</div>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: i < faqs.length - 1 ? "1px solid #f0f4f1" : "none" }}>
                <div onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 0", cursor: "pointer" }}>
                  <div style={{ fontSize: "0.9rem", color: "#1B3A2D", paddingRight: "1rem" }}>{faq.q}</div>
                  <div style={{ color: "#E8C97A", fontSize: "1.2rem", flexShrink: 0 }}>{openFaq === i ? "−" : "+"}</div>
                </div>
                {openFaq === i && <div style={{ fontSize: "0.85rem", color: "#4a5a52", lineHeight: 1.7, paddingBottom: "0.85rem" }}>{faq.a}</div>}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
