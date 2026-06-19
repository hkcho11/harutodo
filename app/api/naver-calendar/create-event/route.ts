import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface CreateEventBody {
  title: string;
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // "YYYY-MM-DD" (inclusive, multi-day: same as startDate for single-day)
  startTime?: string;  // "HH:MM" (undefined = all-day)
  endTime?: string;    // "HH:MM"
  location?: string;
}

interface NaverTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

async function refreshNaverToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<NaverTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch(
    `https://nid.naver.com/oauth2.0/token?${params.toString()}`,
    { method: "GET", cache: "no-store" }
  );
  return (await res.json()) as NaverTokenResponse;
}

function toICalDate(isoDate: string): string {
  // "YYYY-MM-DD" → "YYYYMMDD"
  return isoDate.replace(/-/g, "");
}

function toICalDateTime(isoDate: string, time: string): string {
  // "YYYY-MM-DD" + "HH:MM" → "YYYYMMDDTHHMMSS" (KST, no Z suffix)
  const [h, m] = time.split(":");
  const datePart = isoDate.replace(/-/g, "");
  return `${datePart}T${h.padStart(2, "0")}${m.padStart(2, "0")}00`;
}

function addOneDay(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function buildVCalendar(body: CreateEventBody, uid: string): string {
  const isAllDay = !body.startTime;

  const dtstart = isAllDay
    ? `DTSTART;VALUE=DATE:${toICalDate(body.startDate)}`
    : `DTSTART;TZID=Asia/Seoul:${toICalDateTime(body.startDate, body.startTime!)}`;

  // all-day DTEND is exclusive → +1 day
  const dtend = isAllDay
    ? `DTEND;VALUE=DATE:${toICalDate(addOneDay(body.endDate))}`
    : `DTEND;TZID=Asia/Seoul:${toICalDateTime(body.endDate, body.endTime ?? body.startTime!)}`;

  const location = body.location ? `LOCATION:${body.location.replace(/\n/g, "\\n")}` : "";
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "") + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//harutodo//KR",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    dtstart,
    dtend,
    `SUMMARY:${body.title.replace(/\n/g, "\\n")}`,
    location,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return lines.join("\r\n");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "server_misconfiguration" }, { status: 500 });
  }

  const body = (await req.json()) as CreateEventBody;
  if (!body.title || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // 토큰 조회
  const { data: tokenRow } = await supabase
    .from("naver_calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow) {
    return NextResponse.json({ error: "not_connected" }, { status: 400 });
  }

  let accessToken = tokenRow.access_token;

  // 만료 5분 전이면 refresh
  const expiresAt = new Date(tokenRow.expires_at).getTime();
  if (Date.now() >= expiresAt - 5 * 60 * 1000) {
    const refreshed = await refreshNaverToken(tokenRow.refresh_token, clientId, clientSecret);
    if (!refreshed.access_token) {
      // refresh 실패 → 연결 해제 처리
      await supabase.from("naver_calendar_tokens").delete().eq("user_id", user.id);
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }
    accessToken = refreshed.access_token;
    const newExpiresAt = new Date(
      Date.now() + (refreshed.expires_in ?? 3600) * 1000
    ).toISOString();
    await supabase.from("naver_calendar_tokens").update({
      access_token: accessToken,
      ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
  }

  const uid = `${user.id}-${Date.now()}@harutodo`;
  const vcal = buildVCalendar(body, uid);

  const naverRes = await fetch(
    "https://openapi.naver.com/v1/calendar/createSchedule.json",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        calendarId: "defaultCalendarId",
        scheduleIcalString: vcal,
      }).toString(),
      cache: "no-store",
    }
  );

  if (!naverRes.ok) {
    const text = await naverRes.text();
    console.error("[naver-calendar/create-event] Naver API 오류:", naverRes.status, text);
    return NextResponse.json({ error: "naver_api_error" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
