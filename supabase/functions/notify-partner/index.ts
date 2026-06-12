import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore — webpush types bundled at runtime
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

webpush.setVapidDetails(
  "mailto:cmkbeew@gmail.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

interface NotifyPayload {
  partner_id: string;
  actor_name: string;
  action: "add" | "update" | "delete";
  entity_type: "todo" | "event";
  entity_title?: string;
}

const ACTION_LABEL: Record<string, string> = {
  add: "추가했어요",
  update: "수정했어요",
  delete: "삭제했어요",
};

const ENTITY_LABEL: Record<string, string> = {
  todo: "할 일을",
  event: "일정을",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const body: NotifyPayload = await req.json();
    const { partner_id, actor_name, action, entity_type, entity_title } = body;

    const notifTitle = actor_name;
    const entityLabel = ENTITY_LABEL[entity_type] ?? "항목을";
    const actionLabel = ACTION_LABEL[action] ?? "변경했어요";
    const notifBody = entity_title
      ? `${entityLabel} ${actionLabel} — ${entity_title}`
      : `${entityLabel} ${actionLabel}`;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", partner_id);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({
      title: notifTitle,
      body: notifBody,
      url: entity_type === "event" ? "/calendar" : "/",
    });

    const results = await Promise.allSettled(
      subs.map((row) => webpush.sendNotification(row.subscription, payload))
    );

    // 만료된 구독(410) 제거
    const expired = results
      .map((r, i) => ({ r, sub: subs[i].subscription }))
      .filter(
        ({ r }) =>
          r.status === "rejected" &&
          (r as PromiseRejectedResult).reason?.statusCode === 410
      )
      .map(({ sub }) => sub);

    if (expired.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", partner_id)
        .in("subscription", expired);
    }

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return new Response(JSON.stringify({ sent }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
