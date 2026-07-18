"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AttendingEvent = {
  id: number;
  name: string;
  email: string;
  fee_owed: number;
  amount_paid: number;
  balance: number;
  status: string;
  event: string;
  shipped: boolean;
};

type OwnEvent = {
  id: number;
  slug: string;
  name: string;
  city: string;
  dates_label: string;
  status: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#4a7c5922", color: "#4a7c59" },
  Planning: { bg: "#b8733322", color: "#b87333" },
  Completed: { bg: "#8b735522", color: "#8b7355" },
  Paid: { bg: "#4a7c5922", color: "#4a7c59" },
  Partial: { bg: "#b8733322", color: "#b87333" },
  Unpaid: { bg: "#c0392b22", color: "#c0392b" },
};

export default function BrandHub() {
  const [attending, setAttending] = useState<AttendingEvent[]>([]);
  const [ownEvents, setOwnEvents] = useState<OwnEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      setUserEmail(user.email || "");

      const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).single();
      if (profile) setUserName(profile.name);

      const [brandRes, ownEventsRes] = await Promise.all([
        supabase.from("brands").select("*").eq("email", user.email),
        supabase.from("events").select("*").eq("organizer_email", user.email).order("created_at"),
      ]);

      if (brandRes.data) setAttending(brandRes.data);
      if (ownEventsRes.data) setOwnEvents(ownEventsRes.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>

      <div style={{ background: "#2c1810", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1.2rem", letterSpacing: "0.15em", color: "#fff" }}>POPLAN</div>
          <div style={{ width: "1.5rem", height: "1px", background: "#b87333", marginTop: "2px" }}></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.85rem", color: "#c8b89a" }}>{userName || userEmail}</span>
          <button onClick={handleLogout} style={{ fontSize: "0.8rem", padding: "5px 12px", background: "transparent", border: "1px solid #c8b89a44", borderRadius: "8px", cursor: "pointer", color: "#c8b89a", fontFamily: "Georgia, serif" }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", color: "#2c1810", fontWeight: "normal", margin: 0 }}>Welcome back{userName ? `, ${userName}` : ""}</h1>
          <p style={{ color: "#8b7355", fontSize: "0.9rem", marginTop: "4px" }}>Your pop-up activity across all events.</p>
        </div>

        {attending.length > 0 && (
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.1em", marginBottom: "1rem" }}>POP-UPS I AM ATTENDING</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {attending.map(brand => {
                const statusStyle = STATUS_COLORS[brand.status] || STATUS_COLORS.Partial;
                return (
                  <Link key={brand.id} href="/brand/portal" style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.borderColor = "#b87333")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e0d5")}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                        <div>
                          <div style={{ fontSize: "1rem", color: "#2c1810" }}>{brand.event} Pop-Up</div>
                          <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>AO Curates</div>
                        </div>
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color }}>{brand.status}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", borderTop: "1px solid #f0ebe4", paddingTop: "1rem" }}>
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "#8b7355", marginBottom: "2px" }}>FEE</div>
                          <div style={{ fontSize: "0.95rem", color: "#2c1810" }}>${Number(brand.fee_owed).toFixed(0)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "#8b7355", marginBottom: "2px" }}>PAID</div>
                          <div style={{ fontSize: "0.95rem", color: "#4a7c59" }}>${Number(brand.amount_paid).toFixed(0)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "#8b7355", marginBottom: "2px" }}>BALANCE</div>
                          <div style={{ fontSize: "0.95rem", color: Number(brand.balance) > 0 ? "#c0392b" : "#4a7c59" }}>${Number(brand.balance).toFixed(0)}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: "0.75rem", fontSize: "0.78rem", color: "#b87333" }}>
                        {brand.shipped ? "✓ Shipped" : "Not yet shipped"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {ownEvents.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.1em" }}>MY POP-UPS</div>
              <Link href="/brand-organizer" style={{ fontSize: "0.8rem", color: "#b87333", textDecoration: "none" }}>Manage all →</Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {ownEvents.map(event => {
                const statusStyle = STATUS_COLORS[event.status] || STATUS_COLORS.Planning;
                return (
                  <Link key={event.id} href="/brand-organizer" style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e8e0d5", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.borderColor = "#b87333")} onMouseLeave={e => (e.currentTarget.style.borderColor = "#e8e0d5")}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div>
                          <div style={{ fontSize: "1rem", color: "#2c1810" }}>{event.name}</div>
                          <div style={{ fontSize: "0.8rem", color: "#8b7355", marginTop: "2px" }}>{event.city}</div>
                        </div>
                        <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "20px", background: statusStyle.bg, color: statusStyle.color }}>{event.status}</span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#b87333" }}>{event.dates_label || "Dates TBD"}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {attending.length === 0 && ownEvents.length === 0 && (
          <div style={{ background: "#fff", borderRadius: "16px", padding: "3rem", textAlign: "center", border: "1px solid #e8e0d5" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🌟</div>
            <div style={{ fontSize: "1rem", color: "#2c1810", marginBottom: "0.5rem" }}>No events yet</div>
            <div style={{ fontSize: "0.85rem", color: "#8b7355" }}>You will see your pop-ups here once you are invited or create your own.</div>
          </div>
        )}

      </div>
    </div>
  );
}
