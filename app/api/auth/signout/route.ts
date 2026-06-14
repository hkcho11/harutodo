import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Server Component에서는 쿠키 쓰기가 불가능해 signOut이 제대로 동작하지 않는다.
// Route Handler에서 호출해야 Set-Cookie 헤더가 응답에 포함된다.
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/login`);
}
