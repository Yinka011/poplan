"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { folderSegment, uploadToCloudinary } from "@/lib/cloudinary";
import LoadingView from "@/components/LoadingView";

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
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [newPin, setNewPin] = useState({ label: "", category: "Decor", notes: "", image_url: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [activePin, setActivePin] = useState<number | null>(null);
  const [comments, setComments] = useState<{id: number; item_name: string; sender_email: string; sender_name: string; message: string; created_at: string;}[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    let active = true;
    const fetchPins = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const [pinsRes, commentsRes] = await Promise.all([
          supabase.from("mood_board").select("*").eq("event_slug", eventSlug).order("created_at", { ascending: false }),
          supabase.from("item_comments").select("*").eq("event_slug", eventSlug).order("created_at"),
        ]);
        if (pinsRes.error) throw pinsRes.error;
        if (commentsRes.error) throw commentsRes.error;
        if (!active) return;
        setPins(pinsRes.data ?? []);
        setComments(commentsRes.data ?? []);
      } catch (error) {
        if (!active) return;
        console.error("Failed to load mood board:", error);
        setLoadError("Could not load mood board. Please try again.");
      } finally {
        if (active) {
          setLoadedFor(eventSlug);
          setLoading(false);
        }
      }
    };
    void fetchPins();
    return () => { active = false; };
  }, [eventSlug, retry]);

  const runAction = async (message: string, callback: () => Promise<void>) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await callback();
    } catch (error) {
      console.error(message, error);
      alert(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addPin = async () => {
    if (!newPin.label.trim() || (!selectedFile && !newPin.image_url.trim())) { alert("Enter a label and select an image or URL."); return; }
    await runAction("Could not add pin. Please try again; an uploaded image may need to be removed separately.", async () => {
    let imageUrl = newPin.image_url;

    if (selectedFile) {
      imageUrl = (await uploadToCloudinary(selectedFile, `mood-board/${folderSegment(eventSlug)}`)).url;
    }

    const { data, error } = await supabase.from("mood_board").insert({
      event_slug: eventSlug,
      image_url: imageUrl,
      label: newPin.label,
      category: newPin.category,
      notes: newPin.notes,
      uploaded_by: userEmail,
      uploaded_by_name: userName || userEmail,
      liked_by: [],
    }).select().single();

    if (error) throw error;
    if (!data) throw new Error("Saved pin was not returned.");
    setPins(prev => [data, ...prev]);
    setNewPin({ label: "", category: "Decor", notes: "", image_url: "" });
    setSelectedFile(null);
    setPreview(null);
    setAdding(false);
    });
  };

  const toggleLike = async (pin: MoodPin) => {
    const liked = pin.liked_by || [];
    const newLiked = liked.includes(userEmail)
      ? liked.filter(e => e !== userEmail)
      : [...liked, userEmail];
    await runAction("Could not update pin. Please try again.", async () => {
    const { error } = await supabase.from("mood_board").update({ liked_by: newLiked }).eq("id", pin.id).select("id").single();
    if (error) throw error;
    setPins(prev => prev.map(p => p.id === pin.id ? { ...p, liked_by: newLiked } : p));
    });
  };

  const deletePin = async (id: number) => {
    if (!confirm("Remove this pin?")) return;
    await runAction("Could not remove pin. Please try again.", async () => {
    const { error } = await supabase.from("mood_board").delete().eq("id", id).select("id").single();
    if (error) throw error;
    setPins(prev => prev.filter(p => p.id !== id));
    });
  };

  const sendComment = async (pinId: number) => {
    if (!newComment.trim()) { alert("Enter a comment."); return; }
    await runAction("Could not send comment. Please try again.", async () => {
    const { data, error } = await supabase.from("item_comments").insert({
      event_slug: eventSlug,
      item_name: `mood_${pinId}`,
      sender_email: userEmail,
      sender_name: userName || userEmail,
      message: newComment,
    }).select().single();
    if (error) throw error;
    if (!data) throw new Error("Saved comment was not returned.");
    setComments(prev => [...prev, data]);
    setNewComment("");
    });
  };

  const getPinComments = (pinId: number) => comments.filter(c => c.item_name === `mood_${pinId}`);

  const filteredPins = filter === "All" ? pins : pins.filter(p => p.category === filter);

  if (loading || loadedFor !== eventSlug || loadError) return (
    <LoadingView loading={loading || loadedFor !== eventSlug} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={
      <div role="status" aria-label="Loading mood board" className="w-full animate-pulse space-y-4">
        <div className="h-8 w-40 rounded bg-[#e4ebe6]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map(index => <div key={index} className="h-56 rounded-xl bg-[#e4ebe6]" />)}
        </div>
      </div>
    } />
  );

  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      {saving && <div role="status" style={{ color: "#4a5a52", marginBottom: "1rem" }}>Saving mood board...</div>}
      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.2em", marginBottom: "4px" }}>SHARED INSPIRATION</div>
          <div style={{ fontSize: "1rem", color: "#1B3A2D" }}>{pins.length} pin{pins.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={() => setAdding(!adding)} style={{ padding: "8px 18px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>+ Add pin</button>
      </div>

      {/* Add pin form */}
      {adding && (
        <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid #e4ebe6" }}>
          <div style={{ fontSize: "0.82rem", color: "#1B3A2D", marginBottom: "1rem", fontWeight: 500 }}>Add to mood board</div>

          {/* Image upload or URL */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              onClick={() => { if (!saving) document.getElementById("mood-file-upload")?.click(); }}
              style={{ border: "2px dashed #e4ebe6", borderRadius: "12px", padding: "1.5rem", textAlign: "center" as const, cursor: "pointer", marginBottom: "8px", background: preview ? "#000" : "#f8faf8", position: "relative" as const, overflow: "hidden", minHeight: "120px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <input id="mood-file-upload" type="file" accept="image/jpeg,image/jpg,image/png" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              {preview ? (
                <img src={preview} alt="preview" style={{ maxWidth: "100%", maxHeight: "200px", objectFit: "contain" as const }} />
              ) : (
                <div>
                  <div style={{ fontSize: "1.5rem", marginBottom: "4px" }}>🖼️</div>
                  <div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>Click to upload an image</div>
                  <div style={{ fontSize: "0.68rem", color: "#8b7355", marginTop: "2px" }}>JPG or PNG only</div>
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ flex: 1, height: "1px", background: "#e4ebe6" }} />
              <span style={{ fontSize: "0.72rem", color: "#4a5a52" }}>or paste a URL</span>
              <div style={{ flex: 1, height: "1px", background: "#e4ebe6" }} />
            </div>
            <input placeholder="https://..." value={newPin.image_url} onChange={e => { setNewPin({...newPin, image_url: e.target.value}); if (e.target.value) { setSelectedFile(null); setPreview(null); } }} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  boxSizing: "border-box" as const }} />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr] [&>*]:min-w-0" style={{ marginBottom: "8px" }}>
            <input placeholder="Label e.g. Backdrop inspo" value={newPin.label} onChange={e => setNewPin({...newPin, label: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem" }} />
            <select value={newPin.category} onChange={e => setNewPin({...newPin, category: e.target.value})} style={{ padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem" }}>
              {ADD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <input placeholder="Notes (optional)" value={newPin.notes} onChange={e => setNewPin({...newPin, notes: e.target.value})} style={{ width: "100%", padding: "8px 10px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem",  marginBottom: "8px", boxSizing: "border-box" as const }} />

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={addPin} disabled={saving || (!selectedFile && !newPin.image_url) || !newPin.label.trim()} style={{ padding: "8px 18px", background: (!selectedFile && !newPin.image_url) || !newPin.label.trim() ? "#d4c5b0" : "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>
              {saving ? "Saving..." : "Add to board"}
            </button>
            <button onClick={() => { setAdding(false); setSelectedFile(null); setPreview(null); setNewPin({ label: "", category: "Decor", notes: "", image_url: "" }); }} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.82rem", cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{ padding: "5px 14px", background: filter === cat ? "#1B3A2D" : "#fff", color: filter === cat ? "#fff" : "#4a5a52", border: "1px solid " + (filter === cat ? "#1B3A2D" : "#e4ebe6"), borderRadius: "20px", fontSize: "0.75rem", cursor: "pointer" }}>{cat}</button>
        ))}
      </div>

      {/* Pins grid */}
      {filteredPins.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#4a5a52", fontSize: "0.85rem" }}>
          {filter === "All" ? "No pins yet. Add the first one!" : `No pins in ${filter} yet.`}
        </div>
      ) : (
        <div style={{ columns: "220px 3", columnGap: "1rem" }}>
          {filteredPins.map(pin => {
            const pinComments = getPinComments(pin.id);
            const isLiked = (pin.liked_by || []).includes(userEmail);
            const isActive = activePin === pin.id;
            const isOwner = pin.uploaded_by === userEmail;
            return (
              <div key={pin.id} style={{ breakInside: "avoid", marginBottom: "1rem", background: "#fff", borderRadius: "14px", overflow: "hidden", border: "1px solid #e4ebe6" }}>
                <div style={{ position: "relative" as const }}>
                  <img src={pin.image_url} alt={pin.label} style={{ width: "100%", display: "block", objectFit: "cover" as const }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", gap: "4px" }}>
                    <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "20px", background: "rgba(255,255,255,0.9)", color: "#4a5a52" }}>{pin.category}</span>
                  </div>
                </div>
                <div style={{ padding: "0.75rem 1rem" }}>
                  <div style={{ fontSize: "0.88rem", color: "#1B3A2D", fontWeight: 500, marginBottom: "2px" }}>{pin.label}</div>
                  {pin.notes && <div style={{ fontSize: "0.75rem", color: "#4a5a52", marginBottom: "6px", lineHeight: 1.4 }}>{pin.notes}</div>}
                  <div style={{ fontSize: "0.68rem", color: "#b0a090", marginBottom: "8px" }}>by {pin.uploaded_by_name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button onClick={() => toggleLike(pin)} style={{ background: "transparent", border: "none", cursor: "pointer", color: isLiked ? "#c0392b" : "#b0a090", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "3px", padding: 0 }}>
                      {isLiked ? "♥" : "♡"} {(pin.liked_by || []).length > 0 ? (pin.liked_by || []).length : ""}
                    </button>
                    <button onClick={() => setActivePin(isActive ? null : pin.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: pinComments.length > 0 ? "#E8C97A" : "#b0a090", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "3px", padding: 0 }}>
                      ✏ {pinComments.length > 0 ? pinComments.length : ""}
                    </button>
                    {isOwner && (
                      <button onClick={() => deletePin(pin.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#d4c5b0", fontSize: "0.75rem", marginLeft: "auto", padding: 0 }} onMouseEnter={e => (e.currentTarget.style.color = "#c0392b")} onMouseLeave={e => (e.currentTarget.style.color = "#d4c5b0")}>✕</button>
                    )}
                  </div>

                  {isActive && (
                    <div style={{ marginTop: "10px", borderTop: "1px solid #f0f4f1", paddingTop: "10px" }}>
                      {pinComments.map(c => (
                        <div key={c.id} style={{ marginBottom: "6px", padding: "6px 8px", background: "#f8faf8", borderRadius: "6px", borderLeft: c.sender_email === userEmail ? "2px solid #E8C97A" : "2px solid #e4ebe6" }}>
                          <div style={{ fontSize: "0.65rem", color: "#4a5a52", marginBottom: "2px" }}>{c.sender_name}</div>
                          <div style={{ fontSize: "0.78rem", color: "#1B3A2D" }}>{c.message}</div>
                        </div>
                      ))}
                      <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                        <input placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && sendComment(pin.id)} style={{ flex: 1, minWidth: 0, padding: "5px 8px", border: "1px solid #e4ebe6", borderRadius: "6px", fontSize: "0.75rem" }} autoFocus />
                        <button onClick={() => sendComment(pin.id)} style={{ padding: "5px 10px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.72rem", cursor: "pointer" }}>Send</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </fieldset>
    </div>
  );
}
