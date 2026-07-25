import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "Georgia, serif", background: "#f8faf8", minHeight: "100vh" }}>

      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.5rem 4rem", background: "#f8faf8", position: "sticky" as const, top: 0, zIndex: 10, borderBottom: "1px solid #e4ebe6" }}>
        <div style={{ fontSize: "1.2rem", letterSpacing: "0.2em", color: "#1B3A2D" }}>NALPOP</div>
        <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
          <a href="#features" style={{ fontSize: "0.85rem", color: "#4a5a52", textDecoration: "none" }}>Features</a>
          <a href="#how" style={{ fontSize: "0.85rem", color: "#4a5a52", textDecoration: "none" }}>How it works</a>
          <a href="#pricing" style={{ fontSize: "0.85rem", color: "#4a5a52", textDecoration: "none" }}>Pricing</a>
          <Link href="/login" style={{ fontSize: "0.85rem", padding: "8px 20px", background: "#1B3A2D", color: "#fff", borderRadius: "8px", textDecoration: "none" }}>Sign in</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: "90vh", display: "flex", alignItems: "center", padding: "6rem 4rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem", alignItems: "center", width: "100%" }}>
          <div>
            <div style={{ fontSize: "0.75rem", letterSpacing: "0.2em", color: "#E8C97A", marginBottom: "1.5rem", background: "#1B3A2D", display: "inline-block", padding: "4px 12px", borderRadius: "20px" }}>NOW IN EARLY ACCESS</div>
            <h1 style={{ fontSize: "3.5rem", color: "#1c1714", fontWeight: "normal", lineHeight: 1.15, marginBottom: "1.5rem", margin: "0 0 1.5rem" }}>
              The platform built for<br />
              <span style={{ color: "#1B3A2D", fontStyle: "italic" }}>pop-up culture.</span>
            </h1>
            <p style={{ fontSize: "1.1rem", color: "#4a5a52", lineHeight: 1.8, marginBottom: "2.5rem", maxWidth: "480px" }}>
              Manage brands, inventory, planning and payouts — all in one place. Built by a pop-up organizer, for pop-up organizers.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" as const }}>
              <Link href="/login" style={{ padding: "14px 32px", background: "#1B3A2D", color: "#fff", borderRadius: "10px", textDecoration: "none", fontSize: "0.95rem" }}>Get started</Link>
              <a href="#how" style={{ padding: "14px 32px", background: "transparent", color: "#1B3A2D", borderRadius: "10px", textDecoration: "none", fontSize: "0.95rem", border: "1px solid #1B3A2D" }}>See how it works</a>
            </div>
            <div style={{ marginTop: "2.5rem", display: "flex", gap: "2rem" }}>
              <div><div style={{ fontSize: "1.5rem", color: "#1B3A2D", fontWeight: "normal" }}>30+</div><div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>Brands managed</div></div>
              <div><div style={{ fontSize: "1.5rem", color: "#1B3A2D", fontWeight: "normal" }}>3</div><div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>Cities</div></div>
              <div><div style={{ fontSize: "1.5rem", color: "#1B3A2D", fontWeight: "normal" }}>100%</div><div style={{ fontSize: "0.78rem", color: "#4a5a52" }}>WhatsApp free</div></div>
            </div>
          </div>
          <div style={{ position: "relative" as const }}>
            {/* Dashboard mockup */}
            <div style={{ background: "#1B3A2D", borderRadius: "20px", padding: "1.5rem", boxShadow: "0 40px 80px #1B3A2D33" }}>
              <div style={{ display: "flex", gap: "6px", marginBottom: "1rem" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffffff33" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffffff33" }} />
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ffffff33" }} />
              </div>
              <div style={{ background: "#ffffff11", borderRadius: "10px", padding: "1rem", marginBottom: "0.75rem" }}>
                <div style={{ fontSize: "0.65rem", color: "#E8C97A", letterSpacing: "0.1em", marginBottom: "4px" }}>ATLANTA POP-UP</div>
                <div style={{ fontSize: "1.2rem", color: "#fff" }}>Sep 11–13, 2026</div>
                <div style={{ fontSize: "0.78rem", color: "#ffffff88", marginTop: "2px" }}>28 brands confirmed</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "0.75rem" }}>
                <div style={{ background: "#ffffff11", borderRadius: "8px", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.6rem", color: "#E8C97A", letterSpacing: "0.1em" }}>REVENUE</div>
                  <div style={{ fontSize: "1.1rem", color: "#fff", marginTop: "4px" }}>$24,800</div>
                </div>
                <div style={{ background: "#ffffff11", borderRadius: "8px", padding: "0.75rem" }}>
                  <div style={{ fontSize: "0.6rem", color: "#E8C97A", letterSpacing: "0.1em" }}>DAYS LEFT</div>
                  <div style={{ fontSize: "1.1rem", color: "#fff", marginTop: "4px" }}>48</div>
                </div>
              </div>
              <div style={{ background: "#ffffff11", borderRadius: "8px", padding: "0.75rem" }}>
                <div style={{ fontSize: "0.6rem", color: "#ffffff88", marginBottom: "6px" }}>BRAND PROGRESS</div>
                {["Lola Signatures", "Spice of Lagos", "Zoba Martin"].map((brand, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i < 2 ? "1px solid #ffffff11" : "none" }}>
                    <span style={{ fontSize: "0.78rem", color: "#fff" }}>{brand}</span>
                    <span style={{ fontSize: "0.68rem", color: "#E8C97A" }}>{["Files uploaded", "Inventory sent", "Payment due"][i]}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Floating card */}
            <div style={{ position: "absolute" as const, bottom: "-20px", right: "-20px", background: "#fff", borderRadius: "12px", padding: "1rem 1.25rem", boxShadow: "0 20px 40px #00000022", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "0.68rem", color: "#4a5a52", marginBottom: "2px" }}>Square sync complete</div>
              <div style={{ fontSize: "0.85rem", color: "#1B3A2D" }}>147 products uploaded ✓</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ background: "#1B3A2D", padding: "6rem 4rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#E8C97A", letterSpacing: "0.2em", marginBottom: "1rem" }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: "2.5rem", color: "#fff", fontWeight: "normal", margin: 0 }}>Built for every role in the pop-up world</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2rem" }}>
            {[
              { role: "Organizer", desc: "Host pop-ups, invite brands, manage planning, track expenses, sync with Square and calculate payouts — all in one dashboard.", icon: "🎯" },
              { role: "Brand organizer", desc: "Run your own pop-ups across multiple cities. Collaborate with planners, approve suggestions, track budgets per city.", icon: "🌍" },
              { role: "Participating brand", desc: "Get invited, upload your inventory, track your sales and receive your payout. No spreadsheets, no WhatsApp chaos.", icon: "🏷" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#ffffff11", borderRadius: "16px", padding: "2rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{item.icon}</div>
                <div style={{ fontSize: "1.1rem", color: "#fff", marginBottom: "0.75rem" }}>{item.role}</div>
                <div style={{ fontSize: "0.88rem", color: "#ffffff88", lineHeight: 1.7 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: "6rem 4rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <div style={{ fontSize: "0.72rem", color: "#1B3A2D", letterSpacing: "0.2em", marginBottom: "1rem" }}>FEATURES</div>
          <h2 style={{ fontSize: "2.5rem", color: "#1c1714", fontWeight: "normal", margin: 0 }}>Everything you need, nothing you don't</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
          {[
            { title: "Planning hub", desc: "Decor, refreshments and staffing in one place. Suggest items to brands and get approvals instantly.", icon: "📋" },
            { title: "Square integration", desc: "Upload brand inventory directly to your Square POS. Sync sales after the event automatically.", icon: "💳" },
            { title: "Payout calculator", desc: "Automatic commission calculations per brand. Mark payouts as sent and brands see it instantly.", icon: "💰" },
            { title: "Brand portal", desc: "Every brand gets their own portal. Tasks, files, inventory, messages and sales — all in one place.", icon: "🏪" },
            { title: "Mood board", desc: "Shared inspiration boards between organizers and brands. Pin images, categories and notes.", icon: "🖼" },
            { title: "Email notifications", desc: "Automated emails for announcements, task assignments, file reviews and messages.", icon: "📧" },
            { title: "Multi-city support", desc: "Run pop-ups across multiple cities. Each city gets its own dashboard, budget and team.", icon: "🌍" },
            { title: "Marketing plans", desc: "Plan your marketing across Instagram, TikTok, Meta Ads, Email and more. Track due dates.", icon: "📣" },
            { title: "Checklist", desc: "60+ event checklist items across venue, brands, decor, staff, marketing and logistics.", icon: "✅" },
          ].map((f, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem", border: "1px solid #e4ebe6" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>{f.icon}</div>
              <div style={{ fontSize: "0.95rem", color: "#1c1714", marginBottom: "0.5rem" }}>{f.title}</div>
              <div style={{ fontSize: "0.82rem", color: "#4a5a52", lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ background: "#f0f4f1", padding: "6rem 4rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <div style={{ fontSize: "0.72rem", color: "#1B3A2D", letterSpacing: "0.2em", marginBottom: "1rem" }}>PRICING</div>
            <h2 style={{ fontSize: "2.5rem", color: "#1c1714", fontWeight: "normal", margin: "0 0 1rem" }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: "0.95rem", color: "#4a5a52", margin: 0 }}>Organizers pay. Brands are always free.</p>
          </div>

          {/* Organizer plans */}
          <div style={{ fontSize: "0.72rem", color: "#1B3A2D", letterSpacing: "0.15em", marginBottom: "1rem", textAlign: "center" }}>FOR ORGANIZERS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem", marginBottom: "3rem" }}>
            {[
              { name: "Starter", price: "$49", period: "/mo", features: ["1 active event", "Up to 10 brands", "Planning hub", "Checklist", "Marketing plans", "Brand CRM"], highlight: false },
              { name: "Growth", price: "$149", period: "/mo", features: ["3 active events", "Up to 30 brands", "Everything in Starter", "Square integration", "Sales dashboard", "Payout calculator", "Planner mode"], highlight: true },
              { name: "Pro", price: "$349", period: "/mo", features: ["Unlimited events", "Unlimited brands", "Everything in Growth", "White label", "Priority support", "Custom domain", "Advanced analytics"], highlight: false },
            ].map((plan, i) => (
              <div key={i} style={{ background: plan.highlight ? "#1B3A2D" : "#fff", borderRadius: "16px", padding: "2rem", border: plan.highlight ? "none" : "1px solid #e4ebe6", position: "relative" as const }}>
                {plan.highlight && <div style={{ position: "absolute" as const, top: "-12px", left: "50%", transform: "translateX(-50%)", background: "#E8C97A", color: "#1B3A2D", fontSize: "0.68rem", padding: "3px 12px", borderRadius: "20px", letterSpacing: "0.1em", whiteSpace: "nowrap" as const }}>MOST POPULAR</div>}
                <div style={{ fontSize: "0.85rem", color: plan.highlight ? "#E8C97A" : "#1B3A2D", marginBottom: "0.5rem" }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px", marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "2.5rem", color: plan.highlight ? "#fff" : "#1c1714", fontWeight: "normal" }}>{plan.price}</span>
                  <span style={{ fontSize: "0.85rem", color: plan.highlight ? "#ffffff88" : "#4a5a52" }}>{plan.period}</span>
                </div>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ color: plan.highlight ? "#E8C97A" : "#1B3A2D", fontSize: "0.85rem" }}>✓</span>
                    <span style={{ fontSize: "0.85rem", color: plan.highlight ? "#ffffff88" : "#4a5a52" }}>{f}</span>
                  </div>
                ))}
                <Link href="/login" style={{ display: "block", marginTop: "1.5rem", padding: "10px", background: plan.highlight ? "#E8C97A" : "#1B3A2D", color: plan.highlight ? "#1B3A2D" : "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "0.88rem", textAlign: "center" as const }}>Get started</Link>
              </div>
            ))}
          </div>

          {/* Brand organizer plans */}
          <div style={{ fontSize: "0.72rem", color: "#1B3A2D", letterSpacing: "0.15em", marginBottom: "1rem", textAlign: "center" }}>FOR BRAND ORGANIZERS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
            {[
              { name: "Emerging", price: "$19", features: ["1 city", "1 team member", "Planning hub", "Budget tracker", "Mood board", "Chat with planner"] },
              { name: "Established", price: "$59", features: ["Up to 5 cities", "5 team members", "Everything in Emerging", "Document vault", "Currency per city", "Post-event report"] },
              { name: "Global", price: "$129", features: ["Unlimited cities", "Unlimited team", "Everything in Established", "White label portal", "Priority support", "Custom domain"] },
            ].map((plan, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e4ebe6" }}>
                <div style={{ fontSize: "0.85rem", color: "#1B3A2D", marginBottom: "0.5rem" }}>{plan.name}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px", marginBottom: "1.5rem" }}>
                  <span style={{ fontSize: "2.5rem", color: "#1c1714", fontWeight: "normal" }}>{plan.price}</span>
                  <span style={{ fontSize: "0.85rem", color: "#4a5a52" }}>/mo</span>
                </div>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                    <span style={{ color: "#1B3A2D", fontSize: "0.85rem" }}>✓</span>
                    <span style={{ fontSize: "0.85rem", color: "#4a5a52" }}>{f}</span>
                  </div>
                ))}
                <Link href="/login" style={{ display: "block", marginTop: "1.5rem", padding: "10px", background: "#1B3A2D", color: "#fff", borderRadius: "8px", textDecoration: "none", fontSize: "0.88rem", textAlign: "center" as const }}>Get started</Link>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "2rem", padding: "1.5rem", background: "#fff", borderRadius: "12px", border: "1px solid #e4ebe6" }}>
            <div style={{ fontSize: "1rem", color: "#1c1714", marginBottom: "4px" }}>Participating brands are always free</div>
            <div style={{ fontSize: "0.85rem", color: "#4a5a52" }}>Brands invited to events on Nalpop never pay. The organizer covers access.</div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#1B3A2D", padding: "6rem 4rem", textAlign: "center" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "2.5rem", color: "#fff", fontWeight: "normal", marginBottom: "1rem" }}>Ready to run better pop-ups?</h2>
          <p style={{ fontSize: "1rem", color: "#ffffff88", lineHeight: 1.7, marginBottom: "2.5rem" }}>Join the organizers and brands already using Nalpop to manage their events with less chaos and more clarity.</p>
          <Link href="/login" style={{ display: "inline-block", padding: "16px 40px", background: "#E8C97A", color: "#1B3A2D", borderRadius: "10px", textDecoration: "none", fontSize: "1rem" }}>Get started today</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#142d22", padding: "3rem 4rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "1rem", letterSpacing: "0.2em", color: "#fff", marginBottom: "4px" }}>NALPOP</div>
          <div style={{ fontSize: "0.78rem", color: "#ffffff55" }}>© 2026 Nalpop. All rights reserved.</div>
        </div>
        <div style={{ display: "flex", gap: "2rem" }}>
          <Link href="/login" style={{ fontSize: "0.82rem", color: "#ffffff88", textDecoration: "none" }}>Sign in</Link>
          <a href="mailto:hello@nalpop.com" style={{ fontSize: "0.82rem", color: "#ffffff88", textDecoration: "none" }}>Contact</a>
          <a href="#pricing" style={{ fontSize: "0.82rem", color: "#ffffff88", textDecoration: "none" }}>Pricing</a>
        </div>
      </footer>

    </div>
  );
}
