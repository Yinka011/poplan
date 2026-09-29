"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type OrganizerContextType = {
  organizerEmail: string;
  organizerName: string;
  loading: boolean;
};

const OrganizerContext = createContext<OrganizerContextType>({
  organizerEmail: "",
  organizerName: "",
  loading: true,
});

export function OrganizerProvider({ children }: { children: React.ReactNode }) {
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setOrganizerEmail(user.email);
        const { data: profile } = await supabase.from("profiles").select("name").eq("email", user.email).maybeSingle();
        if (profile?.name) setOrganizerName(profile.name);
      }
      setLoading(false);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setOrganizerEmail(session?.user?.email || "");
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <OrganizerContext.Provider value={{ organizerEmail, organizerName, loading }}>
      {children}
    </OrganizerContext.Provider>
  );
}

export function useOrganizer() {
  return useContext(OrganizerContext);
}
