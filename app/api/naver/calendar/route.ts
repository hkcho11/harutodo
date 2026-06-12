import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { NaverCalendarEvent } from "@/types/naver";

function parseICalDate(value: string): string | null {
  // VALUE=DATE: YYYYMMDD
  const dateOnly = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;

  // YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const withTime = value.match(/^(\d{4})(\d{2})(\d{2})T/);
  if (withTime) return `${withTime[1]}-${withTime[2]}-${withTime[3]}`;

  return null;
}

function parseICal(ical: string): NaverCalendarEvent[] {
  const events: NaverCalendarEvent[] = [];
  const blocks = ical.split("BEGIN:VEVENT");

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split(/\r?\n/);

    let uid = "";
    let summary = "";
    let dtstart = "";
    let dtend = "";
    let allDay = false;

    for (const rawLine of lines) {
      if (rawLine.startsWith("END:VEVENT")) break;

      const [key, ...rest] = rawLine.split(":");
      const val = rest.join(":");

      if (key.startsWith("UID")) uid = val.trim();
      if (key.startsWith("SUMMARY")) summary = val.trim();
      if (key.startsWith("DTSTART")) {
        allDay = key.includes("VALUE=DATE") || !key.includes("T");
        dtstart = parseICalDate(val.trim()) ?? "";
      }
      if (key.startsWith("DTEND")) {
        dtend = parseICalDate(val.trim()) ?? "";
      }
    }

    if (!uid || !summary || !dtstart) continue;

    // DTEND for all-day events is exclusive (next day), so subtract 1 day
    let endDate: string | null = null;
    if (dtend && dtend !== dtstart) {
      if (allDay) {
        const d = new Date(dtend);
        d.setUTCDate(d.getUTCDate() - 1);
        const adj = d.toISOString().slice(0, 10);
        endDate = adj !== dtstart ? adj : null;
      } else {
        endDate = dtend !== dtstart ? dtend : null;
      }
    }

    events.push({ id: uid, title: summary, date: dtstart, end_date: endDate, allDay });
  }

  return events;
}

async function refreshToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const res = await fetch("https://nid.naver.com/oauth2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.NAVER_CLIENT_ID!,
      client_secret: process.env.NAVER_CLIENT_SECRET!,
      refresh_token: refreshToken,
    }),
  });

  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };

  if (data.error || !data.access_token) return null;

  const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString();
  await supabase
    .from("naver_tokens")
    .update({ access_token: data.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return data.access_token;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = parseInt(searchParams.get("year") ?? "0", 10);
  const month = parseInt(searchParams.get("month") ?? "0", 10); // 0-based

  if (!year || isNaN(month)) {
    return NextResponse.json({ events: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ events: [] });

  const { data: tokenRow } = await supabase
    .from("naver_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!tokenRow) return NextResponse.json({ events: [], connected: false });

  let accessToken = tokenRow.access_token;

  // Refresh if expired (with 60s buffer)
  if (new Date(tokenRow.expires_at).getTime() < Date.now() + 60_000) {
    const refreshed = await refreshToken(supabase, user.id, tokenRow.refresh_token);
    if (!refreshed) return NextResponse.json({ events: [], connected: false });
    accessToken = refreshed;
  }

  // Build date range for the month
  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 0)); // last day of month

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const calUrl = new URL("https://openapi.naver.com/calendar/get.json");
  calUrl.searchParams.set("startDateTime", fmt(startDate));
  calUrl.searchParams.set("endDateTime", fmt(endDate));

  const calRes = await fetch(calUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!calRes.ok) return NextResponse.json({ events: [] });

  const icalText = await calRes.text();
  const events = parseICal(icalText);

  return NextResponse.json({ events, connected: true });
}
