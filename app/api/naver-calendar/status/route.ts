import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ connected: false }, { status: 401 });
  }

  const { data } = await supabase
    .from("naver_calendar_tokens")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ connected: !!data });
}
