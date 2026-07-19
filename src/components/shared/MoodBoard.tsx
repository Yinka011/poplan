/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type MoodPin = {
  id: number;
  event_slug: string;
  image_url: string;
  label: string;
  category: string;
  notes: string;
  uploaded_by: string;
  uploaded_by_name: string;
  liked_by: string[];
  created_at: string;
};

const CATEGORIES = ["All", "Decor", "Colour Palette", "Lighting", "Staff Outfits", "Venue", "Florals", "Other"];
const ADD_CATEGORIES = ["Decor", "Colour Palette", "Lighting", "Staff Outfits", "Venue", "Florals", "Other"];

type Props = {
  eventSlug: string;
  userEmail: string;
  userName: string;
};

export default function MoodBoard({ eventSlug, userEmail, userName }: Props) {
  const [pins, setPins] = useState<MoodPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newPin, setNewPin] = useState({ label: "", category: "Decor", notes: "", image_url: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [activePin, setActivePin] = useState<number | null>(null);
  const [comments, setComments] = useState<{id: number; item_name: string; sender_email: string; sender_name: string; message: string; created_at: string;}[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetchPins();
  }, [eventSlug]);

  const fetchPins = async () => {
    const [pinsRes, commentsRes] = await Promise.all([
      supabase.from("mood_board").select("*").eq("event_slug", eventSlug).order("created_at", { ascending: false }),
      supabase.from("item_comments").select("*").eq("event_slug", eventSlug).order("created_at"),
    ]);
    if (pinsRes.data) setPins(pinsRes.data);
    if (commentsRes.data) setComments(commentsRes.data);
    setLoading(false);
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addPin = async () => {
    if (!newPin.label.trim()) return;
    setUploading(true);
    let imageUrl = newPin.image_url;

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const path = `mood-board/${eventSlug}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("mood-board").upload(path, selectedFile, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("mood-board").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    if (!imageUrl) { alert("Please upload an image or paste a URL"); setUploading(false); return; }

    const { data } = await supabase.from("mood_board").insert({
      event_slug: eventSlug,
      image_url: imageUrl,
      label: newPin.label,
      category: newPin.category,
      notes: newPin.notes,
      uploaded_by: userEmail,
      uploaded_by_name: userName || userEmail,
      liked_by: [],
    }).select().single();

    if (data) setPins(prev => [data, ...prev]);
    setNewPin({ label: "", category: "Decor", notes: "", image_url: "" });
    setSelectedFile(null);
    setPreview(null);
    setAdding(false);
    setUploading(false);
  };

  const toggleLike = async (pin: MoodPin) => {
    const liked = pin.liked_by || [];
    const newLiked = liked.includes(userEmail)
      ? liked.filter(e => e !== userEmail)
      : [...liked, userEmail];
    await supabase.from("mood_board").update({ liked_by: newLiked }).eq("id", pin.id);
    setPins(prev => prev.map(p => p.id === pin.id ? { ...p, liked_by: newLiked } : p));
  };

  const deletePin = async (id: number) => {
    if (!confirm("Remove this pin?")) return;
    await supabase.from("mood_board").delete().eq("id", id);
    setPins(prev => prev.filter(p => p.id !== id));
  };

  const sendComment = async (pinId: number, label: string) => {
    if (!newComment.trim()) return;
    const { data } = await supabase.from("item_comments").insert({
      event_slug: eventSlug,
      item_name: `mood_${pinId}`,
      sender_email: userEmail,
      sender_name: userName || userEmail,
      message: newComment,
    }).select().single();
    if (data) setComments(prev => [...prev, data]);
    setNewComment("");
  };

  const getPinComments = (pinId: number) => comments.filter(c => c.item_name === `mood_${pinId}`);

  const filteredPins = filter === "All" ? pins : pins.filter(p => p.category === filter);

  if (loading) return <div style={{ padding: "2rem", textAlign: "center", color: "#8b7355", fontSize: "0.85rem" }}>Loading mood board...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "0.6rem", color: "#8b7355", letterSpacing: "0.2em", marginBottom: "4px" }}>SHARED INSPIRATION</div>
          <div style={{ fontSize: "1rem", color: "#2c1810" }}>{pins.length} pin{pins.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ padding: "8px 18px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>+ Add pin</button>
      </div>

      {/* Add pin form */}
      {adding && (
        <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.82rem", color: "#2c1810", marginBottom: "1rem", fontWeight: 500 }}>Add to mood board</div>

          {/* Image upload or URL */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              onClick={() => document.getElementById("mood-file-upload")?.click()}
              style={{ border: "2px dashed #e8e0d5", borderRadius: "12px", padding: "1.5rem", textAlign: "center" as const, cursor: "pointer", marginBottom: "8px", background: preview ? "#000" : "#faf8f5", position: "relative" as const, overflow: "hidden", minHeight: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <input id="mood-file-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              {preview ? (
                <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" as const }} />
              ) : (
                <div>
                  <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>🖼️</div>
                  <div style={{ fontSize: "0.78rem", color: "#8b7355" }}>Click to upload an image</div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ flex: 1, height: "1px", background: "#e8e0d5" }} />
              <span style={{ fontSize: "0.72rem", color: "#8b7355" }}>or paste a URL</span>
              <div style={{ flex: 1, height: "1px", background: "#e8e0d5" }} />
            </div>
            <input placeholder="https://..." value={newPin.image_url} onChange={e => { setNewPin({...newPin, image_url: e.target.value}); if (e.target.value) { setSelectedFile(null); setPreview(null); } }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif", boxSizing: "border-box" as const }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "8px" }}>
            <input placeholder="Label e.g. Backdrop inspo" value={newPin.label} onChange={e => setNewPin({...newPin, label: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }} />
            <select value={newPin.category} onChange={e => setNewPin({...newPin, category: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif" }}>
              {ADD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input placeholder="Notes (optional)" value={newPin.notes} onChange={e => setNewPin({...newPin, notes: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", fontFamily: "Georgia, serif", marginBottom: "8px", boxSizing: "border-box" as const }} />

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addPin} disabled={uploading || (!selectedFile && !newPin.image_url) || !newPin.label.trim()} style={{ padding: "8px 18px", background: (!selectedFile && !newPin.image_url) || !newPin.label.trim() ? "#d4c5b0" : "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>
              {uploading ? "Uploading..." : "Add to board"}
            </button>
            <button onClick={() => { setAdding(false); setSelectedFile(null); setPreview(null); setNewPin({ label: "", category: "Decor", notes: "", image_url: "" }); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e8e0d5", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{ padding: "5px 14px", background: filter === cat ? "#2c1810" : "#fff", color: filter === cat ? "#fff" : "#8b7355", border: "1px solid " + (filter === cat ? "#2c1810" : "#e8e0d5"), borderRadius: "20px", fontSize: "0.75rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>{cat}</button>
        ))}
      </div>

      {/* Pins grid */}
      {filteredPins.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#8b7355", fontSize: "0.85rem" }}>
          {filter === "All" ? "No pins yet. Add the first one!" : `No pins in ${filter} yet.`}
        </div>
      ) : (
        <div style={{ columns: "3", columnGap: "1rem" }}>
          {filteredPins.map(pin => {
            const pinComments = getPinComments(pin.id);
            const isLiked = (pin.liked_by || []).includes(userEmail);
            const isActive = activePin === pin.id;
            const isOwner = pin.uploaded_by === userEmail;
            return (
              <div key={pin.id} style={{ breakInside: "avoid", marginBottom: "1rem", background: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid #e8e0d5" }}>
                <div style={{ position: "relative" as const }}>
                  <img src={pin.image_url} alt={pin.label} style={{ width: "100%", display: "block", objectFit: "cover" as const }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", gap: "4px" }}>
                    <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.9)", color: "#8b7355" }}>{pin.category}</span>
                  </div>
                </div>
                <div style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: "0.88rem", color: "#2c1810", fontWeight: 500, marginBottom: "2px" }}>{pin.label}</div>
                  {pin.notes && <div style={{ fontSize: "0.75rem", color: "#8b7355", marginBottom: "6px", lineHeight: 1.4 }}>{pin.notes}</div>}
                  <div style={{ fontSize: "0.68rem", color: "#b0a090", marginBottom: "8px" }}>by {pin.uploaded_by_name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={() => toggleLike(pin)} style={{ background: "transparent", border: "none", cursor: "pointer", color: isLiked ? "#c0392b" : "#b0a090", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "3px", padding: 0 }}>
                      {isLiked ? "♥" : "♡"} {(pin.liked_by || []).length > 0 ? (pin.liked_by || []).length : ""}
                    </button>
                    <button onClick={() => setActivePin(isActive ? null : pin.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: pinComments.length > 0 ? "#b87333" : "#b0a090", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "3px", padding: 0 }}>
                      ✏ {pinComments.length > 0 ? pinComments.length : ""}
                    </button>
                    {isOwner && (
                      <button onClick={() => deletePin(pin.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "0.75rem", marginLeft: "auto", padding: 0 }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                    )}
                  </div>

                  {isActive && (
                    <div style={{ marginTop: "10px", borderTop: "1px solid #f0ebe4", paddingTop: "10px" }}>
                      {pinComments.map(c => (
                        <div key={c.id} style={{ marginBottom: "6px", padding: "6px 8px", background: "#faf8f5", borderRadius: "6px", borderLeft: c.sender_email === userEmail ? "2px solid #b87333" : "2px solid #e8e0d5" }}>
                          <div style={{ fontSize: "0.65rem", color: "#8b7355", marginBottom: "2px" }}>{c.sender_name}</div>
                          <div style={{ fontSize: "0.78rem", color: "#2c1810" }}>{c.message}</div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                        <input placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment(pin.id, pin.label)} style={{ flex: 1, padding: "5px 8px", border: "1px solid #e8e0d5", borderRadius: "6px", fontSize: "0.75rem", fontFamily: "Georgia, serif" }} autoFocus />
                        <button onClick={() => sendComment(pin.id, pin.label)} style={{ padding: "5px 10px", background: "#2c1810", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer" }}>Send</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
