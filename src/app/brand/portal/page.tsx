"use client";
import { notifyOrganizer } from "@/lib/organizerNotify";
import { sendEmail, emailTemplate } from "@/lib/email";
import NotificationBell from "@/components/shared/NotificationBell";
import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { folderSegment, uploadToCloudinary } from "@/lib/cloudinary";
import Announcements from "@/components/brand/Announcements";
import FileUpload from "@/components/brand/FileUpload";
import BrandInventory from "@/components/brand/BrandInventory";
import BrandSales from "@/components/brand/BrandSales";
import BrandTutorial from "@/components/brand/BrandTutorial";
import { formatCurrency } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import PageSkeleton from "@/components/shared/PageSkeleton";

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

type Deadline = {
  id: number;
  task: string;
  due_date: string;
  category: string;
};
type BrandTask = { id: number; deadline_id: number; completed: boolean };
type Message = {
  id: number;
  sender_email: string;
  sender_name: string;
  message: string;
  created_at: string;
};

const categoryColors: Record<string, string> = {
  Admin: "#E8C97A",
  Marketing: "#4a7c59",
  Operations: "#5b7fa6",
  Logistics: "#8b6ab0",
};

const FILE_CATEGORIES = [
  {
    key: "logo",
    label: "Brand Logo",
    desc: "High resolution PNG or SVG, white and dark versions",
  },
  {
    key: "lookbook",
    label: "Lookbook / Catalogue",
    desc: "PDF or images of your current collection",
  },
  {
    key: "photos",
    label: "Product Photos",
    desc: "Clean product shots on white or neutral backgrounds",
  },
  {
    key: "press",
    label: "Press Kit",
    desc: "Brand story, founder bio, previous press coverage",
  },
  {
    key: "other",
    label: "Other",
    desc: "Any other files you would like to share with us",
  },
];

// FAQs are loaded from DB per organizer

function BrandPortalInner() {
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event") || "";
  const [brand, setBrand] = useState<Brand | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<BrandTask[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [saving, setSaving] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState("");
  const actionRef = useRef(false);
  const [userEmail, setUserEmail] = useState("");
  const [brandEmail, setBrandEmail] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [markingShipped, setMarkingShipped] = useState(false);
  const [shipmentInvoices, setShipmentInvoices] = useState<
    {
      id: number;
      file_name: string;
      file_url: string;
      amount: number;
      description: string;
      created_at: string;
    }[]
  >([]);
  const [brandShipments, setBrandShipments] = useState<
    {
      id: number;
      courier: string;
      tracking_number: string;
      description: string;
      shipped: boolean;
      received: boolean;
      created_at: string;
    }[]
  >([]);
  const [addingShipment, setAddingShipment] = useState(false);
  const [newShipment, setNewShipment] = useState({
    courier: "",
    tracking_number: "",
    description: "",
  });
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [newInvoiceFile, setNewInvoiceFile] = useState<File | null>(null);
  const [newInvoiceDesc, setNewInvoiceDesc] = useState("");
  const [newInvoiceAmount, setNewInvoiceAmount] = useState("");
  const [editingShipping, setEditingShipping] = useState(false);
  const [shippingDetails, setShippingDetails] = useState({
    courier: "",
    tracking_number: "",
    shipping_invoice: "",
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [faqs, setFaqs] = useState<{ q: string; a: string }[]>([]);
  const [activeTab, setActiveTab] = useState<
    | "home"
    | "tasks"
    | "files"
    | "messages"
    | "inventory"
    | "sales"
    | "shipments"
    | "profile"
    | "faq"
  >("home");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    instagram: "",
    website: "",
    bio: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [eventName, setEventName] = useState("");
  const [resolvedEvent, setResolvedEvent] = useState("");
  const [eventDates, setEventDates] = useState("");
  const [eventStartDate, setEventStartDate] = useState<string | null>(null);
  const [collectPayments, setCollectPayments] = useState(true);
  const [organizerName, setOrganizerName] = useState("");
  const [brandOrgEmail, setBrandOrgEmail] = useState("");

  const today = new Date();

  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError && authError.name !== "AuthSessionMissingError")
          throw authError;
        if (!user) {
          window.location.href = "/login";
          return;
        }
        setUserEmail(user.email || "");

        let resolvedBrandEmail = user.email || "";
        let resolvedEvent = "";

        // If no event param, check how many events this brand has
        if (!eventParam) {
          const { data: allBrandRows } = await supabase
            .from("brands")
            .select("id, event")
            .eq("email", user.email)
            .order("id", { ascending: false });
          if (allBrandRows && allBrandRows.length > 1) {
            window.location.href = "/brand";
            return;
          }
        }

        // Use event from URL param if present, otherwise fall back to most recent
        const brandQuery = supabase
          .from("brands")
          .select("*")
          .eq("email", user.email);
        if (eventParam) {
          brandQuery.eq("event", eventParam);
        } else {
          brandQuery.order("id", { ascending: false }).limit(1);
        }
        const brandRes = await brandQuery.maybeSingle();
        if (brandRes.error) throw brandRes.error;

        // If no brand found for this event, redirect back to events list
        if (!brandRes.data && eventParam) {
          window.location.href = "/brand";
          return;
        }

        let loadedBrand: Brand | null = brandRes.data;
        let linkedOrganizerEmail = brandRes.data?.organizer_email || "";
        if (brandRes.data) {
          setBrand(brandRes.data);
          resolvedEvent = brandRes.data.event;
          setResolvedEvent(brandRes.data.event);
          setProfileData({
            instagram: brandRes.data.instagram || "",
            website: brandRes.data.website || "",
            bio: brandRes.data.bio || "",
          });
        } else {
          const { data: memberRes, error: memberError } = await supabase
            .from("brand_members")
            .select("brand_email, event")
            .eq("member_email", user.email)
            .limit(1)
            .maybeSingle();
          if (memberError) throw memberError;
          if (memberRes?.brand_email) {
            resolvedBrandEmail = memberRes.brand_email;
            resolvedEvent = memberRes.event || "";
            const { data: linkedBrand, error: linkedError } = await supabase
              .from("brands")
              .select("*")
              .eq("email", memberRes.brand_email)
              .single();
            if (linkedError) throw linkedError;
            if (linkedBrand) {
              loadedBrand = linkedBrand;
              linkedOrganizerEmail = linkedBrand.organizer_email || "";
              setBrand(linkedBrand);
              setProfileData({
                instagram: linkedBrand.instagram || "",
                website: linkedBrand.website || "",
                bio: linkedBrand.bio || "",
              });
            }
          }
        }

        if (!active) return;
        if (!loadedBrand) {
          setBrand(null);
          return;
        }
        setBrandEmail(resolvedBrandEmail);

        // Get organizer email from brand record
        const brandOrgEmail = linkedOrganizerEmail;
        setBrandOrgEmail(brandOrgEmail);

        const [
          deadlineRes,
          taskRes,
          settingsRes,
          messagesRes,
          eventRes,
          faqRes,
          profileRes,
        ] = await Promise.all([
          supabase
            .from("event_deadlines")
            .select("*")
            .eq("event", resolvedEvent)
            .eq("organizer_email", brandOrgEmail)
            .order("id"),
          supabase
            .from("brand_tasks")
            .select("*")
            .eq("brand_email", resolvedBrandEmail)
            .eq("event", resolvedEvent),
          supabase
            .from("event_settings")
            .select("venue_address")
            .eq("event", resolvedEvent)
            .eq("organizer_email", brandOrgEmail)
            .maybeSingle(),
          supabase
            .from("brand_messages")
            .select("*")
            .eq("event", resolvedEvent)
            .eq("brand_email", resolvedBrandEmail)
            .order("created_at"),
          supabase
            .from("events")
            .select("name, dates_label, start_date, organizer_email, collect_payments")
            .eq("city", resolvedEvent)
            .eq("organizer_email", brandOrgEmail)
            .maybeSingle(),
          supabase
            .from("event_faqs")
            .select("question, answer")
            .eq("event", resolvedEvent)
            .eq("organizer_email", brandOrgEmail)
            .order("id"),
          supabase
            .from("profiles")
            .select("name")
            .eq("email", brandOrgEmail)
            .maybeSingle(),
        ]);

        const queryError = [
          deadlineRes,
          taskRes,
          settingsRes,
          messagesRes,
          eventRes,
          faqRes,
          profileRes,
        ].find((result) => result.error)?.error;
        if (queryError) throw queryError;
        if (!active) return;
        if (deadlineRes.data) setDeadlines(deadlineRes.data);
        if (taskRes.data) setTasks(taskRes.data);
        if (settingsRes.data?.venue_address)
          setVenueAddress(settingsRes.data.venue_address);
        if (messagesRes.data) setMessages(messagesRes.data);
        if (eventRes.data) {
          if (eventRes.data.name) setEventName(eventRes.data.name);
          if (eventRes.data.dates_label)
            setEventDates(eventRes.data.dates_label);
          if (eventRes.data.start_date)
            setEventStartDate(eventRes.data.start_date);
          if (eventRes.data.collect_payments === false)
            setCollectPayments(false);
        }
        if (faqRes.data && faqRes.data.length > 0) {
          setFaqs(faqRes.data.map((f) => ({ q: f.question, a: f.answer })));
        }
        if (profileRes.data?.name) setOrganizerName(profileRes.data.name);
        else if (eventRes.data?.organizer_email)
          setOrganizerName(eventRes.data.organizer_email.split("@")[0]);

        const invRes = await supabase
          .from("brand_shipment_invoices")
          .select("*")
          .eq("brand_email", resolvedBrandEmail)
          .eq("event", resolvedEvent)
          .order("created_at", { ascending: false });
        const shipRes = await supabase
          .from("brand_shipments")
          .select("*")
          .eq("brand_email", resolvedBrandEmail)
          .eq("event", resolvedEvent)
          .order("created_at", { ascending: false });
        if (invRes.error || shipRes.error) throw invRes.error || shipRes.error;
        if (!active) return;
        if (shipRes.data) setBrandShipments(shipRes.data);
        if (invRes.data) setShipmentInvoices(invRes.data);
        // Notify organizer of brand login
        const loginKey = `brand_login_notified_${user.email}`;
        if (!localStorage.getItem(loginKey)) {
          await notifyOrganizer({
            event: resolvedEvent,
            brandEmail: resolvedBrandEmail,
            brandName: loadedBrand.name || resolvedBrandEmail,
            type: "login",
            message: `logged in to their portal for the first time`,
          });
          localStorage.setItem(loginKey, "true");
        }

        // Show tutorial on first visit
        if (!localStorage.getItem("brand_tutorial_seen_dismissed")) {
          setShowTutorial(true);
        }
      } catch (error) {
        console.error("Could not load brand portal:", error);
        if (active)
          setLoadError("Could not load your portal. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchAll();
    return () => {
      active = false;
    };
  }, [retry]);

  const runAction = async (label: string, callback: () => Promise<void>) => {
    if (actionRef.current) return;
    actionRef.current = true;
    setAction(label);
    try {
      await callback();
    } catch (error) {
      console.error(`${label} failed:`, error);
      alert(`Could not ${label.toLowerCase()}. Please try again.`);
    } finally {
      actionRef.current = false;
      setAction("");
    }
  };

  const daysToEvent = eventStartDate
    ? Math.ceil(
        (new Date(eventStartDate).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const addShipmentPackage = async () => {
    if (!newShipment.courier || !brandEmail) return;
    await runAction("Add shipment", async () => {
      const { data, error } = await supabase
        .from("brand_shipments")
        .insert({
          brand_email: brandEmail,
          event: brand?.event || "",
          courier: newShipment.courier,
          tracking_number: newShipment.tracking_number,
          description: newShipment.description,
          shipped: true,
          shipped_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Saved shipment was not returned.");
      setBrandShipments((prev) => [data, ...prev]);
      setNewShipment({ courier: "", tracking_number: "", description: "" });
      setAddingShipment(false);
    });
  };

  const saveShippingDetails = async () => {
    if (!brand) return;
    await runAction("Save shipping details", async () => {
      const { error } = await supabase
        .from("brands")
        .update({
          courier: shippingDetails.courier,
          tracking_number: shippingDetails.tracking_number,
          shipping_invoice: shippingDetails.shipping_invoice,
        })
        .eq("id", brand.id)
        .select("id")
        .single();
      if (error) throw error;
      setBrand((prev) => (prev ? { ...prev, ...shippingDetails } : prev));
      setEditingShipping(false);
    });
  };

  const uploadShipmentInvoice = async () => {
    if (!newInvoiceFile || !brandEmail) return;
    const amount = newInvoiceAmount.trim() ? Number(newInvoiceAmount) : 0;
    if (!Number.isFinite(amount) || amount < 0) {
      alert("Enter a valid non-negative amount.");
      return;
    }
    await runAction("Upload invoice", async () => {
      setUploadingInvoice(true);
      try {
        const uploaded = await uploadToCloudinary(
          newInvoiceFile,
          `${folderSegment(brandEmail)}/shipment-invoices`,
        );
        {
          try {
            const { data, error: insertError } = await supabase
              .from("brand_shipment_invoices")
              .insert({
                brand_email: brandEmail,
                event: brand?.event,
                file_name: newInvoiceFile.name,
                file_url: uploaded.url,
                amount,
                description: newInvoiceDesc,
              })
              .select()
              .single();
            if (insertError) throw insertError;
            if (!data) throw new Error("Saved invoice was not returned.");
            setShipmentInvoices((prev) => [data, ...prev]);
            setNewInvoiceFile(null);
            setNewInvoiceDesc("");
            setNewInvoiceAmount("");
          } catch (error) {
            console.error("Uploaded invoice record could not be saved:", error);
            alert(
              "The invoice file was uploaded, but its record could not be saved; the file may need separate cleanup.",
            );
          }
        }
      } finally {
        setUploadingInvoice(false);
      }
    });
  };

  const toggleShipped = async () => {
    if (!brand) return;
    await runAction("Update shipping status", async () => {
      setMarkingShipped(true);
      try {
        const newShipped = !brand.shipped;
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("brands")
          .update({ shipped: newShipped, shipped_at: newShipped ? now : null })
          .eq("id", brand.id)
          .select("id")
          .single();
        if (error) throw error;
        setBrand((prev) =>
          prev
            ? {
                ...prev,
                shipped: newShipped,
                shipped_at: newShipped ? now : "",
              }
            : prev,
        );
        if (newShipped && brand) {
          await notifyOrganizer({
            event: brand.event,
            brandEmail,
            brandName: brand.name,
            type: "shipment",
            message: `marked their products as shipped`,
          });
        }
      } finally {
        setMarkingShipped(false);
      }
    });
  };

  const isCompleted = (deadlineId: number) =>
    tasks.find((t) => t.deadline_id === deadlineId)?.completed || false;

  const toggleTask = async (deadline: Deadline) => {
    if (!brandEmail) return;
    await runAction("Update task", async () => {
      setSaving(deadline.id);
      try {
        const existing = tasks.find((t) => t.deadline_id === deadline.id);
        if (existing) {
          const { error } = await supabase
            .from("brand_tasks")
            .update({ completed: !existing.completed })
            .eq("id", existing.id);
          if (error) throw error;
          setTasks(
            tasks.map((t) =>
              t.id === existing.id ? { ...t, completed: !t.completed } : t,
            ),
          );
        } else {
          const { data, error } = await supabase
            .from("brand_tasks")
            .insert({
              event: brand?.event,
              task: deadline.task,
              due_date: deadline.due_date,
              brand_email: brandEmail,
              completed: true,
              deadline_id: deadline.id,
            })
            .select()
            .single();
          if (error) throw error;
          if (!data) throw new Error("Saved task was not returned.");
          setTasks([...tasks, data]);
        }
      } finally {
        setSaving(null);
      }
    });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !brand) return;
    await runAction("Send message", async () => {
      const { data, error } = await supabase
        .from("brand_messages")
        .insert({
          event: brand.event,
          brand_email: brandEmail,
          organizer_email: brand?.organizer_email || "",
          sender_email: userEmail,
          sender_name: brand?.name || userEmail,
          message: newMessage,
        })
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("Sent message was not returned.");
      {
        setMessages((prev) => [...prev, data]);
        setNewMessage("");
        await notifyOrganizer({
          event: brand.event,
          brandEmail,
          brandName: brand?.name || brandEmail,
          type: "message",
          message: `sent a message: "${newMessage.slice(0, 60)}${newMessage.length > 60 ? "..." : ""}"`,
        });
        // Email the organizer
        const emailResult = await sendEmail({
          to: brand?.organizer_email || "",

          subject: `New message from ${brand?.name}`,
          html: emailTemplate({
            title: `Message from ${brand?.name}`,
            message: newMessage,
            buttonText: "Reply in Nalpop",
            buttonUrl: `https://nalpop.com/organizer/events`,
          }),
        });
        if (!emailResult?.success)
          alert(
            "Your message was sent, but the organizer's email notification could not be sent.",
          );
      }
    });
  };

  const saveProfile = async () => {
    if (!brand) return;
    await runAction("Save profile", async () => {
      setSavingProfile(true);
      try {
        const { error } = await supabase
          .from("brands")
          .update({
            instagram: profileData.instagram,
            website: profileData.website,
            bio: profileData.bio,
          })
          .eq("id", brand.id)
          .select("id")
          .single();
        if (error) throw error;
        setBrand((prev) => (prev ? { ...prev, ...profileData } : prev));
        setEditingProfile(false);
      } finally {
        setSavingProfile(false);
      }
    });
  };

  const completed = deadlines.filter((d) => isCompleted(d.id)).length;
  const progress = deadlines.length
    ? Math.round((completed / deadlines.length) * 100)
    : 0;

  const handleLogout = async () => {
    await runAction("Sign out", async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/login";
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const inp = (style?: object) => ({
    padding: "8px 10px",
    border: "1px solid #e4ebe6",
    borderRadius: "8px",
    fontSize: "0.85rem",
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box" as const,
    ...style,
  });

  const tabs = [
    { key: "home", label: "Home" },
    { key: "shipments", label: "Shipments" },
    { key: "tasks", label: `Tasks (${completed}/${deadlines.length})` },
    { key: "files", label: "Files" },
    {
      key: "messages",
      label: `Messages${messages.length > 0 ? ` (${messages.length})` : ""}`,
    },
    { key: "inventory", label: "Inventory" },
    { key: "sales", label: "Sales & Payout" },
    { key: "profile", label: "Profile" },
    { key: "faq", label: "FAQ" },
  ];

  if (loading || loadError)
    return (
      <LoadingView
        loading={loading}
        error={loadError}
        onRetry={() => setRetry((value) => value + 1)}
        customLoader={<PageSkeleton label="Loading your portal" />}
        page
      />
    );

  if (!brand)
    return (
      <div
        className="[overflow-wrap:anywhere]"
        style={{
          minHeight: "100vh",
          background: "#f8faf8",
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "1.5rem",
              color: "#1B3A2D",
              marginBottom: "0.5rem",
            }}
          >
            NALPOP
          </div>
          <p style={{ color: "#4a5a52", marginBottom: "1rem" }}>
            No brand found for {userEmail}. Please contact your event organizer.
          </p>
          <button
            onClick={handleLogout}
            disabled={!!action}
            style={{
              padding: "8px 16px",
              background: "#1B3A2D",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {action ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    );

  return (
    <div
      className="[overflow-wrap:anywhere]"
      style={{ minHeight: "100vh", background: "#f8faf8" }}
    >
      {showTutorial && (
        <BrandTutorial
          brandName={brand?.name || ""}
          eventName={eventName}
          onClose={() => setShowTutorial(false)}
        />
      )}
      {action && (
        <div role="status" style={{ padding: "8px 1rem", color: "#1B3A2D" }}>
          {action} in progress...
        </div>
      )}
      <fieldset
        disabled={!!action}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
        {/* Top bar */}
        <div
          style={{
            background: "#fff",
            borderBottom: "1px solid #e4ebe6",
            padding: "1rem 2rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky" as const,
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "1.4rem",
                letterSpacing: "0.15em",
                color: "#1B3A2D",
              }}
            >
              NALPOP
            </div>
            <div
              style={{
                width: "2rem",
                height: "1px",
                background: "#E8C97A",
                marginTop: "2px",
              }}
            ></div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              minWidth: 0,
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "#4a5a52" }}>
              {brand.name}
            </span>
            <NotificationBell userEmail={userEmail} />
            <button
              onClick={() => { window.location.href = "/brand"; }}
              style={{
                fontSize: "0.8rem",
                padding: "5px 12px",
                background: "transparent",
                border: "1px solid #e4ebe6",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#4a5a52",
              }}
            >
              All events
            </button>
            <button
              onClick={handleLogout}
              style={{
                fontSize: "0.8rem",
                padding: "5px 12px",
                background: "transparent",
                border: "1px solid #e4ebe6",
                borderRadius: "8px",
                cursor: "pointer",
                color: "#4a5a52",
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Nav tabs */}
        <div
          role="navigation"
          aria-label="Portal sections"
          tabIndex={0}
          style={{
            background: "#fff",
            borderBottom: "1px solid #e4ebe6",
            padding: "0 1rem",
            display: "flex",
            gap: "0",
            overflowX: "auto" as const,
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(
                  tab.key as
                    | "home"
                    | "tasks"
                    | "files"
                    | "messages"
                    | "inventory"
                    | "sales"
                    | "shipments"
                    | "profile"
                    | "faq",
                )
              }
              style={{
                padding: "0.85rem 1.25rem",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.key
                    ? "2px solid #E8C97A"
                    : "2px solid transparent",
                color: activeTab === tab.key ? "#1B3A2D" : "#4a5a52",
                fontSize: "0.82rem",
                cursor: "pointer",
                whiteSpace: "nowrap" as const,
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "2rem 1.5rem",
          }}
        >
          {/* HOME TAB */}
          {activeTab === "home" && (
            <div>
              {/* Welcome card */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  padding: "1.75rem 2rem",
                  marginBottom: "1.5rem",
                  border: "1px solid #e4ebe6",
                }}
              >
                <div
                  style={{
                    fontSize: "0.75rem",
                    letterSpacing: "0.15em",
                    color: "#E8C97A",
                    marginBottom: "4px",
                  }}
                >
                  {organizerName.toUpperCase()}
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    color: "#1B3A2D",
                    marginBottom: "2px",
                  }}
                >
                  {eventName}
                  {eventDates ? ` · ${eventDates}` : ""}
                </div>
                {venueAddress && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "#4a5a52",
                      marginBottom: "1.25rem",
                    }}
                  >
                    {venueAddress}
                  </div>
                )}
                <h1
                  style={{
                    fontSize: "1.8rem",
                    color: "#1B3A2D",
                    fontWeight: "normal",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  Welcome,{" "}
                  <span style={{ fontStyle: "italic" }}>{brand.name}</span> 🖤
                </h1>
                <p
                  style={{
                    color: "#4a5a52",
                    marginTop: "1rem",
                    fontSize: "0.95rem",
                    lineHeight: 1.7,
                  }}
                >
                  This is your brand portal — everything you need to prepare for{" "}
                  {eventName} is right here. Work through your to-do list,
                  upload your inventory, track your shipment and reach out if
                  you have any questions.
                </p>
                <p
                  style={{
                    color: "#4a5a52",
                    marginTop: "0.75rem",
                    fontSize: "0.95rem",
                    lineHeight: 1.7,
                  }}
                >
                  Looking forward to having you at the event. 🌟
                </p>
              </div>

              {/* Fee tracker — only shown when event collects payments */}
              {collectPayments && <div
                style={{
                  background: "#1B3A2D",
                  borderRadius: "16px",
                  padding: "1.75rem 2rem",
                  marginBottom: "1.5rem",
                  color: "#fff",
                }}
              >
                <div
                  className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
                  style={{ alignItems: "center" }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#d4c87a",
                        letterSpacing: "0.15em",
                        marginBottom: "8px",
                      }}
                    >
                      PARTICIPATION FEE
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: "normal" }}>
                      {formatCurrency(Number(brand.fee_owed))}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#d4c87a",
                        letterSpacing: "0.15em",
                        marginBottom: "8px",
                      }}
                    >
                      PAID
                    </div>
                    <div
                      style={{
                        fontSize: "1.6rem",
                        color: "#90c9a0",
                        fontWeight: "normal",
                      }}
                    >
                      {formatCurrency(Number(brand.amount_paid))}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#d4c87a",
                        letterSpacing: "0.15em",
                        marginBottom: "8px",
                      }}
                    >
                      BALANCE DUE
                    </div>
                    <div
                      style={{
                        fontSize: "1.6rem",
                        color:
                          Number(brand.balance) > 0 ? "#e8c97a" : "#90c9a0",
                        fontWeight: "normal",
                      }}
                    >
                      {formatCurrency(Number(brand.balance))}
                    </div>
                    {Number(brand.balance) > 0 && (
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "#e8c97a",
                          marginTop: "4px",
                        }}
                      >
                        Payment outstanding
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      padding: "1rem",
                      textAlign: "center" as const,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "2.5rem",
                        color: "#1B3A2D",
                        lineHeight: 1,
                        fontWeight: "normal",
                      }}
                    >
                      {daysToEvent !== null ? daysToEvent : "—"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.65rem",
                        color: "#4a5a52",
                        marginTop: "6px",
                        letterSpacing: "0.1em",
                      }}
                    >
                      DAYS TO EVENT
                    </div>
                  </div>
                </div>
              </div>}

              {/* Announcements */}
              <Announcements
                event={brand.event}
                brandEmail={brandEmail}
                organizerEmail={brandOrgEmail}
              />

              {/* Shipment + Tasks side by side */}
              <div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                style={{ marginTop: "1.5rem" }}
              >
                {/* Shipment card */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    padding: "1.5rem",
                    border: "1px solid #e4ebe6",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveTab("shipments")}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#4a5a52",
                      letterSpacing: "0.15em",
                      marginBottom: "8px",
                    }}
                  >
                    SHIPMENTS
                  </div>
                  <div
                    style={{
                      fontSize: "1.8rem",
                      color: brandShipments.length > 0 ? "#4a7c59" : "#1B3A2D",
                      fontWeight: "normal",
                      marginBottom: "4px",
                    }}
                  >
                    {brandShipments.length}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "#4a5a52",
                      marginBottom: "8px",
                    }}
                  >
                    {brandShipments.length === 0
                      ? "No packages added yet"
                      : `package${brandShipments.length > 1 ? "s" : ""} · ${brandShipments.filter((s) => s.received).length} received`}
                  </div>
                  {brandShipments.slice(0, 2).map((s) => (
                    <div
                      key={s.id}
                      style={{
                        fontSize: "0.72rem",
                        color: "#4a5a52",
                        marginBottom: "2px",
                      }}
                    >
                      🚚 {s.courier}{" "}
                      {s.tracking_number && `· ${s.tracking_number}`}
                    </div>
                  ))}
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "#E8C97A",
                      marginTop: "8px",
                    }}
                  >
                    Manage shipments →
                  </div>
                </div>

                <div
                  style={{
                    background: "#fff",
                    borderRadius: "14px",
                    padding: "1.5rem",
                    border: "1px solid #e4ebe6",
                    cursor: "pointer",
                  }}
                  onClick={() => setActiveTab("tasks")}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#4a5a52",
                      letterSpacing: "0.15em",
                      marginBottom: "12px",
                    }}
                  >
                    TO-DO LIST
                  </div>
                  <div
                    style={{
                      fontSize: "2rem",
                      color: "#1B3A2D",
                      fontWeight: "normal",
                      lineHeight: 1,
                      marginBottom: "4px",
                    }}
                  >
                    {completed}
                    <span style={{ fontSize: "1rem", color: "#4a5a52" }}>
                      /{deadlines.length}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#4a5a52",
                      marginBottom: "12px",
                    }}
                  >
                    tasks completed
                  </div>
                  <div
                    style={{
                      height: "4px",
                      background: "#f0f4f1",
                      borderRadius: "2px",
                      overflow: "hidden",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progress}%`,
                        background: "#E8C97A",
                        borderRadius: "2px",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#E8C97A" }}>
                    View all tasks →
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === "shipments" && (
            <div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "1.5rem",
                  border: "1px solid #e4ebe6",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#4a5a52",
                      letterSpacing: "0.15em",
                    }}
                  >
                    SHIPMENT PACKAGES
                  </div>
                  <button
                    onClick={() => setAddingShipment(true)}
                    style={{
                      fontSize: "0.78rem",
                      padding: "5px 12px",
                      background: "#1B3A2D",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    + Add package
                  </button>
                </div>
                <div
                  style={{
                    background: "#f0f4f1",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    marginBottom: "12px",
                    borderLeft: "3px solid #1B3A2D",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "#1B3A2D",
                      letterSpacing: "0.08em",
                      marginBottom: "3px",
                    }}
                  >
                    SHIP TO
                  </div>
                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "#1c1714",
                      lineHeight: 1.6,
                    }}
                  >
                    {venueAddress ||
                      "Contact your organizer for shipping address"}
                  </div>
                </div>
                {addingShipment && (
                  <div
                    style={{
                      border: "1px solid #e4ebe6",
                      borderRadius: "10px",
                      padding: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      className="[&>input]:min-w-0 [&>select]:min-w-0"
                      style={{
                        display: "flex",
                        flexDirection: "column" as const,
                        gap: "8px",
                      }}
                    >
                      <input
                        placeholder="Description e.g. Box 1 - 10 dresses"
                        value={newShipment.description}
                        onChange={(e) =>
                          setNewShipment({
                            ...newShipment,
                            description: e.target.value,
                          })
                        }
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #e4ebe6",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                        }}
                      />
                      <select
                        value={newShipment.courier}
                        onChange={(e) =>
                          setNewShipment({
                            ...newShipment,
                            courier: e.target.value,
                          })
                        }
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #e4ebe6",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <option value="">Select courier...</option>
                        {[
                          "DHL",
                          "UPS",
                          "FedEx",
                          "USPS",
                          "Amgray Logistics",
                          "Other",
                        ].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Tracking number"
                        value={newShipment.tracking_number}
                        onChange={(e) =>
                          setNewShipment({
                            ...newShipment,
                            tracking_number: e.target.value,
                          })
                        }
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #e4ebe6",
                          borderRadius: "8px",
                          fontSize: "0.85rem",
                        }}
                      />
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={addShipmentPackage}
                          style={{
                            flex: 1,
                            padding: "8px",
                            background: "#1B3A2D",
                            color: "#fff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                          }}
                        >
                          Save package
                        </button>
                        <button
                          onClick={() => setAddingShipment(false)}
                          style={{
                            padding: "8px 12px",
                            background: "transparent",
                            border: "1px solid #e4ebe6",
                            borderRadius: "8px",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {brandShipments.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center" as const,
                      padding: "1.5rem",
                      color: "#4a5a52",
                      fontSize: "0.82rem",
                    }}
                  >
                    No packages added yet. Click + Add package to start.
                  </div>
                ) : (
                  brandShipments.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "10px 0",
                        borderBottom: "1px solid #f0f4f1",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>
                          {s.description || "Shipment package"}
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "#4a5a52",
                            marginTop: "2px",
                          }}
                        >
                          🚚 {s.courier}{" "}
                          {s.tracking_number && `· ${s.tracking_number}`}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: s.received ? "#4a7c5922" : "#E8C97A22",
                          color: s.received ? "#4a7c59" : "#b87333",
                        }}
                      >
                        {s.received ? "✓ Received" : "Shipped"}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "14px",
                  padding: "1.5rem",
                  border: "1px solid #e4ebe6",
                }}
              >
                <div
                  style={{
                    fontSize: "0.65rem",
                    color: "#4a5a52",
                    letterSpacing: "0.15em",
                    marginBottom: "8px",
                  }}
                >
                  SHIPPING INVOICES
                </div>
                <p
                  style={{
                    fontSize: "0.82rem",
                    color: "#4a5a52",
                    marginBottom: "1rem",
                  }}
                >
                  Upload invoices from your shipping carrier so your organizer
                  can reconcile payments.
                </p>
                <div
                  style={{
                    border: "1px dashed #e4ebe6",
                    borderRadius: "10px",
                    padding: "1rem",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2 [&>input]:min-w-0"
                    style={{ marginBottom: "8px" }}
                  >
                    <input
                      placeholder="Description e.g. DHL invoice"
                      value={newInvoiceDesc}
                      onChange={(e) => setNewInvoiceDesc(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #e4ebe6",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                      }}
                    />
                    <input
                      placeholder="Amount"
                      type="number"
                      value={newInvoiceAmount}
                      onChange={(e) => setNewInvoiceAmount(e.target.value)}
                      style={{
                        padding: "8px 10px",
                        border: "1px solid #e4ebe6",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                      }}
                    />
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setNewInvoiceFile(e.target.files?.[0] || null)
                    }
                    style={{
                      marginBottom: "8px",
                      fontSize: "0.82rem",
                      width: "100%",
                    }}
                  />
                  <button
                    onClick={uploadShipmentInvoice}
                    disabled={uploadingInvoice || !newInvoiceFile}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#1B3A2D",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                    }}
                  >
                    {uploadingInvoice ? "Uploading..." : "↑ Upload invoice"}
                  </button>
                </div>
                {shipmentInvoices.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center" as const,
                      padding: "1.5rem",
                      color: "#4a5a52",
                      fontSize: "0.82rem",
                    }}
                  >
                    No invoices uploaded yet.
                  </div>
                ) : (
                  shipmentInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid #f0f4f1",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>
                          {inv.description || inv.file_name}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#4a5a52" }}>
                          {new Date(inv.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" },
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                          alignItems: "center",
                        }}
                      >
                        {inv.amount > 0 && (
                          <span
                            style={{ fontSize: "0.85rem", color: "#1B3A2D" }}
                          >
                            {formatCurrency(Number(inv.amount))}
                          </span>
                        )}
                        <a
                          href={inv.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "0.75rem",
                            padding: "4px 10px",
                            background: "#f0f4f1",
                            color: "#1B3A2D",
                            borderRadius: "6px",
                            textDecoration: "none",
                          }}
                        >
                          ↓
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "tasks" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.5rem",
                border: "1px solid #e4ebe6",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <div style={{ fontSize: "1rem", color: "#1B3A2D" }}>
                  Your to-do list
                </div>
                <div style={{ fontSize: "0.8rem", color: "#4a5a52" }}>
                  {completed} of {deadlines.length} complete
                </div>
              </div>
              <div
                style={{
                  height: "5px",
                  background: "#f0f4f1",
                  borderRadius: "3px",
                  marginBottom: "1.25rem",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "#E8C97A",
                    borderRadius: "3px",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              {deadlines.length === 0 && (
                <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>
                  No tasks assigned yet.
                </p>
              )}
              {deadlines.map((deadline) => {
                const done = isCompleted(deadline.id);
                const isSaving = saving === deadline.id;
                return (
                  <div
                    key={deadline.id}
                    onClick={() => !action && !isSaving && toggleTask(deadline)}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 8px",
                      borderRadius: "8px",
                      cursor: isSaving ? "wait" : "pointer",
                      opacity: isSaving ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f8faf8")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: done ? "none" : "2px solid #d4c5b0",
                        background: done ? "#E8C97A" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                    >
                      {done && (
                        <span style={{ color: "#fff", fontSize: "11px" }}>
                          ✓
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: done ? "#b0a090" : "#1B3A2D",
                          textDecoration: done ? "line-through" : "none",
                        }}
                      >
                        {deadline.task}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "8px",
                          marginTop: "2px",
                        }}
                      >
                        <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>
                          Due {deadline.due_date}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "1px 6px",
                            borderRadius: "10px",
                            background:
                              (categoryColors[deadline.category] || "#4a5a52") +
                              "22",
                            color:
                              categoryColors[deadline.category] || "#4a5a52",
                          }}
                        >
                          {deadline.category}
                        </span>
                      </div>
                    </div>
                    {isSaving && (
                      <span style={{ fontSize: "0.75rem", color: "#4a5a52" }}>
                        Saving...
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* FILES TAB */}
          {activeTab === "files" && (
            <div>
              <div
                style={{
                  background: "#fff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                  border: "1px solid #e4ebe6",
                }}
              >
                <div
                  style={{
                    fontSize: "1rem",
                    color: "#1B3A2D",
                    marginBottom: "0.5rem",
                  }}
                >
                  Upload your brand files
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#4a5a52",
                    lineHeight: 1.7,
                    marginBottom: "1.5rem",
                  }}
                >
                  Please upload the files below so we can best represent your
                  brand at the pop-up. All files are securely stored and only
                  accessible to the organizer.
                </p>
                <div
                  style={{
                    display: "grid",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {FILE_CATEGORIES.map((cat) => (
                    <div
                      key={cat.key}
                      style={{
                        padding: "1rem",
                        background: "#f8faf8",
                        borderRadius: "10px",
                        border: "1px solid #f0f4f1",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.88rem",
                          color: "#1B3A2D",
                          fontWeight: 500,
                          marginBottom: "2px",
                        }}
                      >
                        {cat.label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "#4a5a52",
                          marginBottom: "8px",
                        }}
                      >
                        {cat.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <FileUpload
                brandName={brand.name}
                brandEmail={brandEmail}
                event={brand.event}
              />
            </div>
          )}

          {/* MESSAGES TAB */}
          {activeTab === "messages" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.5rem",
                border: "1px solid #e4ebe6",
              }}
            >
              <div
                style={{
                  fontSize: "1rem",
                  color: "#1B3A2D",
                  marginBottom: "1.5rem",
                }}
              >
                Messages with {organizerName}
              </div>
              <div
                style={{
                  height: "400px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "12px",
                  marginBottom: "1rem",
                  padding: "0.5rem",
                }}
              >
                {messages.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#4a5a52",
                      fontSize: "0.85rem",
                      marginTop: "3rem",
                    }}
                  >
                    No messages yet. Send a message to {organizerName} below.
                  </div>
                )}
                {messages.map((msg) => {
                  const isMe = msg.sender_email === userEmail;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: "column" as const,
                        alignItems: isMe ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "#4a5a52",
                          marginBottom: "3px",
                        }}
                      >
                        {msg.sender_name}
                      </div>
                      <div
                        style={{
                          maxWidth: "70%",
                          padding: "10px 14px",
                          borderRadius: isMe
                            ? "14px 14px 4px 14px"
                            : "14px 14px 14px 4px",
                          background: isMe ? "#1B3A2D" : "#f8faf8",
                          color: isMe ? "#fff" : "#1B3A2D",
                          fontSize: "0.88rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.message}
                      </div>
                      <div
                        style={{
                          fontSize: "0.65rem",
                          color: "#b0a090",
                          marginTop: "3px",
                        }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  placeholder="Write a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  style={inp({ flex: 1 })}
                />
                <button
                  onClick={sendMessage}
                  style={{
                    padding: "8px 18px",
                    background: "#1B3A2D",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === "inventory" && (
            <BrandInventory
              event={brand.event}
              brandEmail={brandEmail}
              brandName={brand.name}
            />
          )}

          {/* SALES TAB */}
          {activeTab === "sales" && (
            <BrandSales event={brand.event} brandEmail={brandEmail} />
          )}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.5rem",
                border: "1px solid #e4ebe6",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ fontSize: "1rem", color: "#1B3A2D" }}>
                  Brand profile
                </div>
                {!editingProfile ? (
                  <button
                    onClick={() => setEditingProfile(true)}
                    style={{
                      fontSize: "0.8rem",
                      padding: "5px 14px",
                      background: "transparent",
                      border: "1px solid #e4ebe6",
                      borderRadius: "8px",
                      cursor: "pointer",
                      color: "#4a5a52",
                    }}
                  >
                    Edit profile
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={saveProfile}
                      disabled={savingProfile}
                      style={{
                        fontSize: "0.8rem",
                        padding: "5px 14px",
                        background: "#1B3A2D",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      {savingProfile ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingProfile(false)}
                      style={{
                        fontSize: "0.8rem",
                        padding: "5px 14px",
                        background: "transparent",
                        border: "1px solid #e4ebe6",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#4a5a52",
                    letterSpacing: "0.12em",
                    marginBottom: "6px",
                  }}
                >
                  BRAND NAME
                </div>
                <div style={{ fontSize: "1.1rem", color: "#1B3A2D" }}>
                  {brand.name}
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#4a5a52",
                    letterSpacing: "0.12em",
                    marginBottom: "6px",
                  }}
                >
                  EMAIL
                </div>
                <div style={{ fontSize: "0.9rem", color: "#1B3A2D" }}>
                  {brand.email}
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#4a5a52",
                    letterSpacing: "0.12em",
                    marginBottom: "6px",
                  }}
                >
                  INSTAGRAM
                </div>
                {editingProfile ? (
                  <input
                    placeholder="@yourbrand"
                    value={profileData.instagram}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        instagram: e.target.value,
                      })
                    }
                    style={inp()}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: brand.instagram ? "#1B3A2D" : "#b0a090",
                    }}
                  >
                    {brand.instagram || "Not added yet"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#4a5a52",
                    letterSpacing: "0.12em",
                    marginBottom: "6px",
                  }}
                >
                  WEBSITE
                </div>
                {editingProfile ? (
                  <input
                    placeholder="https://yourbrand.com"
                    value={profileData.website}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        website: e.target.value,
                      })
                    }
                    style={inp()}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: brand.website ? "#1B3A2D" : "#b0a090",
                    }}
                  >
                    {brand.website || "Not added yet"}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "#4a5a52",
                    letterSpacing: "0.12em",
                    marginBottom: "6px",
                  }}
                >
                  BRAND BIO
                </div>
                {editingProfile ? (
                  <textarea
                    placeholder="Tell us about your brand..."
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    style={{
                      ...inp(),
                      height: "100px",
                      resize: "vertical" as const,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      fontSize: "0.9rem",
                      color: brand.bio ? "#1B3A2D" : "#b0a090",
                      lineHeight: 1.6,
                    }}
                  >
                    {brand.bio || "Not added yet"}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FAQ TAB */}
          {activeTab === "faq" && (
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1.5rem",
                border: "1px solid #e4ebe6",
              }}
            >
              <div
                style={{
                  fontSize: "1rem",
                  color: "#1B3A2D",
                  marginBottom: "1rem",
                }}
              >
                Frequently asked questions
              </div>
              {faqs.length === 0 ? (
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "#4a5a52",
                    padding: "1rem 0",
                  }}
                >
                  No FAQs added yet. Contact your organizer directly with any
                  questions.
                </div>
              ) : (
                faqs.map((faq, i) => (
                  <div
                    key={i}
                    style={{
                      borderBottom:
                        i < faqs.length - 1 ? "1px solid #f0f4f1" : "none",
                    }}
                  >
                    <div
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.85rem 0",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#1B3A2D",
                          paddingRight: "1rem",
                        }}
                      >
                        {faq.q}
                      </div>
                      <div
                        style={{
                          color: "#E8C97A",
                          fontSize: "1.2rem",
                          flexShrink: 0,
                        }}
                      >
                        {openFaq === i ? "−" : "+"}
                      </div>
                    </div>
                    {openFaq === i && (
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "#4a5a52",
                          lineHeight: 1.7,
                          paddingBottom: "0.85rem",
                        }}
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}

export default function BrandPortal() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#f8faf8" }} />}>
      <BrandPortalInner />
    </Suspense>
  );
}
