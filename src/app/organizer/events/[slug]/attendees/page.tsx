"use client";
import { useOrganizer } from "@/context/OrganizerContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import LoadingView from "@/components/LoadingView";
import { useParams } from "next/navigation";
import Link from "next/link";
import AttendeesSkeleton from "./AttendeesSkeleton";

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
  const { organizerEmail, loading: organizerLoading } = useOrganizer();
  const params = useParams();
  const slug = params.slug as string;
  const fallbackEventName = slug.charAt(0).toUpperCase() + slug.slice(1);
  const [eventName, setEventName] = useState(fallbackEventName);
  const [shoppers, setShoppers] = useState<Shopper[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadedFor, setLoadedFor] = useState("");
  const [retry, setRetry] = useState(0);
  const [copying, setCopying] = useState(false);
  const loadKey = `${slug}:${organizerEmail}`;

  const [cityFilter, setCityFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (organizerLoading) return;
    let active = true;
    const fetchShoppers = async () => {
      setLoading(true);
      setLoadError("");
      try {
        if (!organizerEmail) throw new Error("Please sign in to view attendees.");
        const [shopperRes, eventRes] = await Promise.all([
          supabase
            .from("shopper_registrations")
            .select("*")
            .eq("event_slug", slug)
            .order("created_at", { ascending: false }),
          supabase.from("events").select("name, city").eq("slug", slug).maybeSingle(),
        ]);
        if (shopperRes.error) throw shopperRes.error;
        if (eventRes.error) throw eventRes.error;
        if (active) {
          setShoppers(shopperRes.data ?? []);
          setEventName(eventRes.data?.name || eventRes.data?.city || fallbackEventName);
        }
      } catch (error) {
        if (!active) return;
        console.error("Failed to load attendees:", error);
        setLoadError(error instanceof Error && error.message === "Please sign in to view attendees." ? error.message : "Could not load attendees. Please try again.");
      } finally {
        if (active) {
          setLoadedFor(loadKey);
          setLoading(false);
        }
      }
    };
    void fetchShoppers();
    return () => { active = false; };
  }, [slug, organizerEmail, organizerLoading, loadKey, retry, fallbackEventName]);

  const copyRegistrationLink = async () => {
    if (copying) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(`https://nalpop.com/attend/${slug}`);
    } catch (error) {
      console.error("Failed to copy registration link:", error);
      alert("Could not copy the registration link. Please try again.");
    } finally {
      setCopying(false);
    }
  };

  const cities = [
    ...new Set(shoppers.map((s) => s.city).filter(Boolean)),
  ].sort();

  const filtered = shoppers.filter((s) => {
    if (cityFilter !== "all" && s.city !== cityFilter) return false;
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !s.email.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const exportCSV = () => {
    try {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "City",
      "Country",
      "Heard From",
      "Excited Brands",
      "Registered",
    ];
    const rows = filtered.map((s) => [
      s.name,
      s.email,
      s.phone,
      s.city,
      s.country,
      s.heard_from,
      (s.excited_brands || []).join("; "),
      new Date(s.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slug}-attendees.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 0);
    } catch (error) {
      console.error("Failed to export attendees:", error);
      alert("Could not export attendees. Please try again.");
    }
  };

  return (
    <div className="[overflow-wrap:anywhere]" style={{ minHeight: "100vh", background: "#f8faf8" }}>
      <div
        style={{
          background: "#1B3A2D",
          padding: "1rem 2rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem" }}>
          <Link
            href={`/organizer/events/${slug}`}
            style={{
              fontSize: "0.8rem",
              color: "#E8C97A",
              textDecoration: "none",
            }}
          >
            ← Back to {eventName}
          </Link>
          <div style={{ fontSize: "1rem", color: "#fff" }}>
            Attendees — {eventName}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", minWidth: 0 }}>
          <div style={{ fontSize: "0.82rem", color: "#ffffff88" }}>
            Registration link:
          </div>
          <code
            style={{
              fontSize: "0.75rem",
              color: "#E8C97A",
              background: "#ffffff11",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            nalpop.com/attend/{slug}
          </code>
          <button
            onClick={copyRegistrationLink}
            disabled={copying}
            style={{
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid #ffffff44",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            {copying ? "Copying..." : "Copy"}
          </button>
        </div>
      </div>

      <div
        style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem 1.5rem" }}
      >
        <LoadingView loading={organizerLoading || loading || loadedFor !== loadKey} error={loadError} onRetry={() => setRetry(value => value + 1)} customLoader={<AttendeesSkeleton />}>
        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(160px, 100%), 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1rem",
              border: "1px solid #e4ebe6",
              textAlign: "center" as const,
            }}
          >
            <div style={{ fontSize: "1.8rem", color: "#1B3A2D" }}>
              {shoppers.length}
            </div>
            <div
              style={{
                fontSize: "0.65rem",
                color: "#4a5a52",
                letterSpacing: "0.1em",
              }}
            >
              TOTAL RSVPs
            </div>
          </div>
          {cities.slice(0, 3).map((city) => (
            <div
              key={city}
              style={{
                background: "#fff",
                borderRadius: "12px",
                padding: "1rem",
                border: "1px solid #e4ebe6",
                textAlign: "center" as const,
              }}
            >
              <div style={{ fontSize: "1.8rem", color: "#1B3A2D" }}>
                {shoppers.filter((s) => s.city === city).length}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "#4a5a52",
                  letterSpacing: "0.1em",
                }}
              >
                {city.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "1.5rem",
            flexWrap: "wrap" as const,
          }}
        >
          <input
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #e4ebe6",
              borderRadius: "8px",
              fontSize: "0.85rem",
              flex: 1,
              minWidth: "min(200px, 100%)",
            }}
          />
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              border: "1px solid #e4ebe6",
              borderRadius: "8px",
              fontSize: "0.85rem",
              background: "#fff",
              maxWidth: "100%",
            }}
          >
            <option value="all">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            style={{
              padding: "7px 14px",
              background: "#1B3A2D",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            ↓ Export CSV
          </button>
        </div>

        {/* Attendees list */}
        {filtered.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "14px",
              padding: "4rem",
              textAlign: "center",
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
              No registrations yet
            </div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "#4a5a52",
                marginBottom: "1rem",
              }}
            >
              Share your registration link to start collecting RSVPs.
            </div>
            <code
              style={{
                fontSize: "0.82rem",
                color: "#E8C97A",
                background: "#f8faf8",
                padding: "8px 16px",
                borderRadius: "8px",
              }}
            >
              nalpop.com/attend/{slug}
            </code>
          </div>
        ) : (
          <div
            role="region"
            aria-label="Attendees"
            tabIndex={0}
            style={{
              background: "#fff",
              borderRadius: "14px",
              border: "1px solid #e4ebe6",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1.5fr) repeat(3, minmax(0, 1fr))",
                minWidth: "650px",
                padding: "10px 16px",
                background: "#faf8f5",
                fontSize: "0.65rem",
                color: "#4a5a52",
                letterSpacing: "0.08em",
              }}
            >
              <div>NAME</div>
              <div>EMAIL</div>
              <div>CITY</div>
              <div>HEARD FROM</div>
              <div>DATE</div>
            </div>
            {filtered.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1.5fr) repeat(3, minmax(0, 1fr))",
                  minWidth: "650px",
                  padding: "10px 16px",
                  borderTop: "1px solid #f0ece6",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>
                    {s.name}
                  </div>
                  {s.phone && (
                    <div style={{ fontSize: "0.7rem", color: "#4a5a52" }}>
                      {s.phone}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                  {s.email}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                  {s.city}
                  {s.country && s.country !== s.city ? `, ${s.country}` : ""}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52" }}>
                  {s.heard_from || "—"}
                </div>
                <div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>
                  {new Date(s.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        </LoadingView>
      </div>
    </div>
  );
}
