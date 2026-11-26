"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type OpenEvent = {
  slug: string;
  name: string;
  city: string;
  dates_label: string | null;
  venue_name: string | null;
  spots: number | null;
  has_participation_fee: boolean;
  has_commission: boolean;
};

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("organizer");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openEvents, setOpenEvents] = useState<OpenEvent[]>([]);

  useEffect(() => {
    supabase
      .from("events")
      .select("slug, name, city, dates_label, venue_name, spots, has_participation_fee, has_commission")
      .eq("applications_open", true)
      .then(({ data }) => { if (data) setOpenEvents(data); });
  }, []);

  const handleWaitlist = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    try { await supabase.from("waitlist").insert({ email, role }); } catch(e) {}
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "You are on the Nalpop waitlist",
        html: `<div style="font-family:Georgia,serif;max-width:500px;margin:0 auto;padding:2rem"><h2 style="color:#1B3A2D">You are in.</h2><p style="color:#4a5a52">We will reach out when Nalpop opens for ${role === "brand" ? "brands" : role === "brand_organizer" ? "brand organizers" : "organizers"} in your area.</p><p style="color:#4a5a52">— The Nalpop team</p></div>`
      })
    }).catch(() => {});
    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <div data-landing-page style={{  background: "#fff", color: "#1c1714" }}>

      {/* NAV */}
      <nav aria-label="Main navigation" className="px-4 sm:px-8" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid #e4ebe6", display: "flex", justifyContent: "space-between", alignItems: "center", height: "60px" }}>
        <div style={{ fontSize: "1.1rem", letterSpacing: "0.2em", color: "#1B3A2D" }}>NALPOP</div>
        <div className="flex items-center gap-3 md:gap-8">
        <button type="button" className="rounded-lg border border-[#e4ebe6] px-3 py-2 text-sm text-[#1B3A2D] md:hidden" aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? "Close menu" : "Menu"}
        </button>
        <div id="landing-navigation" className={`${menuOpen ? "flex" : "hidden"} absolute left-0 right-0 top-full flex-col items-stretch gap-4 border-b border-[#e4ebe6] bg-white p-4 md:static md:flex md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0`}>
          <a href="#organizers" onClick={() => setMenuOpen(false)} style={{ fontSize: "0.82rem", color: "#4a5a52", textDecoration: "none" }}>Organizers</a>
          <a href="#brands" onClick={() => setMenuOpen(false)} style={{ fontSize: "0.82rem", color: "#4a5a52", textDecoration: "none" }}>Brands</a>
          <a href="#brand-organizers" onClick={() => setMenuOpen(false)} style={{ fontSize: "0.82rem", color: "#4a5a52", textDecoration: "none" }}>Brand Organizers</a>
          {openEvents.length > 0 && (
            <a href="#apply" onClick={() => setMenuOpen(false)} style={{ fontSize: "0.82rem", color: "#4a5a52", textDecoration: "none" }}>Apply</a>
          )}
          <a href="#waitlist" onClick={() => setMenuOpen(false)} style={{ fontSize: "0.82rem", padding: "7px 18px", background: "#1B3A2D", color: "#fff", borderRadius: "8px", textDecoration: "none" }}>Join waitlist</a>
        </div>
        <Link href="/login" className="whitespace-nowrap rounded-lg border border-[#1B3A2D] px-3 py-2 text-[0.82rem] text-[#1B3A2D] no-underline">Sign in</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="px-4 pt-24 pb-16 sm:px-8" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", background: "linear-gradient(180deg, #f8faf8 0%, #fff 100%)" }}>
        <div style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#4a7c59", marginBottom: "1.5rem", border: "1px solid #4a7c5933", padding: "4px 14px", borderRadius: "20px" }}>POP-UP MANAGEMENT, REIMAGINED</div>
        <h1 style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", fontWeight: "normal", color: "#1B3A2D", lineHeight: 1.1, marginBottom: "1.5rem", maxWidth: "800px" }}>
          Everything your pop-up needs. In one place.
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "#4a5a52", maxWidth: "560px", lineHeight: 1.8, marginBottom: "3rem" }}>
          Nalpop connects organizers, brands and brand managers in one seamless workspace, from the first invite to the final payout.
        </p>

        {/* Mock dashboard */}
        <div style={{ marginTop: "5rem", width: "100%", maxWidth: "900px", background: "#1B3A2D", borderRadius: "20px", padding: "2px", boxShadow: "0 40px 80px #1B3A2D33" }}>
          <div style={{ background: "#f8faf8", borderRadius: "18px", overflow: "hidden" }}>
            <div style={{ background: "#e4ebe6", padding: "10px 16px", display: "flex", gap: "6px", alignItems: "center" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#c0392b" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#E8C97A" }} />
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#4a7c59" }} />
              <div style={{ flex: 1, minWidth: 0, overflowWrap: "anywhere", background: "#fff", borderRadius: "6px", padding: "4px 12px", marginLeft: "8px", fontSize: "0.72rem", color: "#4a5a52" }}>nalpop.com/organizer/events</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)]" style={{ minHeight: "360px" }}>
              <div className="flex flex-wrap py-4 sm:block sm:py-6" style={{ background: "#1B3A2D" }}>
                <div className="mb-2 w-full sm:mb-6" style={{ padding: "0 1.25rem" }}>
                  <div style={{ fontSize: "0.85rem", color: "#fff", letterSpacing: "0.1em" }}>NALPOP</div>
                  <div style={{ width: "1.5rem", height: "1px", background: "#E8C97A", marginTop: "4px" }} />
                </div>
                {["Overview", "Brands", "Inventory", "Shipments", "Planning Hub", "Expenses", "Sales", "Attendees"].map((item, i) => (
                  <div key={item} style={{ padding: "7px 1.25rem", fontSize: "0.75rem", color: i === 0 ? "#fff" : "#d4c87a88", background: i === 0 ? "#2a4d3e" : "transparent", borderLeft: i === 0 ? "2px solid #E8C97A" : "2px solid transparent" }}>{item}</div>
                ))}
              </div>
              <div style={{ padding: "1.25rem", background: "#f8faf8" }}>
                <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.15em", marginBottom: "1rem" }}>OVERVIEW — LAGOS POP-UP 2027</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" style={{ marginBottom: "1rem" }}>
                  {[["24", "BRANDS"], ["312", "PRODUCTS"], ["18", "DAYS TO EVENT"], ["89%", "TASKS DONE"]].map(([val, label]) => (
                    <div key={label} style={{ background: "#fff", borderRadius: "8px", padding: "0.65rem", border: "1px solid #e4ebe6" }}>
                      <div style={{ fontSize: "1.1rem", color: "#1B3A2D" }}>{val}</div>
                      <div style={{ fontSize: "0.55rem", color: "#4a5a52", letterSpacing: "0.08em" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div style={{ background: "#fff", borderRadius: "8px", padding: "0.75rem", border: "1px solid #e4ebe6" }}>
                    <div style={{ fontSize: "0.58rem", color: "#4a5a52", letterSpacing: "0.1em", marginBottom: "6px" }}>BRAND PROGRESS</div>
                    {[["Zara Lagos", 85], ["Kente Studio", 60], ["House of Aso", 100]].map(([name, pct]) => (
                      <div key={name} style={{ marginBottom: "5px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", color: "#4a5a52", marginBottom: "2px" }}><span>{name}</span><span>{pct}%</span></div>
                        <div style={{ height: "3px", background: "#f0f4f1", borderRadius: "2px" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#4a7c59" : "#E8C97A", borderRadius: "2px" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#fff", borderRadius: "8px", padding: "0.75rem", border: "1px solid #e4ebe6" }}>
                    <div style={{ fontSize: "0.58rem", color: "#4a5a52", letterSpacing: "0.1em", marginBottom: "6px" }}>CHECKLIST</div>
                    {([["Venue confirmed", true], ["Contracts sent", true], ["Inventory received", false], ["Staff assigned", false]] as [string, boolean][]).map(([task, done]) => (
                      <div key={task} style={{ display: "flex", gap: "5px", alignItems: "center", padding: "3px 0" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: done ? "#4a7c59" : "transparent", border: done ? "none" : "1.5px solid #d4c5b0", flexShrink: 0 }} />
                        <div style={{ fontSize: "0.65rem", color: done ? "#b0a090" : "#1B3A2D", textDecoration: done ? "line-through" : "none" }}>{task}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ORGANIZERS */}
      <section id="organizers" className="scroll-mt-[60px] px-4 py-16 sm:px-8 sm:py-24" style={{ background: "#fff" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-20" style={{ alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#4a7c59", marginBottom: "1rem" }}>FOR ORGANIZERS</div>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "normal", color: "#1B3A2D", lineHeight: 1.2, marginBottom: "1.5rem" }}>Run your event. Not your inbox.</h2>
              <p style={{ fontSize: "1rem", color: "#4a5a52", lineHeight: 1.8, marginBottom: "2rem" }}>Every brand, every payment, every shipment tracked in one dashboard. Know exactly what is coming to your venue before it arrives.</p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
                {[
                  ["Brand management", "Invite brands, approve inventory, message directly and track tasks — all in one place."],
                  ["Shipment tracking", "Brands add courier and tracking details. You mark items received."],
                  ["Planning hub", "Decor, refreshments and staffing in one place. Track every cost."],
                  ["Attendee registration", "Replace Eventbrite. Collect RSVPs and own your audience data."],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: "flex", gap: "12px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E8C97A", marginTop: "8px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.88rem", color: "#1B3A2D", marginBottom: "2px" }}>{title}</div>
                      <div style={{ fontSize: "0.82rem", color: "#4a5a52", lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#f8faf8", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.15em", marginBottom: "1rem" }}>BRANDS — LAGOS POP-UP</div>
              {[
                { name: "Zara Lagos", fee: "$400", paid: "$400", status: "Paid", shipped: true },
                { name: "Kente Studio", fee: "$400", paid: "$200", status: "Partial", shipped: true },
                { name: "House of Aso", fee: "$400", paid: "$0", status: "Unpaid", shipped: false },
                { name: "Adire Collective", fee: "$400", paid: "$400", status: "Paid", shipped: false },
              ].map(brand => (
                <div key={brand.name} style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f4f1" }}>
                  <div>
                    <div style={{ fontSize: "0.82rem", color: "#1B3A2D" }}>{brand.name}</div>
                    <div style={{ fontSize: "0.68rem", color: "#4a5a52" }}>Fee: {brand.fee} · Paid: {brand.paid}</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    {brand.shipped && <span style={{ fontSize: "0.65rem", color: "#4a7c59" }}>✓ Shipped</span>}
                    <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "10px", background: brand.status === "Paid" ? "#4a7c5922" : brand.status === "Partial" ? "#E8C97A22" : "#f0f4f1", color: brand.status === "Paid" ? "#4a7c59" : brand.status === "Partial" ? "#b87333" : "#4a5a52" }}>{brand.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BRANDS */}
      <section id="brands" className="scroll-mt-[60px] px-4 py-16 sm:px-8 sm:py-24" style={{ background: "#f8faf8" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-20" style={{ alignItems: "center" }}>
            <div style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e4ebe6", overflow: "hidden" }}>
              <div style={{ background: "#1B3A2D", padding: "1rem 1.5rem" }}>
                <div style={{ fontSize: "0.6rem", color: "#ffffff55", letterSpacing: "0.15em" }}>BRAND PORTAL</div>
                <div style={{ fontSize: "1rem", color: "#fff", marginTop: "2px" }}>Kente Studio</div>
              </div>
              <div style={{ padding: "1rem" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0", borderBottom: "1px solid #e4ebe6", marginBottom: "1rem" }}>
                  {["Home", "Inventory", "Shipments", "Tasks", "Files"].map((tab, i) => (
                    <div key={tab} style={{ padding: "6px 10px", fontSize: "0.7rem", color: i === 0 ? "#1B3A2D" : "#4a5a52", borderBottom: i === 0 ? "2px solid #E8C97A" : "2px solid transparent" }}>{tab}</div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-[6px] sm:grid-cols-3" style={{ marginBottom: "1rem" }}>
                  {[["$400", "FEE OWED"], ["$200", "PAID"], ["18 days", "TO EVENT"]].map(([val, label]) => (
                    <div key={label} style={{ background: "#f8faf8", borderRadius: "8px", padding: "0.6rem", border: "1px solid #e4ebe6" }}>
                      <div style={{ fontSize: "0.95rem", color: "#1B3A2D" }}>{val}</div>
                      <div style={{ fontSize: "0.55rem", color: "#4a5a52", letterSpacing: "0.08em" }}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: "#1B3A2D11", borderLeft: "3px solid #1B3A2D", padding: "8px 10px", borderRadius: "0 6px 6px 0", marginBottom: "8px" }}>
                  <div style={{ fontSize: "0.6rem", color: "#1B3A2D", letterSpacing: "0.08em" }}>ANNOUNCEMENT</div>
                  <div style={{ fontSize: "0.7rem", color: "#4a5a52", marginTop: "2px" }}>All inventory must be uploaded by Aug 30. Tag every item with price and brand name.</div>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.1em", marginBottom: "4px" }}>MOOD BOARD</div>
                  <div style={{ display: "flex", gap: "4px" }}>
                    {["#1B3A2D", "#E8C97A", "#f8f0e8", "#4a7c59"].map(c => (
                      <div key={c} style={{ width: "28px", height: "28px", borderRadius: "4px", background: c, border: "1px solid #e4ebe6" }} />
                    ))}
                    <div style={{ width: "28px", height: "28px", borderRadius: "4px", background: "#f8faf8", border: "1px dashed #e4ebe6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#4a5a52" }}>+</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <div style={{ flex: 1, background: "#f8faf8", borderRadius: "8px", padding: "8px", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
                    <div style={{ fontSize: "0.95rem", color: "#E8C97A" }}>3/5</div>
                    <div style={{ fontSize: "0.58rem", color: "#4a5a52" }}>TASKS</div>
                  </div>
                  <div style={{ flex: 1, background: "#f8faf8", borderRadius: "8px", padding: "8px", border: "1px solid #e4ebe6", textAlign: "center" as const }}>
                    <div style={{ fontSize: "0.95rem", color: "#4a7c59" }}>✓</div>
                    <div style={{ fontSize: "0.58rem", color: "#4a5a52" }}>SHIPPED</div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#4a7c59", marginBottom: "1rem" }}>FOR BRANDS</div>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "normal", color: "#1B3A2D", lineHeight: 1.2, marginBottom: "1.5rem" }}>Your pop-up portal. Always free.</h2>
              <p style={{ fontSize: "1rem", color: "#4a5a52", lineHeight: 1.8, marginBottom: "2rem" }}>From the moment you are invited to the day after the event. Everything you need to prepare, ship and sell.</p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
                {[
                  ["Tasks and deadlines", "Never miss a deadline. Your organizer sets tasks, you tick them off."],
                  ["Inventory management", "Upload your full product catalogue with sizes, colours and quantities."],
                  ["Shipment tracking", "Add your courier and tracking number. Your organizer tracks delivery."],
                  ["Sales data", "See your Square sales in real time. Know which products sold and what is left."],
                  ["Mood board", "Share your aesthetic vision with your organizer. Pin inspiration images, colours and references."],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: "flex", gap: "12px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E8C97A", marginTop: "8px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.88rem", color: "#1B3A2D", marginBottom: "2px" }}>{title}</div>
                      <div style={{ fontSize: "0.82rem", color: "#4a5a52", lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND ORGANIZERS */}
      <section id="brand-organizers" className="scroll-mt-[60px] px-4 py-16 sm:px-8 sm:py-24" style={{ background: "#fff" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-20" style={{ alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#4a7c59", marginBottom: "1rem" }}>FOR BRAND ORGANIZERS</div>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "normal", color: "#1B3A2D", lineHeight: 1.2, marginBottom: "1.5rem" }}>Manage multiple cities. One dashboard.</h2>
              <p style={{ fontSize: "1rem", color: "#4a5a52", lineHeight: 1.8, marginBottom: "2rem" }}>You are not just a brand. You are running your own show across multiple cities. Nalpop gives you a workspace for every pop-up.</p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "1rem" }}>
                {[
                  ["City dashboard", "Switch between cities instantly. Budget, tasks, shipments per location."],
                  ["Planning hub access", "Review decor, refreshments and staffing plans from your planner."],
                  ["Receipts and expenses", "Download all payment receipts. Full financial transparency per event."],
                  ["Mood board", "Share inspiration and creative direction with your planner on a shared visual board."],
                  ["Team access", "Invite your team without sharing your login."],
                ].map(([title, desc]) => (
                  <div key={title} style={{ display: "flex", gap: "12px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#E8C97A", marginTop: "8px", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: "0.88rem", color: "#1B3A2D", marginBottom: "2px" }}>{title}</div>
                      <div style={{ fontSize: "0.82rem", color: "#4a5a52", lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "#f8faf8", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.15em", marginBottom: "1rem" }}>MY CITIES — 2027</div>
              {[
                { city: "Lagos", dates: "Feb 14–16, 2027", status: "Planning", spent: 40 },
                { city: "Atlanta", dates: "Sep 12–14, 2027", status: "Active", spent: 65 },
                { city: "London", dates: "Nov 7–9, 2027", status: "Planning", spent: 15 },
              ].map(city => (
                <div key={city.city} style={{ background: "#fff", borderRadius: "10px", padding: "1rem", marginBottom: "8px", border: "1px solid #e4ebe6", borderTop: `3px solid ${city.status === "Active" ? "#4a7c59" : "#1B3A2D"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "0.88rem", color: "#1B3A2D" }}>{city.city}</div>
                      <div style={{ fontSize: "0.7rem", color: "#4a5a52" }}>{city.dates}</div>
                    </div>
                    <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "10px", background: city.status === "Active" ? "#4a7c5922" : "#E8C97A22", color: city.status === "Active" ? "#4a7c59" : "#b87333" }}>{city.status}</span>
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "4px" }}>{city.spent}% of budget spent</div>
                  <div style={{ height: "3px", background: "#f0f4f1", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${city.spent}%`, background: "#E8C97A", borderRadius: "2px" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* FEATURES */}
      <section className="px-4 py-16 sm:px-8 sm:py-24" style={{ background: "#f8faf8" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#4a7c59", marginBottom: "1rem" }}>FEATURES</div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "normal", color: "#1B3A2D", lineHeight: 1.2 }}>Built for the details that matter.</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "✅", title: "Task management", desc: "Organizers assign tasks to brands with due dates. Brands tick them off. Overdue items are flagged automatically. No more chasing." },
              { icon: "🖼", title: "Mood board", desc: "Shared inspiration boards between organizers and brands. Pin images, set categories and notes. Get everyone aligned on the aesthetic before the event." },
              { icon: "📦", title: "Inventory upload", desc: "Brands upload their full product catalogue — sizes, colours, quantities and photos. Organizer reviews and approves before it goes live." },
              { icon: "🚚", title: "Shipment tracking", desc: "Brands add courier and tracking numbers. Organizers mark items as received. Everyone knows exactly where products are at all times." },
              { icon: "💬", title: "Direct messaging", desc: "Organizers and brands communicate directly inside the platform. No switching between WhatsApp, email and Instagram DMs." },
              { icon: "📋", title: "Planning hub", desc: "Decor, refreshments and staffing all in one place. Add costs, assign vendors, upload receipts and track your total spend per category." },
            ].map(feature => (
              <div key={feature.title} style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{feature.icon}</div>
                <div style={{ fontSize: "0.95rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>{feature.title}</div>
                <div style={{ fontSize: "0.82rem", color: "#4a5a52", lineHeight: 1.7 }}>{feature.desc}</div>
              </div>
            ))}
          </div>

          {/* Mood board visual */}
          <div style={{ marginTop: "4rem", background: "#fff", borderRadius: "16px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "0.6rem", color: "#4a5a52", letterSpacing: "0.15em", marginBottom: "1rem" }}>MOOD BOARD — LAGOS POP-UP 2027</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              {[
                { label: "Colour palette", bg: "#E8C97A", color: "#1B3A2D" },
                { label: "Venue inspo", bg: "#1B3A2D", color: "#E8C97A" },
                { label: "Rack display", bg: "#f0ece6", color: "#4a5a52" },
                { label: "Lighting", bg: "#4a7c59", color: "#fff" },
                { label: "Signage", bg: "#2a4d3e", color: "#E8C97A" },
              ].map(pin => (
                <div key={pin.label} style={{ background: pin.bg, borderRadius: "10px", padding: "1rem", aspectRatio: "1", display: "flex", alignItems: "flex-end" }}>
                  <div style={{ fontSize: "0.65rem", color: pin.color, lineHeight: 1.2 }}>{pin.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="px-4 py-16 sm:px-8 sm:py-20" style={{ background: "#1B3A2D" }}>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4" style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" as const }}>
          {[["3", "User types served"], ["1", "Platform for everything"], ["0", "Emails chased"], ["∞", "Pop-ups possible"]].map(([num, label]) => (
            <div key={label}>
              <div style={{ fontSize: "3rem", color: "#E8C97A", fontWeight: "normal", lineHeight: 1 }}>{num}</div>
              <div style={{ fontSize: "0.78rem", color: "#ffffff66", marginTop: "8px", lineHeight: 1.4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* OPEN EVENTS */}
      {openEvents.length > 0 && (
        <section id="apply" className="scroll-mt-[60px] px-4 py-16 sm:px-8 sm:py-24" style={{ background: "#fff" }}>
          <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "3rem" }}>
              <div style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#4a7c59", marginBottom: "1rem" }}>NOW ACCEPTING APPLICATIONS</div>
              <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "normal", color: "#1B3A2D", lineHeight: 1.2 }}>Apply to an upcoming pop-up.</h2>
              <p style={{ fontSize: "0.95rem", color: "#4a5a52", marginTop: "1rem", lineHeight: 1.8 }}>Browse open events and submit your brand application. Organisers review every application personally.</p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {openEvents.map(ev => (
                <div key={ev.slug} style={{ background: "#f8faf8", borderRadius: "16px", border: "1px solid #e4ebe6", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "#1B3A2D", padding: "1.25rem 1.5rem" }}>
                    <div style={{ fontSize: "0.7rem", color: "#E8C97A", letterSpacing: "0.1em", marginBottom: "4px" }}>BRAND APPLICATION</div>
                    <div style={{ fontSize: "1.05rem", color: "#fff", marginBottom: "4px" }}>{ev.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "#ffffff88" }}>
                      {ev.city}{ev.dates_label ? ` · ${ev.dates_label}` : ""}
                      {ev.venue_name ? ` · ${ev.venue_name}` : ""}
                    </div>
                  </div>
                  <div style={{ padding: "1.25rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {ev.has_participation_fee && (
                        <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "20px", background: "#1B3A2D22", color: "#1B3A2D" }}>Participation fee</span>
                      )}
                      {ev.has_commission && (
                        <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "20px", background: "#1B3A2D22", color: "#1B3A2D" }}>Commission</span>
                      )}
                      {!ev.has_participation_fee && !ev.has_commission && (
                        <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "20px", background: "#4a7c5922", color: "#4a7c59" }}>No fee · No commission</span>
                      )}
                      {ev.spots && (
                        <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "20px", background: "#f0f4f1", color: "#4a5a52" }}>{ev.spots} spots</span>
                      )}
                    </div>
                    <Link
                      href={`/apply/${ev.slug}`}
                      style={{ display: "block", textAlign: "center", padding: "11px", background: "#1B3A2D", color: "#fff", borderRadius: "10px", textDecoration: "none", fontSize: "0.88rem", marginTop: "auto" }}
                    >
                      Apply now →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WAITLIST */}
      <section id="waitlist" className="scroll-mt-[60px] px-4 py-16 sm:px-8 sm:py-24" style={{ background: "#f8faf8" }}>
        <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" as const }}>
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.2em", color: "#4a7c59", marginBottom: "1rem" }}>GET EARLY ACCESS</div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "normal", color: "#1B3A2D", lineHeight: 1.2, marginBottom: "1rem" }}>Built for the culture. Join the waitlist.</h2>
          <p style={{ fontSize: "0.95rem", color: "#4a5a52", lineHeight: 1.8, marginBottom: "2.5rem" }}>We are onboarding organizers, brands and brand managers. Be first to know when we open in your city.</p>
          {submitted ? (
            <div style={{ background: "#4a7c5922", borderRadius: "12px", padding: "2rem", border: "1px solid #4a7c5944" }}>
              <div style={{ fontSize: "1.5rem", color: "#4a7c59", marginBottom: "0.5rem" }}>✓</div>
              <div style={{ fontSize: "0.95rem", color: "#1B3A2D" }}>You are on the list.</div>
              <div style={{ fontSize: "0.82rem", color: "#4a5a52", marginTop: "4px" }}>We will be in touch.</div>
            </div>
          ) : (
            <div className="p-4 sm:p-8" style={{ background: "#fff", borderRadius: "16px", border: "1px solid #e4ebe6" }}>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3" style={{ marginBottom: "12px", background: "#f8faf8", borderRadius: "8px", padding: "4px" }}>
                {[["organizer", "Organizer"], ["brand", "Brand"], ["brand_organizer", "Brand Organizer"]].map(([val, label]) => (
                  <button key={val} onClick={() => setRole(val)} style={{ flex: 1, padding: "8px", background: role === val ? "#1B3A2D" : "transparent", color: role === val ? "#fff" : "#4a5a52", border: "none", borderRadius: "6px", fontSize: "0.78rem", cursor: "pointer" }}>{label}</button>
                ))}
              </div>
              <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleWaitlist()} style={{ width: "100%", padding: "12px", border: "1px solid #e4ebe6", borderRadius: "10px", fontSize: "0.9rem",  boxSizing: "border-box" as const, marginBottom: "10px", outline: "none" }} />
              <button onClick={handleWaitlist} disabled={submitting || !email.trim()} style={{ width: "100%", padding: "12px", background: "#1B3A2D", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}>
                {submitting ? "Joining..." : "Join the waitlist →"}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "2rem", background: "#1B3A2D", display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: "0.9rem", letterSpacing: "0.2em", color: "#fff" }}>NALPOP</div>
        <div style={{ fontSize: "0.75rem", color: "#ffffff44" }}>© 2026 Nalpop. Built for pop-up culture.</div>
        <Link href="/login" style={{ fontSize: "0.78rem", color: "#E8C97A", textDecoration: "none" }}>Sign in →</Link>
      </footer>

    </div>
  );
}
