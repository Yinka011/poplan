"use client";
import { useEffect } from "react";
export default function BrandRedirect() {
  useEffect(() => { window.location.href = "/brand/portal"; }, []);
  return <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>Loading...</div>;
}
