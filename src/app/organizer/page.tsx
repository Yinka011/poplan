"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function OrganizerRedirect() {
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/"; return; }
      window.location.href = "/login/organizer/events";
    };
    check();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f0ea", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", color: "#8b7355" }}>
      Loading your dashboard...
    </div>
  );
}