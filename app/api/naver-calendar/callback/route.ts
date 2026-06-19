import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface NaverTokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state"); // userId
  const error = req.nextUrl.searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${appUrl}/mypage?naver_calendar=error`);
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/mypage?naver_calendar=error`);
  }

  const redirectUri = `${appUrl}/api/naver-calendar/callback`;
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    state,
  });

  let tokenData: NaverTokenResponse;
  try {
    const res = await fetch(
      `https://nid.naver.com/oauth2.0/token?${tokenParams.toString()}`,
      { method: "GET", cache: "no-store" }
    );
    tokenData = (await res.json()) as NaverTokenResponse;
  } catch {
    return NextResponse.redirect(`${appUrl}/mypage?naver_calendar=error`);
  }

  if (!tokenData.access_token || !tokenData.refresh_token) {
    return NextResponse.redirect(`${appUrl}/mypage?naver_calendar=error`);
  }

  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in ?? 3600) * 1000
  ).toISOString();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // state값 == userId 검증 (CSRF 방어)
  if (!user || user.id !== state) {
    return NextResponse.redirect(`${appUrl}/mypage?naver_calendar=error`);
  }

  const { error: dbError } = await supabase
    .from("naver_calendar_tokens")
    .upsert({
      user_id: user.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });

  if (dbError) {
    console.error("[naver-calendar/callback] DB 저장 실패:", dbError);
    return NextResponse.redirect(`${appUrl}/mypage?naver_calendar=error`);
  }

  return NextResponse.redirect(`${appUrl}/mypage?naver_calendar=connected`);
}
