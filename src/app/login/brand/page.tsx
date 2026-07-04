export default function BrandPortal() {
  return (
    <div style={{minHeight:"100vh",background:"#f5f0ea",fontFamily:"Georgia,serif"}}>
      <div style={{background:"#2c1810",padding:"1rem 2rem"}}>
        <div style={{fontSize:"1.4rem",letterSpacing:"0.15em",color:"#fff"}}>POPLAN</div>
      </div>
      <div style={{maxWidth:"860px",margin:"0 auto",padding:"2.5rem 1.5rem"}}>
        <h1 style={{fontSize:"2rem",color:"#2c1810",fontWeight:"normal"}}>Welcome, Isaleekofromderin</h1>
        <p style={{color:"#8b7355"}}>Atlanta Pop-up · Sep 12–13, 2026</p>
        <div style={{background:"#2c1810",borderRadius:"12px",padding:"1.5rem",marginTop:"1.5rem",color:"#fff",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1rem"}}>
          <div><div style={{fontSize:"0.75rem",color:"#c8b89a"}}>FEE OWED</div><div style={{fontSize:"1.4rem"}}>$400</div></div>
          <div><div style={{fontSize:"0.75rem",color:"#c8b89a"}}>PAID</div><div style={{fontSize:"1.4rem"}}>$200</div></div>
          <div><div style={{fontSize:"0.75rem",color:"#c8b89a"}}>BALANCE</div><div style={{fontSize:"1.4rem",color:"#e8c97a"}}>$200</div></div>
        </div>
        <div style={{background:"#fff",borderRadius:"12px",padding:"1.5rem",marginTop:"1.5rem",border:"1px solid #e8e0d5"}}>
          <div style={{fontSize:"0.75rem",color:"#8b7355",marginBottom:"1rem"}}>MARKETING DEADLINES</div>
          <div style={{padding:"0.65rem 0",borderBottom:"1px solid #f0ebe4",display:"flex",justifyContent:"space-between"}}><span>Submit logo and photos</span><span style={{color:"#8b7355"}}>Aug 1</span></div>
          <div style={{padding:"0.65rem 0",borderBottom:"1px solid #f0ebe4",display:"flex",justifyContent:"space-between"}}><span>Instagram reel</span><span style={{color:"#8b7355"}}>Aug 10</span></div>
          <div style={{padding:"0.65rem 0",borderBottom:"1px solid #f0ebe4",display:"flex",justifyContent:"space-between"}}><span>Collab post live</span><span style={{color:"#8b7355"}}>Aug 15</span></div>
          <div style={{padding:"0.65rem 0",borderBottom:"1px solid #f0ebe4",display:"flex",justifyContent:"space-between"}}><span>Final inventory list</span><span style={{color:"#8b7355"}}>Aug 20</span></div>
          <div style={{padding:"0.65rem 0",display:"flex",justifyContent:"space-between"}}><span>Shipping tracking</span><span style={{color:"#8b7355"}}>Aug 25</span></div>
        </div>
      </div>
    </div>
  );
}