export default function BrandPortal() {
  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", fontFamily: "Georgia, serif" }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #e8e0d5", padding: "1rem 2rem" }}>
        <div style={{ fontSize: "1.4rem", letterSpacing: "0.15em", color: "#2c1810" }}>POPLAN</div>
        <div style={{ width: "2rem", height: "1px", background: "#b87333", marginTop: "2px" }}></div>
      </div>
      <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <h1 style={{ fontSize: "2rem", color: "#2c1810", fontWeight: "normal", margin: 0 }}>Welcome to your Brand Portal</h1>
        <p style={{ color: "#8b7355", marginTop: "0.4rem" }}>Atlanta Pop-up · Sep 12–13, 2026</p>

        <div style={{ background: "#2c1810", borderRadius: "12px", padding: "1.75rem 2rem", marginTop: "1.5rem", color: "#fff" }}>
          <div style={{ fontSize: "0.75rem", color: "#c8b89a", marginBottom: "1rem", letterSpacing: "0.1em" }}>PARTICIPATION FEE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1rem" }}>
            <div><div style={{ fontSize: "0.75rem", color: "#c8b89a" }}>FEE OWED</div><div style={{ fontSize: "1.4rem" }}>$400</div></div>
            <div><div style={{ fontSize: "0.75rem", color: "#c8b89a" }}>AMOUNT PAID</div><div style={{ fontSize: "1.4rem" }}>$0</div></div>
            <div><div style={{ fontSize: "0.75rem", color: "#c8b89a" }}>BALANCE</div><div style={{ fontSize: "1.4rem", color: "#e8c97a" }}>$400</div></div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", marginTop: "1.5rem", border: "1px solid #e8e0d5" }}>
          <div style={{ fontSize: "0.75rem", color: "#8b7355", letterSpacing: "0.1em", marginBottom: "1rem" }}>YOUR TO-DO LIST</div>
          {[
            { task: "Sign participation agreement", due: "Jul 15" },
            { task: "Upload logo and product photos", due: "Aug 1" },
            { task: "Submit Instagram reel", due: "Aug 10" },
            { task: "Collab post live", due: "Aug 15" },
            { task: "Submit final inventory list", due: "Aug 20" },
            { task: "Share shipping tracking number", due: "Aug 25" },
          ].map((item, i, arr) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "0.65rem 0", borderBottom: i < arr.length - 1 ? "1px solid #f0ebe4" : "none" }}>
              <span style={{ fontSize: "0.9rem", color: "#2c1810" }}>{item.task}</span>
              <span style={{ fontSize: "0.75rem", color: "#8b7355" }}>Due {item.due}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}