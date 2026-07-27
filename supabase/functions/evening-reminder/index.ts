import { createClient } from "jsr:@supabase/supabase-js@2";
// @ts-ignore — webpush types bundled at runtime
import webpush from "npm:web-push@3.6.7";
import { verifyCronRequest } from "../_shared/verifyCronRequest.ts";

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
  evening_enabled: boolean;
  evening_time: string; // 'HH:MM:SS'
}

interface PushSubscriptionRow {
  user_id: string;
  subscription: PushSubscriptionData;
}

interface NotificationLogRow {
  user_id: string;
  status: string;
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
        "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
      },
    });
  }

  const authError = verifyCronRequest(req);
  if (authError) return authError;

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
    // 1. Fetch users with evening notifications enabled
    const { data: settings, error: settingsErr } = await supabase
      .from("notification_settings")
      .select("user_id, evening_enabled, evening_time")
      .eq("evening_enabled", true);

    if (settingsErr) {
      console.error("[evening-reminder] fetch settings error:", settingsErr);
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

    // 2. Filter to users whose evening_time falls in this 15-min window
    const targetSettings = (settings as NotificationSettingsRow[]).filter((s) => {
      const userMin = timeToMinutes(s.evening_time);
      if (windowStartMin < windowEndMin) {
        return userMin >= windowStartMin && userMin < windowEndMin;
      } else {
        // Handle midnight rollover
        return userMin >= windowStartMin || userMin < windowEndMin;
      }
    });

    if (targetSettings.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const targetUserIds = targetSettings.map((s) => s.user_id);

    // 3. Check notification_logs for users already sent today — skip them
    const { data: existingLogs } = await supabase
      .from("notification_logs")
      .select("user_id, status")
      .in("user_id", targetUserIds)
      .eq("type", "evening")
      .eq("scheduled_date", todayKST);

    const alreadySentUserIds = new Set(
      ((existingLogs ?? []) as NotificationLogRow[])
        .filter((log) => log.status === "sent")
        .map((log) => log.user_id)
    );

    const pendingSettings = targetSettings.filter(
      (s) => !alreadySentUserIds.has(s.user_id)
    );

    if (pendingSettings.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0, skipped: targetSettings.length }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const pendingUserIds = pendingSettings.map((s) => s.user_id);

    // 4. Fetch push subscriptions for pending users
    const { data: subscriptions, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("user_id, subscription")
      .in("user_id", pendingUserIds);

    if (subsErr) {
      console.error("[evening-reminder] fetch subscriptions error:", subsErr);
    }

    const subsByUser = new Map<string, PushSubscriptionData[]>();
    for (const row of (subscriptions ?? []) as PushSubscriptionRow[]) {
      const arr = subsByUser.get(row.user_id) ?? [];
      arr.push(row.subscription);
      subsByUser.set(row.user_id, arr);
    }

    // 5. Process each user
    for (const setting of pendingSettings) {
      const userId = setting.user_id;
      const userSubs = subsByUser.get(userId);

      if (!userSubs || userSubs.length === 0) continue;

      processedCount++;

      try {
        // Find user's couple to get couple_id
        const { data: coupleRows } = await supabase
          .from("couples")
          .select("id")
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
          .limit(1);

        const coupleId = coupleRows && coupleRows.length > 0
          ? (coupleRows[0] as { id: string }).id
          : null;

        if (!coupleId) continue;

        // Count today's incomplete todos where assignee is this user or null (not partner-only)
        // EXCLUDE partner-only todos: only include assignee_id = user OR assignee_id = null
        const { count: todoCount } = await supabase
          .from("todo_items")
          .select("id", { count: "exact", head: true })
          .eq("couple_id", coupleId)
          .eq("is_completed", false)
          .eq("date", todayKST)
          .or(`assignee_id.eq.${userId},assignee_id.is.null`);

        const todos = todoCount ?? 0;

        // Skip if nothing remaining
        if (todos === 0) continue;

        const body = `오늘 할 일 ${todos}개가 아직 남아 있어요`;

        const notificationId = crypto.randomUUID();
        const payload = JSON.stringify({
          title: "하루투두 🌙",
          body,
          data: {
            url: `/?source=push&notification_id=${notificationId}&type=evening`,
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

        // Log to notification_logs — UNIQUE(user_id, type, scheduled_date) prevents double-send
        await supabase.from("notification_logs").upsert(
          {
            user_id: userId,
            type: "evening",
            notification_id: notificationId,
            scheduled_date: todayKST,
            status,
          },
          { onConflict: "user_id,type,scheduled_date", ignoreDuplicates: false }
        );
      } catch (userErr) {
        console.error(`[evening-reminder] error processing user ${userId}:`, userErr);

        await supabase.from("notification_logs").upsert(
          {
            user_id: userId,
            type: "evening",
            notification_id: crypto.randomUUID(),
            scheduled_date: todayKST,
            status: "failed",
          },
          { onConflict: "user_id,type,scheduled_date", ignoreDuplicates: true }
        );
      }
    }

    return new Response(
      JSON.stringify({ processed: processedCount, sent: sentCount }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    console.error("[evening-reminder] fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
