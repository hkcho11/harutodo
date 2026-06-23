import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const jwt = authHeader.slice(7);
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

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

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });

  const [todosRes, eventsRes] = await Promise.all([
    supabase
      .from("todo_items")
      .select("id, title, is_completed, assignee_id, group")
      .eq("couple_id", couple.id)
      .eq("date", today)
      .order("is_completed", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("events")
      .select("id, title, start_time, assignee_id")
      .eq("couple_id", couple.id)
      .lte("date", today)
      .or(`end_date.gte.${today},and(end_date.is.null,date.gte.${today})`)
      .order("start_time", { ascending: true, nullsFirst: true }),
  ]);

  const todos = (todosRes.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    is_completed: t.is_completed,
    assignee:
      t.group === "together"
        ? ("together" as const)
        : t.assignee_id === user.id
          ? ("me" as const)
          : t.assignee_id
            ? ("partner" as const)
            : ("other" as const),
  }));

  const events = (eventsRes.data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start_time: e.start_time,
    assignee:
      e.assignee_id === null
        ? ("together" as const)
        : e.assignee_id === user.id
          ? ("me" as const)
          : ("partner" as const),
  }));

  return NextResponse.json({ date: today, todos, events });
}
