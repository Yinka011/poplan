"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { deleteBrandFile, folderSegment, listBrandFiles, safeFileName, uploadToCloudinary, type BrandFile } from "@/lib/cloudinary";

type UploadedFile = BrandFile;

type FileApproval = {
  file_name: string;
  status: string;
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

const TEMPLATE_URL = "https://framesmhcepkdheoclsl.supabase.co/storage/v1/object/public/Templates/Brand%20Inventory%20Sheet%20-%20Template.xlsx";

export default function FileUpload({ brandName, brandEmail, event }: { brandName: string; brandEmail: string; event: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [approvals, setApprovals] = useState<FileApproval[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFiles();
    fetchApprovals();
  }, []);

  const fetchFiles = async () => {
    try {
      setFiles(await listBrandFiles(brandEmail));
    } catch (err) {
      console.error("Failed to load files:", err);
    }
  };

  const fetchApprovals = async () => {
    const { data } = await supabase
      .from("file_approvals")
      .select("file_name, status")
      .eq("brand_email", brandEmail)
      .eq("event", event);
    if (data) setApprovals(data);
  };

  const getApprovalStatus = (fileName: string) => {
    return approvals.find(a => a.file_name === fileName)?.status || "pending";
  };

  const approvalBadge = (status: string) => {
    if (status === "approved") return { background: "#4a7c5922", color: "#4a7c59", label: "Approved" };
    if (status === "revision") return { background: "#c0392b22", color: "#c0392b", label: "Needs revision" };
    return null;
  };

  const autoCheckTask = async (uploadCategory: string) => {
    const deadlineId = CATEGORY_TASK_MAP[uploadCategory];
    if (!deadlineId) return;

    const { data: existing } = await supabase
      .from("brand_tasks")
      .select("*")
      .eq("brand_email", brandEmail)
      .eq("deadline_id", deadlineId)
      .single();

    if (existing) {
      if (!existing.completed) {
        await supabase.from("brand_tasks").update({ completed: true }).eq("id", existing.id);
      }
    } else {
      const { data: deadline } = await supabase
        .from("event_deadlines")
        .select("task, due_date")
        .eq("id", deadlineId)
        .single();

      if (deadline) {
        await supabase.from("brand_tasks").insert({
          event: event,
          task: deadline.task,
          due_date: deadline.due_date,
          brand_email: brandEmail,
          completed: true,
          deadline_id: deadlineId,
        });
      }
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError("");

    for (const file of Array.from(fileList)) {
      try {
        await uploadToCloudinary(
          file,
          folderSegment(brandEmail),
          `${category.replace(/ /g, "-")}__${safeFileName(file.name)}`,
        );
        await autoCheckTask(category);
      } catch (err) {
        setError(`Failed to upload ${file.name}: ${err instanceof Error ? err.message : "Please try again."}`);
      }
    }

    setUploading(false);
    fetchFiles();
  };

  const deleteFile = async (file: UploadedFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    try {
      await deleteBrandFile(file);
      setFiles(prev => prev.filter(f => f !== file));
    } catch (err) {
      console.error("Failed to delete file:", err);
      alert(`Could not delete ${file.name}. Please try again.`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = files.filter(f => f.category === cat);
    return acc;
  }, {} as Record<string, UploadedFile[]>);

  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
      <div style={{ fontSize: "1rem", color: "#1B3A2D",  marginBottom: "0.5rem" }}>Upload documents</div>
      <p style={{ fontSize: "0.85rem", color: "#4a5a52", marginBottom: "1.25rem" }}>Upload your brand assets directly here. The organiser will be notified and can access everything from their dashboard.</p>

      <div style={{ background: "#f8faf8", borderRadius: "10px", padding: "1rem", border: "1px solid #f0f4f1", marginBottom: "1.25rem", display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.85rem", color: "#1B3A2D",  marginBottom: "2px" }}>Inventory template</div>
          <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>Download, fill in your products, then upload below</div>
        </div>
        <a href={TEMPLATE_URL} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", padding: "7px 14px", background: "#1B3A2D", color: "#fff", borderRadius: "8px", textDecoration: "none" }}>
          Download template
        </a>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.8rem", color: "#4a5a52", display: "block", marginBottom: "6px" }}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem",  color: "#1B3A2D", background: "#f8faf8" }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${dragOver ? "#E8C97A" : "#e4ebe6"}`, borderRadius: "12px", padding: "2rem", textAlign: "center", background: dragOver ? "#fdf8f3" : "#f8faf8", transition: "all 0.2s", marginBottom: "1rem", cursor: "pointer" }}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div style={{ fontSize: "1.2rem", marginBottom: "8px", color: "#c8bfb5" }}>&#8593;</div>
        <div style={{ fontSize: "0.9rem", color: "#1B3A2D", marginBottom: "4px" }}>{uploading ? "Uploading..." : "Drop files here or click to browse"}</div>
        <div style={{ fontSize: "0.75rem", color: "#4a5a52" }}>Supports images, PDFs, spreadsheets and documents</div>
        <input id="file-input" type="file" multiple onChange={e => handleUpload(e.target.files)} style={{ display: "none" }} />
      </div>

      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

      {files.length > 0 && (
        <div>
          <div style={{ fontSize: "0.8rem", color: "#4a5a52", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>UPLOADED FILES</div>
          {CATEGORIES.map(cat => {
            const catFiles = grouped[cat];
            if (!catFiles || catFiles.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "#E8C97A", marginBottom: "6px", fontWeight: 500 }}>{cat.toUpperCase()}</div>
                {catFiles.map((file, i) => {
                  const approvalStatus = getApprovalStatus(file.name);
                  const badge = approvalBadge(approvalStatus);
                  return (
                    <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: "#f8faf8", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.85rem", color: "#c8bfb5" }}>
                        {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "▣" :
                         file.name.match(/\.pdf$/i) ? "▤" :
                         file.name.match(/\.(xlsx|csv|xls)$/i) ? "▦" : "▢"}
                      </span>
                      <div style={{ flex: "1 1 100px", minWidth: 0 }}>
                        <div style={{ fontSize: "0.85rem", color: "#1B3A2D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                        <div style={{ fontSize: "0.72rem", color: "#4a5a52" }}>{formatSize(file.size)} · {formatDate(file.uploaded_at)}</div>
                      </div>
                      {badge && (
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: badge.background, color: badge.color, whiteSpace: "nowrap" as const }}>{badge.label}</span>
                      )}
                      <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "6px", color: "#4a5a52", textDecoration: "none" }}>View</a>
                      <button
                        onClick={() => deleteFile(file)}
                        title="Delete"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#c8bfb5", fontSize: "11px", lineHeight: 1 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#4a5a52")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}
                      >
                        &#x2715;
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}