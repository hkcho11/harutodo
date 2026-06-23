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

  // 달력 그리드에 표시될 수 있는 전체 범위 (이전달 말 ~ 다음달 초 포함)
  const gridStart = new Date(Date.UTC(year, month - 1, 1));
  gridStart.setUTCDate(gridStart.getUTCDate() - gridStart.getUTCDay()); // 해당 주 일요일
  const gridStartStr = gridStart.toLocaleDateString("en-CA", { timeZone: "UTC" });

  const [eventsRes, todosRes] = await Promise.all([
    supabase
      .from("events")
      .select("date, end_date, title, assignee_id")
      .eq("couple_id", couple.id)
      .lte("date", monthEnd)
      .or(
        `end_date.gte.${gridStartStr},and(end_date.is.null,date.gte.${gridStartStr})`
      )
      .order("date", { ascending: true }),
    supabase
      .from("todo_items")
      .select("date")
      .eq("couple_id", couple.id)
      .eq("is_completed", false)
      .gte("date", monthStart)
      .lte("date", monthEnd),
  ]);

  const events = (eventsRes.data ?? []).map((e) => ({
    date: e.date,
    end_date: e.end_date ?? null,
    title: e.title,
    assignee:
      e.assignee_id === null
        ? "together"
        : e.assignee_id === user.id
          ? "me"
          : "partner",
  }));

  const hasTodoByDate: Record<string, boolean> = {};
  for (const todo of todosRes.data ?? []) {
    if (todo.date) hasTodoByDate[todo.date] = true;
  }

  return NextResponse.json({ year, month, today, events, hasTodoByDate });
}
