"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { listBrandFiles, type BrandFile } from "@/lib/cloudinary";
import { formatCurrency, formatEventName } from "@/lib/events";
import LoadingView from "@/components/LoadingView";
import Link from "next/link";
import { useParams } from "next/navigation";

type Brand = {
  id: number;
  name: string;
  email: string;
  fee_owed: number;
  amount_paid: number;
  balance: number;
  status: string;
  invited: boolean;
  shipped: boolean;
  shipped_at: string;
};

type Deadline = {
  id: number;
  task: string;
  due_date: string;
  category: string;
};
type BrandTask = {
  id: number;
  deadline_id: number;
  completed: boolean;
  task: string;
};
type Member = { id: number; member_email: string };
type Note = { id: number; content: string; created_at: string };
type FileApproval = { file_name: string; status: string };

class ActionError extends Error {}

type UploadedFile = BrandFile;

const CATEGORIES = [
  "Brand logo",
  "Product photos",
  "Marketing assets",
  "Inventory sheet",
  "Digital brand book",
  "Other",
];

const CATEGORY_TASK_MAP: Record<string, number> = {
  "Brand logo": 20,
  "Product photos": 21,
  "Marketing assets": 13,
  "Inventory sheet": 15,
  "Digital brand book": 22,
};

const statusColor = (s: string) => {
  if (s === "Paid") return { background: "#4a7c5922", color: "#4a7c59" };
  if (s === "Partial") return { background: "#E8C97A22", color: "#E8C97A" };
  return { background: "#c0392b22", color: "#c0392b" };
};

const PencilIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const XIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ResetIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

function BrandSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading brand details"
      className="w-full animate-pulse space-y-6"
    >
      <div aria-hidden="true" className="space-y-3">
        <div className="h-4 w-32 rounded bg-[#e4ebe6]" />
        <div className="h-9 w-48 max-w-full rounded bg-[#e4ebe6]" />
      </div>
      <div
        aria-hidden="true"
        className="grid grid-cols-3 gap-4 rounded-xl bg-[#1B3A2D] p-6"
      >
        {[0, 1, 2].map((index) => (
          <div key={index} className="space-y-3">
            <div className="h-3 w-20 max-w-full rounded bg-[#4a6b5b]" />
            <div className="h-7 w-24 max-w-full rounded bg-[#4a6b5b]" />
          </div>
        ))}
      </div>
      {[0, 1, 2, 3].map((index) => (
        <div
          aria-hidden="true"
          key={index}
          className="space-y-4 rounded-xl border border-[#e4ebe6] bg-white p-6"
        >
          <div className="h-4 w-36 rounded bg-[#e4ebe6]" />
          <div className="h-8 w-full rounded bg-[#e4ebe6]" />
          <div className="h-8 w-3/4 rounded bg-[#e4ebe6]" />
        </div>
      ))}
    </div>
  );
}

export default function OrganizerBrandPage() {
  const params = useParams();
  const brandSlug = decodeURIComponent(params.brand as string);
  const slug = params.slug as string;
  return (
    <BrandPage
      key={JSON.stringify([slug, brandSlug])}
      slug={slug}
      brandSlug={brandSlug}
    />
  );
}

function BrandPage({ slug, brandSlug }: { slug: string; brandSlug: string }) {
  const eventName = slug.charAt(0).toUpperCase() + slug.slice(1);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [eventCity, setEventCity] = useState(eventName);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<BrandTask[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [approvals, setApprovals] = useState<FileApproval[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<
    {
      id: number;
      sender_name: string;
      sender_email: string;
      message: string;
      created_at: string;
    }[]
  >([]);
  const [newMessage, setNewMessage] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingPayment, setEditingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newFee, setNewFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [action, setAction] = useState<string | null>(null);
  const actionRef = useRef(false);
  const [userEmail, setUserEmail] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

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
        if (authError) throw authError;
        if (!user?.email) throw new Error("Please sign in to view this brand.");
        const orgEmail = user.email;

        // Resolve event city from DB (slug may include a timestamp suffix)
        const { data: eventRow, error: eventError } = await supabase
          .from("events")
          .select("city")
          .eq("slug", slug)
          .maybeSingle();
        if (eventError) throw eventError;
        const resolvedCity = eventRow?.city || eventName;

        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .select("*")
          .eq("event", formatEventName(slug))
          .eq("organizer_email", orgEmail)
          .ilike("name", brandSlug)
          .maybeSingle();
        if (brandError) throw brandError;
        if (!brandData) {
          if (active) setBrand(null);
          return;
        }

        const [
          deadlineRes,
          taskRes,
          memberRes,
          noteRes,
          approvalRes,
          messagesRes,
        ] = await Promise.all([
          supabase
            .from("event_deadlines")
            .select("*")
            .eq("event", formatEventName(slug))
            .eq("organizer_email", orgEmail)
            .order("id"),
          supabase
            .from("brand_tasks")
            .select("*")
            .eq("brand_email", brandData.email)
            .eq("event", formatEventName(slug)),
          supabase
            .from("brand_members")
            .select("*")
            .eq("brand_email", brandData.email)
            .eq("event", formatEventName(slug)),
          supabase
            .from("brand_notes")
            .select("*")
            .eq("brand_email", brandData.email)
            .eq("event", formatEventName(slug))
            .order("created_at", { ascending: false }),
          supabase
            .from("file_approvals")
            .select("*")
            .eq("brand_email", brandData.email)
            .eq("event", formatEventName(slug)),
          supabase
            .from("brand_messages")
            .select("*")
            .eq("brand_email", brandData.email)
            .eq("event", formatEventName(slug))
            .order("created_at"),
        ]);

        const queryError =
          deadlineRes.error ||
          taskRes.error ||
          memberRes.error ||
          noteRes.error ||
          approvalRes.error ||
          messagesRes.error;
        if (queryError) throw queryError;
        const filesWithUrls = await listBrandFiles(slug, brandData.email);
        if (!active) return;
        setUserEmail(orgEmail);
        setEventCity(resolvedCity);
        setBrand(brandData);
        setDeadlines(deadlineRes.data ?? []);
        setTasks(taskRes.data ?? []);
        setMembers(memberRes.data ?? []);
        setNotes(noteRes.data ?? []);
        setApprovals(approvalRes.data ?? []);
        setMessages(messagesRes.data ?? []);
        setFiles(filesWithUrls);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load brand:", error);
        setLoadError(
          error instanceof Error &&
            error.message === "Please sign in to view this brand."
            ? error.message
            : "Could not load brand details. Please try again.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchAll();
    return () => {
      active = false;
    };
  }, [brandSlug, slug, eventName, retry]);

  const runAction = async (
    key: string,
    message: string,
    callback: () => Promise<void>,
  ) => {
    if (actionRef.current) return;
    actionRef.current = true;
    setAction(key);
    try {
      await callback();
    } catch (error) {
      console.error(message, error);
      alert(error instanceof ActionError ? error.message : message);
    } finally {
      actionRef.current = false;
      setAction(null);
    }
  };

  const getApprovalStatus = (fileName: string) =>
    approvals.find((a) => a.file_name === fileName)?.status || "pending";

  const setApprovalStatus = async (
    fileName: string,
    status: string,
    fileCategory: string,
  ) => {
    if (!brand) return;
    await runAction(
      "approval",
      "Could not update file approval. Please try again.",
      async () => {
        const existing = approvals.find((a) => a.file_name === fileName);
        if (existing) {
          const { error } = await supabase
            .from("file_approvals")
            .update({ status })
            .eq("brand_email", brand.email)
            .eq("event", formatEventName(slug))
            .eq("file_name", fileName)
            .select("file_name")
            .single();
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("file_approvals")
            .insert({
              brand_email: brand.email,
              event: formatEventName(slug),
              file_name: fileName,
              status,
            });
          if (error) throw error;
        }
        setApprovals((prev) => [
          ...prev.filter((a) => a.file_name !== fileName),
          { file_name: fileName, status },
        ]);

        const deadlineId = CATEGORY_TASK_MAP[fileCategory];
        if (!deadlineId) return;
        try {
          const { data: existingTask, error: taskError } = await supabase
            .from("brand_tasks")
            .select("*")
            .eq("brand_email", brand.email)
            .eq("event", formatEventName(slug))
            .eq("deadline_id", deadlineId)
            .maybeSingle();
          if (taskError) throw taskError;
          if (existingTask) {
            const completed = status === "approved";
            const { error } = await supabase
              .from("brand_tasks")
              .update({ completed })
              .eq("id", existingTask.id)
              .select("id")
              .single();
            if (error) throw error;
            setTasks((prev) =>
              prev.map((t) =>
                t.deadline_id === deadlineId ? { ...t, completed } : t,
              ),
            );
          }
        } catch (error) {
          console.error("Failed to update related checklist task:", error);
          throw new ActionError(
            "File approval was saved, but its checklist task could not be updated. Please retry.",
          );
        }
      },
    );
  };

  const inviteBrand = async () => {
    if (!brand?.email) {
      alert("This brand has no email address.");
      return;
    }
    await runAction(
      "invite",
      "Could not send invite. Please try again.",
      async () => {
        const res = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: brand.email }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || data.error)
          throw new Error(data.error || "Invite request failed.");
        try {
          const { error } = await supabase
            .from("brands")
            .update({ invited: true })
            .eq("id", brand.id)
            .select("id")
            .single();
          if (error) throw error;
        } catch (error) {
          console.error("Failed to record brand invitation:", error);
          throw new ActionError(
            "Invitation was sent, but its status could not be saved. Check before sending it again.",
          );
        }
        setBrand((prev) => (prev ? { ...prev, invited: true } : prev));
        alert(`Invitation sent to ${brand.email}`);
      },
    );
  };

  const addMember = async () => {
    if (!brand) return;
    if (!newMemberEmail.trim()) {
      alert("Enter a team member email.");
      return;
    }
    await runAction(
      "member",
      "Could not send invite. Please try again.",
      async () => {
        const res = await fetch("/api/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: newMemberEmail }),
        });
        const data = await res.json();
        if (!res.ok || !data.success || data.error)
          throw new Error(data.error || "Invite request failed.");
        try {
          const { data: memberData, error } = await supabase
            .from("brand_members")
            .insert({
              brand_email: brand.email,
              member_email: newMemberEmail,
              event: formatEventName(slug),
            })
            .select()
            .single();
          if (error) throw error;
          if (!memberData) throw new Error("Saved member was not returned.");
          setMembers((prev) => [...prev, memberData]);
        } catch (error) {
          console.error("Failed to save invited team member:", error);
          throw new ActionError(
            "Invitation was sent, but the team member could not be saved. Check before sending it again.",
          );
        }
        alert(`Invitation sent to ${newMemberEmail}`);
        setNewMemberEmail("");
      },
    );
  };

  const updatePayment = async () => {
    if (!brand) return;
    const paid = Number(newAmount);
    const fee = Number(newFee);
    if (
      !newAmount.trim() ||
      !newFee.trim() ||
      !Number.isFinite(paid) ||
      !Number.isFinite(fee) ||
      paid < 0 ||
      fee < 0
    ) {
      alert("Enter valid non-negative payment amounts.");
      return;
    }
    await runAction(
      "payment",
      "Could not save payment. Please try again.",
      async () => {
        const balance = fee - paid;
        const status = balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
        const { error } = await supabase
          .from("brands")
          .update({ amount_paid: paid, fee_owed: fee, balance, status })
          .eq("id", brand.id)
          .select("id")
          .single();
        if (error) throw error;
        setBrand((prev) =>
          prev
            ? { ...prev, amount_paid: paid, fee_owed: fee, balance, status }
            : prev,
        );
        setEditingPayment(false);
        setNewAmount("");
        setNewFee("");
      },
    );
  };

  const addNote = async () => {
    if (!brand) return;
    if (!newNote.trim()) {
      alert("Enter a note.");
      return;
    }
    await runAction(
      "note",
      "Could not add note. Please try again.",
      async () => {
        const { data, error } = await supabase
          .from("brand_notes")
          .insert({
            brand_email: brand.email,
            event: formatEventName(slug),
            content: newNote,
          })
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error("Saved note was not returned.");
        setNotes((prev) => [data, ...prev]);
        setNewNote("");
      },
    );
  };

  const deleteNote = async (id: number) => {
    await runAction(
      "delete-note",
      "Could not delete note. Please try again.",
      async () => {
        const { error } = await supabase
          .from("brand_notes")
          .delete()
          .eq("id", id)
          .select("id")
          .single();
        if (error) throw error;
        setNotes((prev) => prev.filter((n) => n.id !== id));
      },
    );
  };

  const isCompleted = (deadlineId: number) =>
    tasks.find((t) => t.deadline_id === deadlineId)?.completed || false;

  const completed = deadlines.filter((d) => isCompleted(d.id)).length;
  const progress = deadlines.length
    ? Math.round((completed / deadlines.length) * 100)
    : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles =
    selectedCategory === "All"
      ? files
      : files.filter((f) => f.category === selectedCategory);

  const approvalBadge = (status: string) => {
    if (status === "approved")
      return { background: "#4a7c5922", color: "#4a7c59", label: "Approved" };
    if (status === "revision")
      return {
        background: "#c0392b22",
        color: "#c0392b",
        label: "Needs revision",
      };
    return { background: "#f0f4f1", color: "#4a5a52", label: "Pending" };
  };

  if (loading || loadError)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8faf8",
          padding: "2rem 1.5rem",
        }}
      >
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <LoadingView
            loading={loading}
            error={loadError}
            onRetry={() => setRetry((value) => value + 1)}
            customLoader={<BrandSkeleton />}
          />
        </div>
      </div>
    );

  if (!brand)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8faf8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#4a5a52" }}>Brand not found</p>
          <Link href={`/organizer/events/${slug}`} style={{ color: "#E8C97A" }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    );

  const sendMessage = async () => {
    if (!brand) return;
    if (!newMessage.trim()) {
      alert("Enter a message.");
      return;
    }
    await runAction(
      "message",
      "Could not send message. Please try again.",
      async () => {
        const { data, error } = await supabase
          .from("brand_messages")
          .insert({
            event: formatEventName(slug),
            brand_email: brand.email,
            organizer_email: userEmail,
            sender_email: userEmail,
            sender_name: userEmail,
            message: newMessage.trim(),
          })
          .select()
          .single();
        if (error) throw error;
        if (!data) throw new Error("Sent message was not returned.");
        setMessages((prev) => [...prev, data]);
        setNewMessage("");
      },
    );
  };

  const downloadFile = async (url: string, filename: string) => {
    await runAction(
      "download",
      "Could not download file. Please try again.",
      async () => {
        const response = await fetch(url);
        if (!response.ok)
          throw new Error(`Download failed (${response.status}).`);
        const blob = await response.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        try {
          a.download = filename;
          a.click();
        } finally {
          URL.revokeObjectURL(a.href);
        }
      },
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8faf8",
        padding: "2rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {action && (
          <div role="status" style={{ color: "#4a5a52", marginBottom: "1rem" }}>
            {action === "download"
              ? "Downloading file..."
              : action === "invite" || action === "member"
                ? "Sending invitation..."
                : action === "message"
                  ? "Sending message..."
                  : "Saving changes..."}
          </div>
        )}
        <fieldset
          disabled={action !== null}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          {/* Header */}
          <div style={{ marginBottom: "1.5rem" }}>
            <Link
              href={`/organizer/events/${slug}`}
              style={{
                fontSize: "0.85rem",
                color: "#4a5a52",
                textDecoration: "none",
              }}
            >
              ← Back to {eventName}
            </Link>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginTop: "0.5rem",
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: "2rem",
                    color: "#1B3A2D",
                    fontWeight: "normal",
                    fontStyle: "italic",
                    margin: 0,
                  }}
                >
                  {brand.name}
                </h1>
                <span
                  style={{
                    fontSize: "0.8rem",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    ...statusColor(brand.status),
                  }}
                >
                  {brand.status}
                </span>
              </div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                {!brand.invited ? (
                  <button
                    onClick={inviteBrand}
                    title="Send invite"
                    style={{
                      background: "transparent",
                      border: "1px solid #e4ebe6",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      color: "#4a5a52",
                      fontSize: "1rem",
                    }}
                  >
                    {action === "invite" ? "..." : "✉"}
                  </button>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "4px 10px",
                        borderRadius: "20px",
                        background: "#4a7c5922",
                        color: "#4a7c59",
                      }}
                    >
                      ✓ Invited
                    </span>
                    <button
                      onClick={inviteBrand}
                      title="Resend invite"
                      style={{
                        background: "transparent",
                        border: "1px solid #e4ebe6",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        cursor: "pointer",
                        color: "#4a5a52",
                        fontSize: "0.75rem",
                      }}
                    >
                      {action === "invite" ? "..." : "Resend invite"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment card */}
          <div
            style={{
              background: "#1B3A2D",
              borderRadius: "12px",
              padding: "1.5rem 2rem",
              marginBottom: "1.5rem",
              color: "#fff",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr auto",
              gap: "1rem",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#d4c87a",
                  marginBottom: "4px",
                }}
              >
                PARTICIPATION FEE
              </div>
              {editingPayment ? (
                <input
                  type="number"
                  value={newFee}
                  onChange={(e) => setNewFee(e.target.value)}
                  style={{
                    width: "80px",
                    padding: "4px",
                    border: "1px solid #E8C97A",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    background: "#fff",
                    color: "#1B3A2D",
                  }}
                  placeholder="Fee"
                />
              ) : (
                <div style={{ fontSize: "1.4rem" }}>
                  {formatCurrency(Number(brand.fee_owed))}
                </div>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#d4c87a",
                  marginBottom: "4px",
                }}
              >
                PAID
              </div>
              {editingPayment ? (
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  style={{
                    width: "80px",
                    padding: "4px",
                    border: "1px solid #E8C97A",
                    borderRadius: "4px",
                    fontSize: "1rem",
                    background: "#fff",
                    color: "#1B3A2D",
                  }}
                  placeholder="Paid"
                  autoFocus
                />
              ) : (
                <div style={{ fontSize: "1.4rem" }}>
                  {formatCurrency(Number(brand.amount_paid))}
                </div>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "#d4c87a",
                  marginBottom: "4px",
                }}
              >
                BALANCE
              </div>
              <div
                style={{
                  fontSize: "1.4rem",
                  color: Number(brand.balance) > 0 ? "#e8c97a" : "#90c9a0",
                }}
              >
                {formatCurrency(Number(brand.balance))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {editingPayment ? (
                <>
                  <button
                    onClick={updatePayment}
                    style={{
                      padding: "6px 12px",
                      background: "#E8C97A",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    {action === "payment" ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingPayment(false)}
                    style={{
                      padding: "6px 12px",
                      background: "transparent",
                      border: "1px solid #d4c87a44",
                      color: "#d4c87a",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setEditingPayment(true);
                    setNewAmount(String(brand.amount_paid));
                    setNewFee(String(brand.fee_owed));
                  }}
                  title="Edit payment"
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#d4c87a",
                    padding: "4px",
                  }}
                >
                  <PencilIcon />
                </button>
              )}
            </div>
          </div>

          {/* Shipping status */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              marginBottom: "1.5rem",
              border: "1px solid #e4ebe6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#4a5a52",
                  letterSpacing: "0.08em",
                  marginBottom: "4px",
                }}
              >
                SHIPMENT STATUS
              </div>
              {brand.shipped ? (
                <div>
                  <div style={{ fontSize: "0.95rem", color: "#4a7c59" }}>
                    Products shipped ✓
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#4a5a52",
                      marginTop: "2px",
                    }}
                  >
                    Marked on {formatDate(brand.shipped_at)}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.95rem", color: "#E8C97A" }}>
                  Not yet shipped
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: "0.8rem",
                padding: "4px 12px",
                borderRadius: "20px",
                background: brand.shipped ? "#4a7c5922" : "#E8C97A22",
                color: brand.shipped ? "#4a7c59" : "#E8C97A",
              }}
            >
              {brand.shipped ? "Shipped" : "Pending"}
            </span>
          </div>

          {/* Portal Access */}
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
                fontSize: "0.9rem",
                color: "#1B3A2D",
                marginBottom: "1rem",
              }}
            >
              Portal access
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "1rem",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#4a5a52",
                    marginBottom: "2px",
                  }}
                >
                  PRIMARY EMAIL
                </div>
                <div style={{ fontSize: "0.9rem", color: "#1B3A2D" }}>
                  {brand.email || "No email set"}
                </div>
              </div>
              {brand.email && !brand.invited && (
                <button
                  onClick={inviteBrand}
                  title="Send invite"
                  style={{
                    background: "transparent",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    color: "#4a5a52",
                    fontSize: "1rem",
                  }}
                >
                  {action === "invite" ? "..." : "✉"}
                </button>
              )}
              {brand.invited && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "3px 8px",
                    borderRadius: "20px",
                    background: "#4a7c5922",
                    color: "#4a7c59",
                  }}
                >
                  ✓ Invited
                </span>
              )}
            </div>

            {members.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#4a5a52",
                    marginBottom: "6px",
                  }}
                >
                  TEAM MEMBERS
                </div>
                {members.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 0",
                      borderBottom: "1px solid #f0f4f1",
                      fontSize: "0.85rem",
                      color: "#1B3A2D",
                    }}
                  >
                    <span style={{ color: "#4a7c59" }}>✓</span>
                    {m.member_email}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", marginTop: "0.5rem" }}>
              <input
                type="email"
                placeholder="Add team member email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                }}
              />
              <button
                onClick={addMember}
                title="Send invite"
                style={{
                  background: "transparent",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  color: "#4a5a52",
                  fontSize: "1rem",
                }}
              >
                {action === "member" ? "..." : "✉"}
              </button>
            </div>
          </div>

          {/* Checklist Progress */}
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ fontSize: "0.9rem", color: "#1B3A2D" }}>
                Checklist progress
              </div>
              <div style={{ fontSize: "0.8rem", color: "#4a5a52" }}>
                {completed} of {deadlines.length} complete · {progress}%
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
            {deadlines.map((deadline) => {
              const done = isCompleted(deadline.id);
              return (
                <div
                  key={deadline.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "8px",
                    borderRadius: "8px",
                    marginBottom: "2px",
                  }}
                >
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      border: done ? "none" : "2px solid #d4c5b0",
                      background: done ? "#E8C97A" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {done && (
                      <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: done ? "#b0a090" : "#1B3A2D",
                        textDecoration: done ? "line-through" : "none",
                      }}
                    >
                      {deadline.task}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>
                      Due {deadline.due_date}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      background: done ? "#4a7c5922" : "#f0f4f1",
                      color: done ? "#4a7c59" : "#4a5a52",
                    }}
                  >
                    {done ? "Done" : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Uploaded Files */}
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
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: "0.9rem", color: "#1B3A2D" }}>
                Uploaded files
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: "5px 10px",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  color: "#1B3A2D",
                  background: "#f8faf8",
                }}
              >
                <option>All</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            {filteredFiles.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>
                No files uploaded yet.
              </p>
            ) : (
              filteredFiles.map((file, i) => {
                const approval = getApprovalStatus(file.name);
                const badge = approvalBadge(approval);
                return (
                  <div
                    key={i}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "#f8faf8",
                      marginBottom: "8px",
                      border: "1px solid #f0f4f1",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span style={{ fontSize: "0.85rem", color: "#c8bfb5" }}>
                        {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                          ? "▣"
                          : file.name.match(/\.pdf$/i)
                            ? "▤"
                            : file.name.match(/\.(xlsx|csv|xls)$/i)
                              ? "▦"
                              : "▢"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "#1B3A2D",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {file.name}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>
                          {file.category} · {formatSize(file.size)} ·{" "}
                          {formatDate(file.uploaded_at)}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: "20px",
                          background: badge.background,
                          color: badge.color,
                          whiteSpace: "nowrap" as const,
                        }}
                      >
                        {badge.label}
                      </span>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          background: "transparent",
                          border: "1px solid #e4ebe6",
                          borderRadius: "6px",
                          color: "#4a5a52",
                          textDecoration: "none",
                        }}
                      >
                        View
                      </a>
                      <button
                        onClick={() => downloadFile(file.url, file.name)}
                        style={{
                          fontSize: "11px",
                          padding: "3px 8px",
                          background: "#1B3A2D",
                          color: "#fff",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        ↓
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        marginTop: "8px",
                        paddingLeft: "27px",
                        alignItems: "center",
                      }}
                    >
                      <button
                        onClick={() =>
                          setApprovalStatus(
                            file.name,
                            "approved",
                            file.category,
                          )
                        }
                        title="Approve"
                        style={{
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            approval === "approved" ? "#4a7c59" : "transparent",
                          color: approval === "approved" ? "#fff" : "#4a7c59",
                          border: "1px solid #4a7c5944",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <CheckIcon />
                      </button>
                      <button
                        onClick={() =>
                          setApprovalStatus(
                            file.name,
                            "revision",
                            file.category,
                          )
                        }
                        title="Needs revision"
                        style={{
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            approval === "revision" ? "#c0392b" : "transparent",
                          color: approval === "revision" ? "#fff" : "#c0392b",
                          border: "1px solid #c0392b44",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <XIcon />
                      </button>
                      <button
                        onClick={() =>
                          setApprovalStatus(file.name, "pending", file.category)
                        }
                        title="Reset"
                        style={{
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "transparent",
                          color: "#4a5a52",
                          border: "1px solid #4a5a5222",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        <ResetIcon />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Notes */}
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1.5rem",
              border: "1px solid #e4ebe6",
            }}
          >
            {/* Messages */}
            <div
              style={{
                background: "#fff",
                borderRadius: "14px",
                padding: "1.5rem",
                border: "1px solid #e4ebe6",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#1B3A2D",
                  marginBottom: "1rem",
                }}
              >
                Messages with {brand.name}
              </div>
              <div
                style={{
                  maxHeight: "300px",
                  overflowY: "auto" as const,
                  marginBottom: "1rem",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: "8px",
                }}
              >
                {messages.length === 0 ? (
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "#4a5a52",
                      textAlign: "center",
                      padding: "1rem",
                    }}
                  >
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: "column" as const,
                        alignItems:
                          msg.sender_email === userEmail
                            ? "flex-end"
                            : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "80%",
                          padding: "8px 12px",
                          borderRadius: "10px",
                          background:
                            msg.sender_email === userEmail
                              ? "#1B3A2D"
                              : "#f0f4f1",
                          color:
                            msg.sender_email === userEmail ? "#fff" : "#1c1714",
                          fontSize: "0.85rem",
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.message}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "#8b7355",
                          marginTop: "2px",
                        }}
                      >
                        {msg.sender_name} ·{" "}
                        {new Date(msg.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={`Message ${brand.name}...`}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #e4ebe6",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    outline: "none",
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  style={{
                    padding: "8px 16px",
                    background: "#1B3A2D",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  {action === "message" ? "Sending..." : "Send"}
                </button>
              </div>
            </div>

            <div
              style={{
                fontSize: "0.9rem",
                color: "#1B3A2D",
                marginBottom: "1rem",
              }}
            >
              Private notes
            </div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
              <input
                type="text"
                placeholder="Add a note about this brand..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "1px solid #e4ebe6",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                }}
              />
              <button
                onClick={addNote}
                style={{
                  padding: "8px 16px",
                  background: "#1B3A2D",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                {action === "note" ? "Adding..." : "Add"}
              </button>
            </div>
            {notes.length === 0 ? (
              <p style={{ fontSize: "0.85rem", color: "#4a5a52" }}>
                No notes yet.
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  style={{
                    display: "flex",
                    gap: "10px",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#f8faf8",
                    marginBottom: "6px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>
                      {note.content}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "#4a5a52",
                        marginTop: "2px",
                      }}
                    >
                      {formatDate(note.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#c8bfb5",
                      fontSize: "11px",
                      padding: "2px 4px",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "#4a5a52")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "#c8bfb5")
                    }
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </fieldset>
      </div>
    </div>
  );
}
