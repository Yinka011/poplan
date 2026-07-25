"use client";
import { useEffect } from "react";
export default function BrandRedirect() {
  useEffect(() => { window.location.href = "/brand/portal"; }, []);
  return <div style={{ minHeight: "100vh", background: "#f8faf8", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#4a5a52" }}>Loading...</div>;
}
