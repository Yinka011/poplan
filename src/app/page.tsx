import Link from "next/link";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: "420px", padding: "0 1.5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "2rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
          <div style={{ width: "2rem", height: "1px", background: "#b87333", margin: "0.5rem auto" }}></div>
          <p style={{ color: "#8b7355", fontSize: "0.9rem" }}>Pop-up planning, beautifully simple</p>
        </div>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "2rem", border: "1px solid #e8e0d5" }}>
          <h2 style={{ fontSize: "1.3rem", color: "#2c1810", fontWeight: "normal", marginBottom: "0.5rem", textAlign: "center" }}>Welcome</h2>
          <p style={{ fontSize: "0.85rem", color: "#8b7355", textAlign: "center", marginBottom: "1.5rem" }}>Who are you signing in as?</p>
          <Link href="/login/organizer/events" style={{ display: "block", width: "100%", padding: "0.85rem", background: "#2c1810", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: "pointer", letterSpacing: "0.05em", marginBottom: "10px", textAlign: "center", textDecoration: "none" }}>
            I am an Organizer
          </Link>
          <Link href="/login/brand" style={{ display: "block", width: "100%", padding: "0.85rem", background: "#fff", color: "#2c1810", border: "1px solid #2c1810", borderRadius: "8px", fontSize: "0.95rem", fontFamily: "Georgia, serif", cursor: "pointer", letterSpacing: "0.05em", textAlign: "center", textDecoration: "none" }}>
            I am a Brand
          </Link>
        </div>
      </div>
    </div>
  );
}