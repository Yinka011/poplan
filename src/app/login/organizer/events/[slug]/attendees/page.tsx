"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams } from "next/navigation";
import Link from "next/link";

type Shopper = {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  heard_from: string;
  excited_brands: string[];
  created_at: string;
};

export default function AttendeesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const eventName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const [shoppers, setShoppers] = useState<Shopper[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { fetchShoppers(); }, [slug]);

  const fetchShoppers = async () => {
    const { data } = await supabase.from("shopper_registrations").select("*").eq("event_slug", slug).order("created_at", { ascending: false });
    if (data) setShoppers(data);
    setLoading(false);
  };

  const cities = [...new Set(shoppers.map(s => s.city).filter(Boolean))].sort();
  
  const filtered = shoppers.filter(s => {
    if (cityFilter !== "all" && s.city !== cityFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "City", "Country", "Heard From", "Excited Brands", "Registered"];
    const rows = filtered.map(s => [s.name, s.email, s.phone, s.city, s.country, s.heard_from, (s.excited_brands || []).join("; "), new Date(s.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-attendees.csv`;
    a.click();
  };

  if (loading) return <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf8", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#1B3A2D", padding: "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href={`/login/organizer/events/${slug}`} style={{ fontSize: "0.8rem", color: "#E8C97A", textDecoration: "none" }}>← Back</Link>
          <div style={{ fontSize: "1rem", color: "#fff" }}>Attendees — {eventName}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ fontSize: "0.82rem", color: "#ffffff88" }}>Registration link:</div>
          <code style={{ fontSize: "0.75rem", color: "#E8C97A", background: "#ffffff11", padding: "4px 8px", borderRadius: "6px" }}>nalpop.com/attend/{slug}</code>
          <button onClick={() => navigator.clipboard.writeText(`https://nalpop.com/attend/${slug}`)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #ffffff44", borderRadius: "6px", color: "#fff", fontSize: "0.75rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>Copy</button>
        </div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
            <div style={{ fontSize: "1.8rem", color: "#1B3A2D" }}>{shoppers.length}</div>
            <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.1em" }}>TOTAL RSVPs</div>
          </div>
          {cities.slice(0, 3).map(city => (
            <div key={city} style={{ background: "#fff", borderRadius: "12px", padding: "1rem", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
              <div style={{ fontSize: "1.8rem", color: "#1B3A2D" }}>{shoppers.filter(s => s.city === city).length}</div>
              <div style={{ fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.1em" }}>{city.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "1.5rem", flexWrap: "wrap" as const }}>
          <input placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} style={{ padding: "7px 12px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", flex: 1, minWidth: "200px" }} />
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} style={{ padding: "7px 12px", border: "1px solid #e4ebe6", borderRadius: "8px", fontSize: "0.85rem", fontFamily: "Georgia, serif", background: "#fff" }}>
            <option value="all">All cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={exportCSV} style={{ padding: "7px 14px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", cursor: "pointer", fontFamily: "Georgia, serif" }}>↓ Export CSV</button>
        </div>

        {/* Attendees list */}
        {filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: "14px", padding: "4rem", textAlign: "center", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "1rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>No registrations yet</div>
            <div style={{ fontSize: "0.82rem", color: "#4a5a52", marginBottom: "1rem" }}>Share your registration link to start collecting RSVPs.</div>
            <code style={{ fontSize: "0.82rem", color: "#E8C97A", background: "#f8faf8", padding: "8px 16px", borderRadius: "8px" }}>nalpop.com/attend/{slug}</code>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e4ebe6", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr", padding: "10px 16px", background: "#faf8f5", fontSize: "0.65rem", color: "#4a5a52", letterSpacing: "0.08em" }}>
              <div>NAME</div>
              <div>EMAIL</div>
              <div>CITY</div>
              <div>HEARD FROM</div>
              <div>DATE</div>
            </div>
            {filtered.map(s => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1.5fr 1fr 1fr 1fr", padding: "10px 16px", borderTop: "1px solid #f0ece6", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>{s.name}</div>
                  {s.phone && <div style={{ fontSize: "0.7rem", color: "#4a5a52" }}>{s.phone}</div>}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>{s.email}</div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>{s.city}{s.country && s.country !== s.city ? `, ${s.country}` : ""}</div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>{s.heard_from || "—"}</div>
                <div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>{new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
