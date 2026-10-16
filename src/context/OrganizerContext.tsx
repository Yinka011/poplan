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
    let isMounted = true;

    const fetchProfile = async (email: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("email", email)
        .maybeSingle();
      if (isMounted && profile?.name) setOrganizerName(profile.name);
    };

    // getSession() reads from localStorage — more reliable than getUser() in App Router
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      const email = session?.user?.email || "";
      setOrganizerEmail(email);
      if (email) fetchProfile(email);
      setLoading(false);
    });

    // onAuthStateChange keeps it live
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const email = session?.user?.email || "";
      setOrganizerEmail(email);
      if (email) fetchProfile(email);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
