"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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

type Deadline = { id: number; task: string; due_date: string; category: string; };
type BrandTask = { id: number; deadline_id: number; completed: boolean; task: string; };
type Member = { id: number; member_email: string; };
type Note = { id: number; content: string; created_at: string; };
type FileApproval = { file_name: string; status: string; };

type UploadedFile = {
  name: string;
  size: number;
  url: string;
  category: string;
  uploaded_at: string;
};

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
  if (s === "Partial") return { background: "#b8733322", color: "#b87333" };
  return { background: "#c0392b22", color: "#c0392b" };
};

const PencilIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const XIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const ResetIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

export default function OrganizerBrandPage() {
  const params = useParams();
  const brandSlug = decodeURIComponent(params.brand as string);
  const slug = params.slug as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [tasks, setTasks] = useState<BrandTask[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [approvals, setApprovals] = useState<FileApproval[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [inviting, setInviting] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newFee, setNewFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetchAll();
  }, [brandSlug]);

  const fetchAll = async () => {
    setLoading(true);

    const { data: brandData } = await supabase
      .from("brands")
      .select("*")
      .eq("event", "Atlanta")
      .ilike("name", brandSlug)
      .single();

    if (!brandData) { setLoading(false); return; }
    setBrand(brandData);

    const [deadlineRes, taskRes, memberRes, noteRes, approvalRes] = await Promise.all([
      supabase.from("event_deadlines").select("*").eq("event", "Atlanta").order("id"),
      supabase.from("brand_tasks").select("*").eq("brand_email", brandData.email).eq("event", "Atlanta"),
      supabase.from("brand_members").select("*").eq("brand_email", brandData.email).eq("event", "Atlanta"),
      supabase.from("brand_notes").select("*").eq("brand_email", brandData.email).eq("event", "Atlanta").order("created_at", { ascending: false }),
      supabase.from("file_approvals").select("*").eq("brand_email", brandData.email).eq("event", "Atlanta"),
    ]);

    if (deadlineRes.data) setDeadlines(deadlineRes.data);
    if (taskRes.data) setTasks(taskRes.data);
    if (memberRes.data) setMembers(memberRes.data);
    if (noteRes.data) setNotes(noteRes.data);
    if (approvalRes.data) setApprovals(approvalRes.data);

    await fetchFiles(brandData.email);
    setLoading(false);
  };

  const fetchFiles = async (email: string) => {
    const { data } = await supabase.storage
      .from("brand-uploads")
      .list(`${email}/`, { sortBy: { column: "created_at", order: "desc" } });

    if (data) {
      const filesWithUrls = await Promise.all(
        data.filter(f => f.name !== ".emptyFolderPlaceholder").map(async (f) => {
          const { data: urlData } = supabase.storage
            .from("brand-uploads")
            .getPublicUrl(`${email}/${f.name}`);
          const parts = f.name.split("__");
          return {
            name: parts[1] || f.name,
            size: f.metadata?.size || 0,
            url: urlData.publicUrl,
            category: parts[0]?.replace(/-/g, " ") || "Other",
            uploaded_at: f.created_at || "",
          };
        })
      );
      setFiles(filesWithUrls);
    }
  };

  const getApprovalStatus = (fileName: string) =>
    approvals.find(a => a.file_name === fileName)?.status || "pending";

  const setApprovalStatus = async (fileName: string, status: string, fileCategory: string) => {
    if (!brand) return;
    const existing = approvals.find(a => a.file_name === fileName);
    if (existing) {
      await supabase.from("file_approvals").update({ status }).eq("brand_email", brand.email).eq("file_name", fileName);
    } else {
      await supabase.from("file_approvals").insert({ brand_email: brand.email, event: "Atlanta", file_name: fileName, status });
    }
    setApprovals(prev => [...prev.filter(a => a.file_name !== fileName), { file_name: fileName, status }]);

    const deadlineId = CATEGORY_TASK_MAP[fileCategory];
    if (!deadlineId) return;

    const { data: existingTask } = await supabase
      .from("brand_tasks")
      .select("*")
      .eq("brand_email", brand.email)
      .eq("deadline_id", deadlineId)
      .maybeSingle();

    if (existingTask) {
      const completed = status === "approved";
      await supabase.from("brand_tasks").update({ completed }).eq("id", existingTask.id);
      setTasks(prev => prev.map(t => t.deadline_id === deadlineId ? { ...t, completed } : t));
    }
  };

  const inviteBrand = async () => {
    if (!brand?.email) return;
    setInviting(true);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: brand.email }),
    });
    const data = await res.json();
    if (!data.error) {
      await supabase.from("brands").update({ invited: true }).eq("id", brand.id);
      setBrand(prev => prev ? { ...prev, invited: true } : prev);
      alert(`Invitation sent to ${brand.email}`);
    } else {
      alert("Could not send invite: " + data.error);
    }
    setInviting(false);
  };

  const addMember = async () => {
    if (!newMemberEmail.trim() || !brand) return;
    setAddingMember(true);
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newMemberEmail }),
    });
    const data = await res.json();
    if (!data.error) {
      const { data: memberData } = await supabase.from("brand_members").insert({
        brand_email: brand.email,
        member_email: newMemberEmail,
        event: "Atlanta",
      }).select().single();
      if (memberData) setMembers(prev => [...prev, memberData]);
      alert(`Invitation sent to ${newMemberEmail}`);
      setNewMemberEmail("");
    } else {
      alert("Could not send invite: " + data.error);
    }
    setAddingMember(false);
  };

  const updatePayment = async () => {
    if (!brand) return;
    const paid = parseFloat(newAmount);
    const fee = parseFloat(newFee);
    const balance = fee - paid;
    const status = balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
    await supabase.from("brands").update({ amount_paid: paid, fee_owed: fee, balance, status }).eq("id", brand.id);
    setBrand(prev => prev ? { ...prev, amount_paid: paid, fee_owed: fee, balance, status } : prev);
    setEditingPayment(false);
    setNewAmount("");
    setNewFee("");
  };

  const addNote = async () => {
    if (!newNote.trim() || !brand) return;
    setSavingNote(true);
    const { data } = await supabase.from("brand_notes").insert({
      brand_email: brand.email,
      event: "Atlanta",
      content: newNote,
    }).select().single();
    if (data) setNotes(prev => [data, ...prev]);
    setNewNote("");
    setSavingNote(false);
  };

  const deleteNote = async (id: number) => {
    await supabase.from("brand_notes").delete().eq("id", id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const isCompleted = (deadlineId: number) =>
    tasks.find(t => t.deadline_id === deadlineId)?.completed || false;

  const completed = deadlines.filter(d => isCompleted(d.id)).length;
  const progress = deadlines.length ? Math.round((completed / deadlines.length) * 100) : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredFiles = selectedCategory === "All" ? files : files.filter(f => f.category === selectedCategory);

  const approvalBadge = (status: string) => {
    if (status === "approved") return { background: "#4a7c5922", color: "#4a7c59", label: "Approved" };
    if (status === "revision") return { background: "#c0392b22", color: "#c0392b", label: "Needs revision" };
    return { background: "#f0ebe4", color: "#8b7355", label: "Pending" };
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>
  );

  if (!brand) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#8b7355" }}>Brand not found</p>
        <Link href={`/login/organizer/events/${slug}`} style={{ color: "#b87333" }}>Back to dashboard</Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.85rem", color: "#8b7355", textDecoration: "none" }}>← Back to Atlanta</Link>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "0.5rem" }}>
            <div>
              <h1 style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal", fontFamily: "Didot, 'Playfair Display', serif", fontStyle: "italic", margin: 0 }}>{brand.name}</h1>
              <span style={{ fontSize: "0.8rem", padding: "3px 10px", borderRadius: "20px", ...statusColor(brand.status) }}>{brand.status}</span>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {!brand.invited ? (
                <button onClick={inviteBrand} disabled={inviting} title="Send invite" style={{ background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", color: "#8b7355", fontSize: "1rem" }}>
                  {inviting ? "..." : "✉"}
                </button>
              ) : (
                <span style={{ fontSize: "0.75rem", padding: "4px 10px", borderRadius: "20px", background: "#4a7c5922", color: "#4a7c59" }}>✓ Invited</span>
              )}
            </div>
          </div>
        </div>

        {/* Payment card */}
        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.5rem 2rem", marginBottom: "1.5rem", color: "#fff", display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PARTICIPATION FEE</div>
            {editingPayment ? (
              <input type="number" value={newFee} onChange={e => setNewFee(e.target.value)} style={{ width: "80px", padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "1rem", background: "#fff", color: "#2c1810" }} placeholder="Fee" />
            ) : (
              <div style={{ fontSize: "1.4rem" }}>${Number(brand.fee_owed).toFixed(2)}</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>PAID</div>
            {editingPayment ? (
              <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} style={{ width: "80px", padding: "4px", border: "1px solid #b87333", borderRadius: "4px", fontSize: "1rem", background: "#fff", color: "#2c1810" }} placeholder="Paid" autoFocus />
            ) : (
              <div style={{ fontSize: "1.4rem" }}>${Number(brand.amount_paid).toFixed(2)}</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "#c8b89a", marginBottom: "4px" }}>BALANCE</div>
            <div style={{ fontSize: "1.4rem", color: Number(brand.balance) > 0 ? "#e8c97a" : "#90c9a0" }}>${Number(brand.balance).toFixed(2)}</div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {editingPayment ? (
              <>
                <button onClick={updatePayment} style={{ padding: "6px 12px", background: "#b87333", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Save</button>
                <button onClick={() => setEditingPayment(false)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid #c8b89a44", color: "#c8b89a", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
              </>
            ) : (
              <button onClick={() => { setEditingPayment(true); setNewAmount(String(brand.amount_paid)); setNewFee(String(brand.fee_owed)); }} title="Edit payment" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#c8b89a", padding: "4px" }}>
                <PencilIcon />
              </button>
            )}
          </div>
        </div>

        {/* Shipping status */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "4px" }}>SHIPMENT STATUS</div>
            {brand.shipped ? (
              <div>
                <div style={{ fontSize: "0.95rem", color: "#4a7c59", fontFamily: "Georgia, serif" }}>Products shipped ✓</div>
                <div style={{ fontSize: "0.75rem", color: "#8b7355", marginTop: "2px" }}>Marked on {formatDate(brand.shipped_at)}</div>
              </div>
            ) : (
              <div style={{ fontSize: "0.95rem", color: "#b87333", fontFamily: "Georgia, serif" }}>Not yet shipped</div>
            )}
          </div>
          <span style={{ fontSize: "0.8rem", padding: "4px 12px", borderRadius: "20px", background: brand.shipped ? "#4a7c5922" : "#b8733322", color: brand.shipped ? "#4a7c59" : "#b87333" }}>
            {brand.shipped ? "Shipped" : "Pending"}
          </span>
        </div>

        {/* Portal Access */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.9rem", color: "#2c1810", fontFamily: "Georgia, serif", marginBottom: "1rem" }}>Portal access</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", marginBottom: "2px" }}>PRIMARY EMAIL</div>
              <div style={{ fontSize: "0.9rem", color: "#2c1810" }}>{brand.email || "No email set"}</div>
            </div>
            {brand.email && !brand.invited && (
              <button onClick={inviteBrand} disabled={inviting} title="Send invite" style={{ background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", color: "#8b7355", fontSize: "1rem" }}>
                {inviting ? "..." : "✉"}
              </button>
            )}
            {brand.invited && <span style={{ fontSize: "0.75rem", padding: "3px 8px", borderRadius: "20px", background: "#4a7c5922", color: "#4a7c59" }}>✓ Invited</span>}
          </div>

          {members.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", marginBottom: "6px" }}>TEAM MEMBERS</div>
              {members.map(m => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #f0ebe4", fontSize: "0.85rem", color: "#2c1810" }}>
                  <span style={{ color: "#4a7c59" }}>✓</span>
                  {m.member_email}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "0.5rem" }}>
            <input type="email" placeholder="Add team member email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} style={{ flex: 1, padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
            <button onClick={addMember} disabled={addingMember} title="Send invite" style={{ background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", color: "#8b7355", fontSize: "1rem" }}>
              {addingMember ? "..." : "✉"}
            </button>
          </div>
        </div>

        {/* Checklist Progress */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>Checklist progress</div>
            <div style={{ fontSize: "0.8rem", color: "#8b7355" }}>{completed} of {deadlines.length} complete · {progress}%</div>
          </div>
          <div style={{ height: "5px", background: "#f0ebe4", borderRadius: "3px", marginBottom: "1.25rem", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#b87333", borderRadius: "3px", transition: "width 0.3s" }} />
          </div>
          {deadlines.map(deadline => {
            const done = isCompleted(deadline.id);
            return (
              <div key={deadline.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px", borderRadius: "8px", marginBottom: "2px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: done ? "none" : "2px solid #d4c5b0", background: done ? "#b87333" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {done && <span style={{ color: "#fff", fontSize: "9px" }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.85rem", color: done ? "#b0a090" : "#2c1810", textDecoration: done ? "line-through" : "none" }}>{deadline.task}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>Due {deadline.due_date}</div>
                </div>
                <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "10px", background: done ? "#4a7c5922" : "#f0ebe4", color: done ? "#4a7c59" : "#8b7355" }}>{done ? "Done" : "Pending"}</span>
              </div>
            );
          })}
        </div>

        {/* Uploaded Files */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.9rem", color: "#2c1810", fontFamily: "Georgia, serif" }}>Uploaded files</div>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ padding: "5px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.8rem", fontFamily: "Georgia, serif", color: "#2c1810", background: "#faf8f5" }}>
              <option>All</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {filteredFiles.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No files uploaded yet.</p>
          ) : (
            filteredFiles.map((file, i) => {
              const approval = getApprovalStatus(file.name);
              const badge = approvalBadge(approval);
              return (
                <div key={i} style={{ padding: "10px 12px", borderRadius: "10px", background: "#faf8f5", marginBottom: "8px", border: "1px solid #f0ebe4" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.85rem", color: "#c8bfb5" }}>
                      {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "▣" : file.name.match(/\.pdf$/i) ? "▤" : file.name.match(/\.(xlsx|csv|xls)$/i) ? "▦" : "▢"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", color: "#2c1810", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>{file.category} · {formatSize(file.size)} · {formatDate(file.uploaded_at)}</div>
                    </div>
                    <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: badge.background, color: badge.color, whiteSpace: "nowrap" as const }}>{badge.label}</span>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", color: "#8b7355", textDecoration: "none" }}>View</a>
                    <a href={file.url} download target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", padding: "3px 8px", background: "#2c1810", color: "#fff", borderRadius: "6px", textDecoration: "none" }}>↓</a>
                  </div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", paddingLeft: "27px", alignItems: "center" }}>
                    <button onClick={() => setApprovalStatus(file.name, "approved", file.category)} title="Approve" style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: approval === "approved" ? "#4a7c59" : "transparent", color: approval === "approved" ? "#fff" : "#4a7c59", border: "1px solid #4a7c5944", borderRadius: "6px", cursor: "pointer" }}>
                      <CheckIcon />
                    </button>
                    <button onClick={() => setApprovalStatus(file.name, "revision", file.category)} title="Needs revision" style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: approval === "revision" ? "#c0392b" : "transparent", color: approval === "revision" ? "#fff" : "#c0392b", border: "1px solid #c0392b44", borderRadius: "6px", cursor: "pointer" }}>
                      <XIcon />
                    </button>
                    <button onClick={() => setApprovalStatus(file.name, "pending", file.category)} title="Reset" style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#8b7355", border: "1px solid #8b735522", borderRadius: "6px", cursor: "pointer" }}>
                      <ResetIcon />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Notes */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.9rem", color: "#2c1810", fontFamily: "Georgia, serif", marginBottom: "1rem" }}>Private notes</div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
            <input type="text" placeholder="Add a note about this brand..." value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addNote()} style={{ flex: 1, padding: "8px 12px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif" }} />
            <button onClick={addNote} disabled={savingNote} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {savingNote ? "..." : "Add"}
            </button>
          </div>
          {notes.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "#8b7355" }}>No notes yet.</p>
          ) : (
            notes.map(note => (
              <div key={note.id} style={{ display: "flex", gap: "10px", padding: "10px", borderRadius: "8px", background: "#faf8f5", marginBottom: "6px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.85rem", color: "#2c1810" }}>{note.content}</div>
                  <div style={{ fontSize: "0.72rem", color: "#8b7355", marginTop: "2px" }}>{formatDate(note.created_at)}</div>
                </div>
                <button onClick={() => deleteNote(note.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c8bfb5", fontSize: "11px", padding: "2px 4px" }} onMouseEnter={e => (e.currentTarget.style.color = "#8b7355")} onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}>✕</button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}