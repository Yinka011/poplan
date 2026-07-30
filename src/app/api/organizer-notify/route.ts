import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const { event, brandEmail, brandName, type, message } = await request.json();
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from("organizer_notifications").insert({
    event,
    brand_email: brandEmail,
    brand_name: brandName,
    type,
    message,
    read: false,
  });

  return NextResponse.json({ success: true });
}
