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
  entity_date?: string;
}

const ACTION_LABEL: Record<string, string> = {
  add: "등록했어요",
  update: "수정했어요",
  delete: "삭제했어요",
};

const ENTITY_LABEL: Record<string, string> = {
  todo: "할 일을",
  event: "일정을",
};

// 이름 마지막 글자의 받침 유무에 따라 주격 조사 반환
function subjectParticle(name: string): string {
  if (!name) return "이";
  const code = name.charCodeAt(name.length - 1);
  if (code < 0xAC00 || code > 0xD7A3) return "이";
  return (code - 0xAC00) % 28 === 0 ? "가" : "이";
}

// "YYYY-MM-DD" → "n월 n일"
function formatKoreanDate(iso: string): string {
  const parts = iso.split("-");
  if (parts.length < 3) return iso;
  return `${parseInt(parts[1])}월 ${parseInt(parts[2])}일`;
}

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
    // C3: JWT 검증 — Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.slice(7);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 호출자 신원 확인
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: NotifyPayload = await req.json();
    const { partner_id, actor_name, action, entity_type, entity_title, entity_date } = body;

    // C3: 커플 관계 검증 — caller와 partner_id가 실제 커플인지 확인
    const { data: coupleRow } = await supabase
      .from("couples")
      .select("id")
      .or(
        `and(user1_id.eq.${caller.id},user2_id.eq.${partner_id}),and(user1_id.eq.${partner_id},user2_id.eq.${caller.id})`
      )
      .maybeSingle();

    if (!coupleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // C2: 수신자 알림 설정 확인
    const { data: recipientSettings } = await supabase
      .from("notification_settings")
      .select("partner_enabled, show_content")
      .eq("user_id", partner_id)
      .maybeSingle();

    // partner_enabled false면 발송 스킵
    if (recipientSettings && !recipientSettings.partner_enabled) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "partner_disabled" }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const entityLabel = ENTITY_LABEL[entity_type] ?? "항목을";
    const actionLabel = ACTION_LABEL[action] ?? "변경했어요";
    const particle = subjectParticle(actor_name);

    const showContent = recipientSettings?.show_content ?? false;

    const notifTitle = "Harutodo";
    const baseLine = `${actor_name}${particle} ${entityLabel} ${actionLabel}.`;
    const detailLine =
      showContent && entity_title
        ? entity_date
          ? `${formatKoreanDate(entity_date)} - ${entity_title}`
          : entity_title
        : null;
    const notifBody = detailLine ? `${baseLine}\n${detailLine}` : baseLine;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", partner_id);

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // M3: data.url 형식 (Service Worker와 일치)
    const todoUrl =
      entity_type === "todo" && entity_date
        ? `/?date=${entity_date}`
        : "/";
    const payload = JSON.stringify({
      title: notifTitle,
      body: notifBody,
      data: {
        url: entity_type === "event" ? "/calendar" : todoUrl,
      },
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
