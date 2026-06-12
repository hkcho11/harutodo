import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore — webpush types bundled at runtime
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_EMAIL = Deno.env.get("VAPID_EMAIL") ?? "mailto:admin@harutodo.app";

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

interface NotificationSettingsRow {
  user_id: string;
  morning_enabled: boolean;
  morning_time: string; // 'HH:MM:SS'
}

interface PushSubscriptionRow {
  user_id: string;
  subscription: PushSubscriptionData;
}

interface CoupleRow {
  id: string;
  user1_id: string;
  user2_id: string;
}

/** Floor a Date to the nearest 15-minute boundary in UTC */
function floorTo15Min(d: Date): Date {
  const ms = d.getTime();
  return new Date(ms - (ms % (15 * 60 * 1000)));
}

/** Parse 'HH:MM' or 'HH:MM:SS' → total minutes since midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Format Date as 'YYYY-MM-DD' in KST (UTC+9) */
function toKSTDateString(utc: Date): string {
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/** Get KST minutes-since-midnight for a UTC Date */
function toKSTMinutes(utc: Date): number {
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date();
  const windowStart = floorTo15Min(now);
  const windowEnd = new Date(windowStart.getTime() + 15 * 60 * 1000);

  const windowStartMin = toKSTMinutes(windowStart);
  const windowEndMin = toKSTMinutes(windowEnd);
  const todayKST = toKSTDateString(now);

  let processedCount = 0;
  let sentCount = 0;

  try {
    // 1. Fetch users with morning notifications enabled
    const { data: settings, error: settingsErr } = await supabase
      .from("notification_settings")
      .select("user_id, morning_enabled, morning_time")
      .eq("morning_enabled", true);

    if (settingsErr) {
      console.error("[morning-summary] fetch settings error:", settingsErr);
      return new Response(JSON.stringify({ error: String(settingsErr.message) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 2. Filter to users whose morning_time falls in this 15-min window
    const targetSettings = (settings as NotificationSettingsRow[]).filter((s) => {
      const userMin = timeToMinutes(s.morning_time);
      // Handle midnight rollover: window may span 00:00
      if (windowStartMin < windowEndMin) {
        return userMin >= windowStartMin && userMin < windowEndMin;
      } else {
        return userMin >= windowStartMin || userMin < windowEndMin;
      }
    });

    if (targetSettings.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const targetUserIds = targetSettings.map((s) => s.user_id);

    // 3. Fetch push subscriptions for target users
    const { data: subscriptions, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("user_id, subscription")
      .in("user_id", targetUserIds);

    if (subsErr) {
      console.error("[morning-summary] fetch subscriptions error:", subsErr);
    }

    const subsByUser = new Map<string, PushSubscriptionData[]>();
    for (const row of (subscriptions ?? []) as PushSubscriptionRow[]) {
      const arr = subsByUser.get(row.user_id) ?? [];
      arr.push(row.subscription);
      subsByUser.set(row.user_id, arr);
    }

    // 4. Process each user
    for (const setting of targetSettings) {
      const userId = setting.user_id;
      const userSubs = subsByUser.get(userId);

      if (!userSubs || userSubs.length === 0) continue;

      processedCount++;

      try {
        // Find user's couple
        const { data: coupleRows } = await supabase
          .from("couples")
          .select("id, user1_id, user2_id")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .limit(1);

        const couple = coupleRows && coupleRows.length > 0
          ? (coupleRows[0] as CoupleRow)
          : null;

        if (!couple) continue;

        const coupleId = couple.id;

        // Count today's incomplete todos for this user
        // assignee_id = user OR assignee_id = null (together/unassigned)
        const { count: todoCount } = await supabase
          .from("todo_items")
          .select("id", { count: "exact", head: true })
          .eq("couple_id", coupleId)
          .eq("is_completed", false)
          .eq("date", todayKST)
          .or(`assignee_id.eq.${userId},assignee_id.is.null`);

        // Count today's events for this couple
        const { count: eventCount } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("couple_id", coupleId)
          .eq("date", todayKST);

        const todos = todoCount ?? 0;
        const events = eventCount ?? 0;

        // Skip if nothing to report
        if (todos === 0 && events === 0) continue;

        // Build notification body
        let body: string;
        if (todos > 0 && events > 0) {
          body = `오늘 할 일 ${todos}개, 일정 ${events}개가 있어요`;
        } else if (todos > 0) {
          body = `오늘 할 일 ${todos}개가 기다리고 있어요`;
        } else {
          body = `오늘 일정 ${events}개가 있어요`;
        }

        const notificationId = crypto.randomUUID();
        const payload = JSON.stringify({
          title: "하루투두 ☀️",
          body,
          data: {
            url: `/?source=push&notification_id=${notificationId}&type=morning`,
          },
        });

        // Send to all user subscriptions
        const results = await Promise.allSettled(
          userSubs.map((sub) => webpush.sendNotification(sub, payload))
        );

        // Remove expired subscriptions (410)
        const expiredSubs = results
          .map((r, i) => ({ r, sub: userSubs[i] }))
          .filter(
            ({ r }) =>
              r.status === "rejected" &&
              (r as PromiseRejectedResult).reason?.statusCode === 410
          )
          .map(({ sub }) => sub);

        if (expiredSubs.length > 0) {
          for (const expiredSub of expiredSubs) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", userId)
              .eq("subscription->>endpoint", expiredSub.endpoint);
          }
        }

        const userSent = results.filter((r) => r.status === "fulfilled").length;
        const status = userSent > 0 ? "sent" : "failed";

        if (userSent > 0) sentCount++;

        // Log to notification_logs (UNIQUE on user_id, type, scheduled_date)
        await supabase.from("notification_logs").upsert(
          {
            user_id: userId,
            type: "morning",
            notification_id: notificationId,
            scheduled_date: todayKST,
            status,
          },
          { onConflict: "user_id,type,scheduled_date", ignoreDuplicates: false }
        );
      } catch (userErr) {
        console.error(`[morning-summary] error processing user ${userId}:`, userErr);

        await supabase.from("notification_logs").upsert(
          {
            user_id: userId,
            type: "morning",
            notification_id: crypto.randomUUID(),
            scheduled_date: todayKST,
            status: "failed",
          },
          { onConflict: "user_id,type,scheduled_date", ignoreDuplicates: true }
        );
      }
    }

    return new Response(JSON.stringify({ processed: processedCount, sent: sentCount }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("[morning-summary] fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
