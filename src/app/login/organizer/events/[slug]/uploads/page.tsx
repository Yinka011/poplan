"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type UploadedFile = {
  name: string;
  size: number;
  url: string;
  category: string;
  uploaded_at: string;
  brand: string;
};

const BRANDS = [
  { name: "Ara Lagos", email: "b.ademowo@gmail.com" },
  { name: "Lola Signatures", email: "lolasignatures@gmail.com" },
  { name: "Yinka MB", email: "yinkabonky@gmail.com" },
];

export default function UploadsPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    fetchAllFiles();
  }, []);

  const fetchAllFiles = async () => {
    setLoading(true);
    const allFiles: UploadedFile[] = [];

    for (const brand of BRANDS) {
      const { data } = await supabase.storage
        .from("brand-uploads")
        .list(`${brand.email}/`, { sortBy: { column: "created_at", order: "desc" } });

      if (data) {
        for (const f of data.filter(f => f.name !== ".emptyFolderPlaceholder")) {
          const { data: urlData } = supabase.storage
            .from("brand-uploads")
            .getPublicUrl(`${brand.email}/${f.name}`);
          const parts = f.name.split("__");
          allFiles.push({
            name: parts[1] || f.name,
            size: f.metadata?.size || 0,
            url: urlData.publicUrl,
            category: parts[0]?.replace(/-/g, " ") || "Other",
            uploaded_at: f.created_at || "",
            brand: brand.name,
          });
        }
      }
    }

    setFiles(allFiles);
    setLoading(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getIcon = (name: string) => {
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return "🖼️";
    if (name.match(/\.pdf$/i)) return "📄";
    if (name.match(/\.(xlsx|csv|xls)$/i)) return "📊";
    return "📎";
  };

  const brands = ["All", ...BRANDS.map(b => b.name)];
  const categories = ["All", "Brand logo", "Product photos", "Digital brand book", "Inventory sheet", "Marketing assets", "Other"];

  const filtered = files.filter(f => {
    const brandMatch = selectedBrand === "All" || f.brand === selectedBrand;
    const catMatch = selectedCategory === "All" || f.category === selectedCategory;
    return brandMatch && catMatch;
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>

        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/login/organizer/events/atlanta" style={{ fontSize: "0.85rem", color: "#8b7355", textDecoration: "none" }}>← Back to Atlanta</Link>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", marginTop: "0.5rem" }}>Brand Uploads</h1>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>All files uploaded by your brands</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "1.5rem" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.7rem", color: "#8b7355", marginBottom: "4px" }}>TOTAL FILES</div>
            <div style={{ fontSize: "1.8rem", color: "#2c1810" }}>{files.length}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.7rem", color: "#8b7355", marginBottom: "4px" }}>BRANDS UPLOADED</div>
            <div style={{ fontSize: "1.8rem", color: "#2c1810" }}>{new Set(files.map(f => f.brand)).size}</div>
          </div>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "0.7rem", color: "#8b7355", marginBottom: "4px" }}>BRANDS PENDING</div>
            <div style={{ fontSize: "1.8rem", color: "#c0392b" }}>{BRANDS.length - new Set(files.map(f => f.brand)).size}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "#8b7355", display: "block", marginBottom: "4px" }}>BRAND</label>
            <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", color: "#2c1810", background: "#fff" }}>
              {brands.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.75rem", color: "#8b7355", display: "block", marginBottom: "4px" }}>CATEGORY</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", color: "#2c1810", background: "#fff" }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end" }}>
            <button onClick={fetchAllFiles} style={{ padding: "8px 16px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>↻ Refresh</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#8b7355" }}>Loading files...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "12px", padding: "3rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📭</div>
            <div style={{ color: "#8b7355", fontSize: "0.9rem" }}>No files uploaded yet</div>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e8e0d5", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e8e0d5", background: "#faf8f5" }}>
                  {["File", "Brand", "Category", "Size", "Uploaded", ""].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "10px 14px", fontSize: "11px", color: "#8b7355", fontWeight: 400 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((file, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f0ebe4" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span>{getIcon(file.name)}</span>
                        <span style={{ color: "#2c1810", fontWeight: 500 }}>{file.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#8b7355" }}>{file.brand}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "#b8733322", color: "#b87333" }}>{file.category}</span>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#8b7355" }}>{formatSize(file.size)}</td>
                    <td style={{ padding: "12px 14px", color: "#8b7355" }}>{formatDate(file.uploaded_at)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "11px", padding: "4px 12px", background: "#2c1810", color: "#fff", borderRadius: "6px", textDecoration: "none", fontFamily: "Georgia, serif" }}>View</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}