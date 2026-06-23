import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

function createJWTClient(jwt: string) {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jwt = authHeader.slice(7);
  const supabase = createJWTClient(jwt);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError ?? !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single();

  if (!couple) {
    return NextResponse.json({ error: "no_couple" }, { status: 404 });
  }

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );
  const year = parseInt(
    req.nextUrl.searchParams.get("year") ?? String(now.getFullYear())
  );
  const month = parseInt(
    req.nextUrl.searchParams.get("month") ?? String(now.getMonth() + 1)
  );

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const today = now.toLocaleDateString("en-CA");

  const [eventsRes, todosRes] = await Promise.all([
    supabase
      .from("events")
      .select("date, end_date")
      .eq("couple_id", couple.id)
      .lte("date", monthEnd)
      .or(
        `end_date.gte.${monthStart},and(end_date.is.null,date.gte.${monthStart})`
      ),
    supabase
      .from("todo_items")
      .select("date")
      .eq("couple_id", couple.id)
      .eq("is_completed", false)
      .gte("date", monthStart)
      .lte("date", monthEnd),
  ]);

  const markedDates: Record<string, string[]> = {};

  const mark = (date: string, type: "event" | "todo") => {
    if (!markedDates[date]) markedDates[date] = [];
    if (!markedDates[date].includes(type)) markedDates[date].push(type);
  };

  for (const event of eventsRes.data ?? []) {
    const endDate = event.end_date ?? event.date;
    const cur = new Date(event.date + "T00:00:00Z");
    const end = new Date(endDate + "T00:00:00Z");
    while (cur <= end) {
      const d = cur.toLocaleDateString("en-CA", { timeZone: "UTC" });
      if (d >= monthStart && d <= monthEnd) mark(d, "event");
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }

  for (const todo of todosRes.data ?? []) {
    if (todo.date) mark(todo.date, "todo");
  }

  return NextResponse.json({ year, month, today, markedDates });
}
