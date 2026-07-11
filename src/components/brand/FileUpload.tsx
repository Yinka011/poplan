"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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

const INVENTORY_TEMPLATE_URL = "https://framesmhcepkdheoclsl.supabase.co/storage/v1/object/public/Templates/Brand%20Inventory%20Sheet%20-%20Template.xlsx";

export default function FileUpload({ brandName, brandEmail }: { brandName: string; brandEmail: string }) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const { data } = await supabase.storage
      .from("brand-uploads")
      .list(`${brandEmail}/`, { sortBy: { column: "created_at", order: "desc" } });

    if (data) {
      const filesWithUrls = await Promise.all(
        data.filter(f => f.name !== ".emptyFolderPlaceholder").map(async (f) => {
          const { data: urlData } = supabase.storage
            .from("brand-uploads")
            .getPublicUrl(`${brandEmail}/${f.name}`);
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
          event: "Atlanta",
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
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${brandEmail}/${category.replace(/ /g, "-")}__${safeName}`;
      const { error } = await supabase.storage
        .from("brand-uploads")
        .upload(path, file, { upsert: true });
      if (error) {
        setError(`Failed to upload ${file.name}: ${error.message}`);
      } else {
        await autoCheckTask(category);
      }
    }

    setUploading(false);
    fetchFiles();
  };

  const deleteFile = async (file: UploadedFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    const path = `${brandEmail}/${file.category.replace(/ /g, "-")}__${file.name}`;
    await supabase.storage.from("brand-uploads").remove([path]);
    setFiles(prev => prev.filter(f => f.name !== file.name));
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
    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5" }}>
      <div style={{ fontSize: "1rem", color: "#2c1810", fontFamily: "Georgia, serif", marginBottom: "0.5rem" }}>Upload documents</div>
      <p style={{ fontSize: "0.85rem", color: "#8b7355", marginBottom: "1.25rem" }}>Upload your brand assets directly here. AO Curates will be notified and can access everything from their dashboard.</p>

      <div style={{ background: "#faf8f5", borderRadius: "10px", padding: "1rem", border: "1px solid #f0ebe4", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "0.85rem", color: "#2c1810", fontFamily: "Georgia, serif", marginBottom: "2px" }}>Inventory template</div>
          <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>Download, fill in your products, then upload below</div>
        </div>
        
          href={INVENTORY_TEMPLATE_URL}
          download
          style={{ fontSize: "0.8rem", padding: "7px 14px", background: "#2c1810", color: "#fff", borderRadius: "8px", textDecoration: "none", fontFamily: "Georgia, serif", whiteSpace: "nowrap" as const }}
        >
          Download template
        </a>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.8rem", color: "#8b7355", display: "block", marginBottom: "6px" }}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: "100%", padding: "8px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", color: "#2c1810", background: "#faf8f5" }}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${dragOver ? "#b87333" : "#e8e0d5"}`, borderRadius: "12px", padding: "2rem", textAlign: "center", background: dragOver ? "#fdf8f3" : "#faf8f5", transition: "all 0.2s", marginBottom: "1rem", cursor: "pointer" }}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <div style={{ fontSize: "1.2rem", marginBottom: "8px", color: "#c8bfb5" }}>&#8593;</div>
        <div style={{ fontSize: "0.9rem", color: "#2c1810", marginBottom: "4px" }}>{uploading ? "Uploading..." : "Drop files here or click to browse"}</div>
        <div style={{ fontSize: "0.75rem", color: "#8b7355" }}>Supports images, PDFs, spreadsheets and documents</div>
        <input id="file-input" type="file" multiple onChange={e => handleUpload(e.target.files)} style={{ display: "none" }} />
      </div>

      {error && <p style={{ color: "#c0392b", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}

      {files.length > 0 && (
        <div>
          <div style={{ fontSize: "0.8rem", color: "#8b7355", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>UPLOADED FILES</div>
          {CATEGORIES.map(cat => {
            const catFiles = grouped[cat];
            if (!catFiles || catFiles.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: "0.75rem", color: "#b87333", marginBottom: "6px", fontWeight: 500 }}>{cat.toUpperCase()}</div>
                {catFiles.map((file, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", background: "#faf8f5", marginBottom: "4px" }}>
                    <span style={{ fontSize: "0.85rem", color: "#c8bfb5" }}>
                      {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "▣" :
                       file.name.match(/\.pdf$/i) ? "▤" :
                       file.name.match(/\.(xlsx|csv|xls)$/i) ? "▦" : "▢"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", color: "#2c1810", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#8b7355" }}>{formatSize(file.size)} · {formatDate(file.uploaded_at)}</div>
                    </div>
                    <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", padding: "3px 8px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "6px", color: "#8b7355", textDecoration: "none" }}>View</a>
                    <button
                      onClick={() => deleteFile(file)}
                      title="Delete"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#c8bfb5", fontSize: "11px", lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#8b7355")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#c8bfb5")}
                    >
                      &#x2715;
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}