import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  // 토큰 조회 (네이버 토큰 revoke용)
  const { data: tokenRow } = await supabase
    .from("naver_calendar_tokens")
    .select("access_token")
    .eq("user_id", user.id)
    .maybeSingle();

  // DB에서 먼저 삭제
  await supabase.from("naver_calendar_tokens").delete().eq("user_id", user.id);

  // 네이버 토큰 revoke (실패해도 무시 — DB는 이미 삭제됨)
  if (tokenRow?.access_token && clientId && clientSecret) {
    const params = new URLSearchParams({
      grant_type: "delete",
      client_id: clientId,
      client_secret: clientSecret,
      access_token: tokenRow.access_token,
      service_provider: "NAVER",
    });
    try {
      await fetch(
        `https://nid.naver.com/oauth2.0/token?${params.toString()}`,
        { method: "GET", cache: "no-store" }
      );
    } catch {
      // revoke 실패 무시
    }
  }

  return NextResponse.json({ ok: true });
}
