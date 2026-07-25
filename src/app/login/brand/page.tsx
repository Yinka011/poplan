"use client";
import { useEffect } from "react";
export default function BrandRedirect() {
  useEffect(() => { window.location.href = "/brand/portal"; }, []);
  return <div style={{ minHeight: "100vh", background: "#faf8f5", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#6b5f54" }}>Loading...</div>;
}
