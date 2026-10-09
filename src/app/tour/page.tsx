import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nalpop — The pop-up management platform",
  description: "One platform to manage every brand, every payment, every deadline. Built for pop-up organisers.",
};

export default function TourPage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
      />
      <style>{`
        :root {
          --forest: #1B3A2D;
          --gold: #E8C97A;
          --gold-dim: #c9a84c;
          --sage: #4a7c59;
          --bg: #0f2219;
          --bg2: #162e20;
          --bg3: #1e3a28;
          --fg: #f0ede6;
          --fg2: #a8b8ae;
          --line: rgba(232,201,122,0.15);
          --display: 'Cormorant Garamond', Georgia, serif;
          --body: 'DM Sans', system-ui, sans-serif;
        }
        @media (prefers-color-scheme: light) {
          :root {
            --bg: #f4f7f4;
            --bg2: #eaf0eb;
            --bg3: #fff;
            --fg: #0f2219;
            --fg2: #4a5a52;
            --line: rgba(27,58,45,0.12);
          }
        }
        *, *::before, *::after { box-sizing: border-box; }
        body {
          background: var(--bg);
          color: var(--fg);
          font-family: var(--body);
          font-size: 16px;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        .display { font-family: var(--display); font-weight: 300; text-wrap: balance; }
        .eyebrow {
          font-family: var(--body);
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .wrap { max-width: 1100px; margin-inline: auto; padding-inline: clamp(16px, 5vw, 60px); }
        #hero {
          background: var(--forest);
          min-height: 100svh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: clamp(60px, 10vh, 120px) clamp(16px, 5vw, 60px);
          position: relative;
          overflow: hidden;
        }
        #hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(232,201,122,0.06) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-wordmark {
          font-family: var(--display);
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          letter-spacing: 0.35em;
          color: var(--gold);
          text-transform: uppercase;
          margin-bottom: clamp(32px, 6vh, 56px);
          opacity: 0;
          transform: translateY(12px);
          animation: fadeUp 0.9s 0.1s ease forwards;
        }
        .hero-h1 {
          font-family: var(--display);
          font-size: clamp(2.8rem, 7vw, 6rem);
          font-weight: 300;
          line-height: 1.1;
          color: #fff;
          margin: 0 0 clamp(20px, 3vh, 32px);
          text-wrap: balance;
          opacity: 0;
          transform: translateY(16px);
          animation: fadeUp 1s 0.3s ease forwards;
        }
        .hero-h1 em { font-style: italic; color: var(--gold); }
        .hero-sub {
          font-size: clamp(0.95rem, 1.8vw, 1.1rem);
          color: rgba(255,255,255,0.65);
          max-width: 520px;
          line-height: 1.75;
          margin: 0 auto clamp(36px, 5vh, 52px);
          opacity: 0;
          transform: translateY(12px);
          animation: fadeUp 1s 0.55s ease forwards;
        }
        .hero-cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--gold);
          color: var(--forest);
          font-family: var(--body);
          font-size: 0.88rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          padding: 14px 32px;
          border-radius: 4px;
          text-decoration: none;
          opacity: 0;
          transform: translateY(10px);
          animation: fadeUp 0.9s 0.8s ease forwards;
          transition: background 0.2s, transform 0.15s;
        }
        .hero-cta:hover { background: #f0d48a; transform: translateY(-1px); }
        .hero-scroll {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0;
          animation: fadeIn 1s 1.4s ease forwards;
        }
        .hero-scroll-line {
          width: 1px;
          height: 40px;
          background: linear-gradient(to bottom, transparent, var(--gold));
          animation: scrollPulse 2s 1.4s ease-in-out infinite;
        }
        .hero-scroll span { font-size: 0.6rem; letter-spacing: 0.2em; color: rgba(255,255,255,0.3); text-transform: uppercase; }
        .section { padding: clamp(64px, 10vh, 120px) 0; border-bottom: 1px solid var(--line); }
        .section:last-of-type { border-bottom: none; }
        .section-header { margin-bottom: clamp(40px, 6vh, 64px); }
        .feature-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2px;
          background: var(--line);
          border: 1px solid var(--line);
          border-radius: 12px;
          overflow: hidden;
        }
        @media (max-width: 700px) { .feature-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 420px) { .feature-grid { grid-template-columns: 1fr; } }
        .feature-card { background: var(--bg2); padding: clamp(20px, 3vw, 32px); transition: background 0.2s; }
        .feature-card:hover { background: var(--bg3); }
        .feature-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: rgba(232,201,122,0.1);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 14px; color: var(--gold);
        }
        .feature-title { font-size: 0.92rem; font-weight: 500; color: var(--fg); margin-bottom: 6px; }
        .feature-desc { font-size: 0.78rem; color: var(--fg2); line-height: 1.65; }
        .dashboard-preview { background: var(--bg2); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin-top: 40px; }
        .dash-topbar { background: var(--forest); padding: 12px 20px; display: flex; align-items: center; gap: 10px; }
        .dash-dot { width: 10px; height: 10px; border-radius: 50%; }
        .dash-inner { padding: clamp(16px, 3vw, 28px); display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        @media (max-width: 600px) { .dash-inner { grid-template-columns: 1fr 1fr; } }
        .dash-tile { background: var(--bg3); border-radius: 10px; padding: 16px; border: 1px solid var(--line); }
        .dash-tile-label { font-size: 0.58rem; letter-spacing: 0.12em; color: var(--gold); text-transform: uppercase; margin-bottom: 8px; }
        .dash-tile-num { font-family: var(--display); font-size: 2rem; font-weight: 300; color: var(--fg); line-height: 1; font-variant-numeric: tabular-nums; }
        .dash-tile-sub { font-size: 0.68rem; color: var(--fg2); margin-top: 4px; }
        .brand-rows { padding: clamp(12px, 2vw, 20px); border-top: 1px solid var(--line); }
        .brand-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 8px; border-bottom: 1px solid var(--line); gap: 12px; }
        .brand-row:last-child { border-bottom: none; }
        .brand-name { font-size: 0.85rem; color: var(--fg); }
        .brand-tag { font-size: 0.62rem; padding: 3px 8px; border-radius: 20px; letter-spacing: 0.06em; white-space: nowrap; }
        .tag-paid { background: rgba(74,124,89,0.2); color: #90c9a0; }
        .tag-pending { background: rgba(232,201,122,0.15); color: var(--gold); }
        .tag-overdue { background: rgba(192,57,43,0.15); color: #e07b6e; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 5vw, 64px); align-items: center; }
        @media (max-width: 680px) { .two-col { grid-template-columns: 1fr; } }
        .two-col.reverse > *:first-child { order: 2; }
        .two-col.reverse > *:last-child { order: 1; }
        @media (max-width: 680px) { .two-col.reverse > * { order: unset; } }
        .detail-h { font-family: var(--display); font-size: clamp(2rem, 4vw, 3rem); font-weight: 300; line-height: 1.2; text-wrap: balance; margin: 0 0 16px; }
        .detail-body { font-size: 0.95rem; color: var(--fg2); line-height: 1.8; margin: 0 0 24px; }
        .detail-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
        .detail-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 0.88rem; color: var(--fg2); line-height: 1.5; }
        .detail-list li::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--gold); flex-shrink: 0; margin-top: 7px; }
        .mini-chart-wrap { background: var(--bg2); border: 1px solid var(--line); border-radius: 12px; padding: clamp(16px, 3vw, 24px); }
        .mini-chart-label { font-size: 0.65rem; letter-spacing: 0.12em; color: var(--gold); text-transform: uppercase; margin-bottom: 4px; }
        .mini-chart-title { font-family: var(--display); font-size: 1.1rem; color: var(--fg); margin-bottom: 16px; }
        .bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 90px; }
        .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .bar { width: 100%; background: var(--sage); border-radius: 3px 3px 0 0; transition: background 0.2s; min-height: 4px; }
        .bar.top { background: var(--gold); }
        .bar-wrap:hover .bar { background: var(--gold); }
        .bar-lbl { font-size: 0.58rem; color: var(--fg2); text-align: center; letter-spacing: 0.04em; }
        #final-cta { background: var(--forest); padding: clamp(64px, 10vh, 120px) clamp(16px, 5vw, 60px); text-align: center; }
        .final-h { font-family: var(--display); font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 300; line-height: 1.15; color: #fff; text-wrap: balance; margin: 0 auto 16px; max-width: 640px; }
        .final-h em { font-style: italic; color: var(--gold); }
        .final-sub { font-size: 0.95rem; color: rgba(255,255,255,0.5); margin: 0 auto 40px; max-width: 460px; line-height: 1.75; }
        .cta-btn { display: inline-flex; align-items: center; gap: 10px; background: var(--gold); color: var(--forest); font-family: var(--body); font-weight: 500; font-size: 0.88rem; letter-spacing: 0.04em; padding: 15px 36px; border-radius: 4px; text-decoration: none; transition: background 0.2s, transform 0.15s; }
        .cta-btn:hover { background: #f0d48a; transform: translateY(-1px); }
        .url-note { font-size: 0.78rem; color: rgba(255,255,255,0.3); margin-top: 16px; letter-spacing: 0.06em; }
        .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.visible { opacity: 1; transform: translateY(0); }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes scrollPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
          .reveal { opacity: 1; transform: none; }
        }
      `}</style>

      {/* HERO */}
      <section id="hero">
        <div className="hero-wordmark">Nalpop</div>
        <h1 className="hero-h1 display">
          Your pop-up deserves<br />
          <em>a proper command centre.</em>
        </h1>
        <p className="hero-sub">
          One platform to manage every brand, every payment, every deadline — so you run the event, not a hundred spreadsheets and group chats.
        </p>
        <a href="https://www.nalpop.com/onboarding" className="hero-cta">
          Get started — it&apos;s free
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
        <div className="hero-scroll">
          <div className="hero-scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section">
        <div className="wrap">
          <div className="section-header reveal">
            <p className="eyebrow">Everything in one place</p>
            <h2 className="display" style={{ fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 300, margin: "12px 0 0", lineHeight: 1.2 }}>
              Built for how pop-ups actually work
            </h2>
          </div>
          <div className="feature-grid reveal">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2M12 12v4M10 14h4"/></svg>
              </div>
              <div className="feature-title">Brand portals — free forever</div>
              <div className="feature-desc">Every brand you invite gets their own private portal. They upload products, track tasks, view their payout, and message you directly. No app to download.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="feature-title">Payment tracking</div>
              <div className="feature-desc">See exactly who has paid, who owes, and how much at a glance. No more chasing payments by DM.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div className="feature-title">Top brand &amp; item insights</div>
              <div className="feature-desc">See which brands are generating the most revenue and which products are moving fastest. Know who to invite back.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="feature-title">Direct messaging</div>
              <div className="feature-desc">Message every brand from one inbox. No WhatsApp, no email threads. Everything is on record.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              </div>
              <div className="feature-title">Shipment tracking</div>
              <div className="feature-desc">Brands add their tracking number. You see every delivery at a glance. No more &quot;did it arrive?&quot; messages.</div>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div className="feature-title">Attendee registration</div>
              <div className="feature-desc">Collect shopper RSVPs and own your audience data. Know who your regulars are before doors open.</div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD PREVIEW */}
      <section className="section">
        <div className="wrap">
          <div className="two-col">
            <div className="reveal">
              <p className="eyebrow">Your event at a glance</p>
              <h2 className="detail-h display">Everything you need to know, the moment you open it</h2>
              <p className="detail-body">The dashboard shows your spots filled, brands confirmed, outstanding tasks, and days to event — all live.</p>
              <ul className="detail-list">
                <li>Brand count updates the instant you add someone</li>
                <li>Outstanding tasks count down as you tick them off</li>
                <li>Countdown pulls from the start date you set</li>
                <li>All your events in one place, past and upcoming</li>
              </ul>
            </div>
            <div className="reveal">
              <div className="dashboard-preview">
                <div className="dash-topbar">
                  <div className="dash-dot" style={{ background: "#e07b6e" }} />
                  <div className="dash-dot" style={{ background: "#e8c97a" }} />
                  <div className="dash-dot" style={{ background: "#90c9a0" }} />
                  <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", marginLeft: "8px", letterSpacing: "0.06em" }}>NALPOP — Winter Market</span>
                </div>
                <div className="dash-inner">
                  <div className="dash-tile"><div className="dash-tile-label">Spots to fill</div><div className="dash-tile-num">20</div><div className="dash-tile-sub">12 confirmed</div></div>
                  <div className="dash-tile"><div className="dash-tile-label">Brands</div><div className="dash-tile-num">12</div><div className="dash-tile-sub">of 20 spots</div></div>
                  <div className="dash-tile"><div className="dash-tile-label">Tasks</div><div className="dash-tile-num" style={{ color: "var(--gold)" }}>7</div><div className="dash-tile-sub">remaining</div></div>
                  <div className="dash-tile" style={{ background: "var(--forest)", textAlign: "center" }}>
                    <div className="dash-tile-num" style={{ fontSize: "2.4rem", color: "#fff", marginTop: "4px" }}>54</div>
                    <div className="dash-tile-sub" style={{ color: "rgba(255,255,255,0.5)", marginTop: "6px", letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.6rem" }}>Days to event</div>
                  </div>
                </div>
                <div className="brand-rows">
                  <div className="brand-row"><span className="brand-name">Maison Dore</span><span className="brand-tag tag-paid">Paid</span></div>
                  <div className="brand-row"><span className="brand-name">Kemi Designs</span><span className="brand-tag tag-pending">Pending</span></div>
                  <div className="brand-row"><span className="brand-name">Studio Alara</span><span className="brand-tag tag-paid">Paid</span></div>
                  <div className="brand-row"><span className="brand-name">House of Ode</span><span className="brand-tag tag-overdue">Overdue</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PERFORMANCE */}
      <section className="section">
        <div className="wrap">
          <div className="two-col reverse">
            <div className="reveal">
              <div className="mini-chart-wrap">
                <div className="mini-chart-label">Post-event insights</div>
                <div className="mini-chart-title">Top brands by revenue</div>
                <div className="bar-chart">
                  <div className="bar-wrap"><div className="bar" style={{ height: "72px" }} /><div className="bar-lbl">Maison<br />Dore</div></div>
                  <div className="bar-wrap"><div className="bar top" style={{ height: "90px" }} /><div className="bar-lbl">Studio<br />Alara</div></div>
                  <div className="bar-wrap"><div className="bar" style={{ height: "58px" }} /><div className="bar-lbl">Kemi<br />Designs</div></div>
                  <div className="bar-wrap"><div className="bar" style={{ height: "44px" }} /><div className="bar-lbl">Clay<br />Works</div></div>
                  <div className="bar-wrap"><div className="bar" style={{ height: "38px" }} /><div className="bar-lbl">House<br />of Ode</div></div>
                  <div className="bar-wrap"><div className="bar" style={{ height: "30px" }} /><div className="bar-lbl">Nomad<br />Crafts</div></div>
                </div>
                <div style={{ borderTop: "1px solid var(--line)", marginTop: "16px", paddingTop: "14px" }}>
                  <div style={{ fontSize: "0.6rem", color: "var(--fg2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Top item</div>
                  <div style={{ fontSize: "0.82rem", color: "var(--fg)", marginTop: "2px" }}>Terracotta earrings — Studio Alara</div>
                </div>
              </div>
            </div>
            <div className="reveal">
              <p className="eyebrow">Know what&apos;s working</p>
              <h2 className="detail-h display">See your top performers — brands and products both</h2>
              <p className="detail-body">After the event, Nalpop shows you which brands generated the most revenue and which products sold fastest. Know who to invite back, who deserves better placement, and what your shoppers actually want.</p>
              <ul className="detail-list">
                <li>Revenue per brand, automatically calculated from Square sync</li>
                <li>Top-selling products ranked across your entire event</li>
                <li>Payout calculations done for you</li>
                <li>Data you can act on before the next one</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* BRAND PORTAL */}
      <section className="section">
        <div className="wrap">
          <div className="section-header reveal" style={{ textAlign: "center", maxWidth: "580px", marginInline: "auto" }}>
            <p className="eyebrow">For your brands</p>
            <h2 className="display" style={{ fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 300, lineHeight: 1.2, margin: "12px 0 12px" }}>
              A portal that makes your brands feel looked after
            </h2>
            <p style={{ fontSize: "0.92rem", color: "var(--fg2)", lineHeight: 1.75 }}>
              Send one link. That&apos;s it. They land on their own branded portal — no account needed.
            </p>
          </div>
          <div className="feature-grid reveal" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {[
              { icon: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>, title: "Upload products", desc: "Full catalogue with photos, prices and descriptions. You approve before POS sync." },
              { icon: <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>, title: "See their tasks", desc: "Tasks and deadlines you set appear in their portal. They check off, you see it live." },
              { icon: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, title: "Track their payout", desc: "After the event, their sales and payout amount appear directly in their portal." },
              { icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>, title: "Message directly", desc: "They message you from their portal. You reply from your dashboard. One thread, on record." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="feature-card" style={{ textAlign: "center" }}>
                <div className="feature-icon" style={{ margin: "0 auto 12px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
                </div>
                <div className="feature-title">{title}</div>
                <div className="feature-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="final-cta">
        <div className="eyebrow" style={{ marginBottom: "20px" }}>Ready when you are</div>
        <h2 className="final-h display">
          Your next pop-up.<br />
          <em>Fully organised.</em>
        </h2>
        <p className="final-sub">
          Set up in minutes. Add your brands, send their portal links, and run your event without the chaos.
        </p>
        <a href="https://www.nalpop.com/onboarding" className="cta-btn">
          Start on Nalpop — free
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
        <div className="url-note">nalpop.com</div>
      </section>

      <script dangerouslySetInnerHTML={{ __html: `
        const reveals = document.querySelectorAll('.reveal');
        const io = new IntersectionObserver(entries => {
          entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
        }, { threshold: 0.12 });
        reveals.forEach(el => io.observe(el));
      `}} />
    </>
  );
}
