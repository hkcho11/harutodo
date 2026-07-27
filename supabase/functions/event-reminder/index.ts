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

interface EventRow {
  id: string;
  couple_id: string;
  title: string;
  date: string;        // 'YYYY-MM-DD'
  start_time: string | null; // 'HH:MM' or null
}

interface NotificationScheduleRow {
  id: string;
  user_id: string;
  event_id: string;
  scheduled_at: string; // ISO timestamptz
  events: EventRow | null;
}

interface NotificationSettingsRow {
  user_id: string;
  show_content: boolean;
}

interface PushSubscriptionRow {
  user_id: string;
  subscription: PushSubscriptionData;
}

/** Format Date as 'YYYY-MM-DD' in KST (UTC+9) */
function toKSTDateString(utc: Date): string {
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * Compute minutes until event start from now.
 * event.date is 'YYYY-MM-DD' and event.start_time is 'HH:MM', both in KST.
 * Returns null if start_time is absent (all-day event).
 */
function minutesUntilStart(event: EventRow, now: Date): number | null {
  if (!event.start_time) return null;

  const [h, m] = event.start_time.split(":").map(Number);
  const [year, month, day] = event.date.split("-").map(Number);

  // Construct event start as UTC by subtracting KST offset
  const eventStartUTC = Date.UTC(year, month - 1, day, h - 9, m, 0, 0);
  const diffMs = eventStartUTC - now.getTime();
  return Math.round(diffMs / (60 * 1000));
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
  let processedCount = 0;
  let sentCount = 0;

  try {
    // 1. Fetch due notification schedules (due now, not yet sent, not cancelled)
    const { data: schedules, error: schedulesErr } = await supabase
      .from("notification_schedules")
      .select(`
        id,
        user_id,
        event_id,
        scheduled_at,
        events (
          id,
          couple_id,
          title,
          date,
          start_time
        )
      `)
      .lte("scheduled_at", now.toISOString())
      .is("sent_at", null)
      .is("cancelled_at", null);

    if (schedulesErr) {
      console.error("[event-reminder] fetch schedules error:", schedulesErr);
      return new Response(JSON.stringify({ error: String(schedulesErr.message) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // 2. Gather unique user IDs to batch-fetch subscriptions and settings
    const userIds = [...new Set((schedules as NotificationScheduleRow[]).map((s) => s.user_id))];

    const [subsResult, settingsResult] = await Promise.all([
      supabase
        .from("push_subscriptions")
        .select("user_id, subscription")
        .in("user_id", userIds),
      supabase
        .from("notification_settings")
        .select("user_id, show_content")
        .in("user_id", userIds),
    ]);

    if (subsResult.error) {
      console.error("[event-reminder] fetch subscriptions error:", subsResult.error);
    }
    if (settingsResult.error) {
      console.error("[event-reminder] fetch settings error:", settingsResult.error);
    }

    // Build lookup maps
    const subsByUser = new Map<string, PushSubscriptionData[]>();
    for (const row of (subsResult.data ?? []) as PushSubscriptionRow[]) {
      const arr = subsByUser.get(row.user_id) ?? [];
      arr.push(row.subscription);
      subsByUser.set(row.user_id, arr);
    }

    const settingsByUser = new Map<string, NotificationSettingsRow>();
    for (const row of (settingsResult.data ?? []) as NotificationSettingsRow[]) {
      settingsByUser.set(row.user_id, row);
    }

    // 3. Process each schedule
    for (const schedule of schedules as NotificationScheduleRow[]) {
      const { id: scheduleId, user_id: userId, event_id: eventId } = schedule;
      const event = schedule.events;

      // Skip if event not found (may have been deleted)
      if (!event) {
        console.warn(`[event-reminder] event not found for schedule ${scheduleId}, marking sent`);
        await supabase
          .from("notification_schedules")
          .update({ sent_at: now.toISOString() })
          .eq("id", scheduleId);
        continue;
      }

      const userSubs = subsByUser.get(userId);

      // Skip if no subscription
      if (!userSubs || userSubs.length === 0) {
        // Mark sent so we don't retry endlessly
        await supabase
          .from("notification_schedules")
          .update({ sent_at: now.toISOString() })
          .eq("id", scheduleId);
        continue;
      }

      processedCount++;

      try {
        // Determine notification content
        const userSettings = settingsByUser.get(userId);
        const showContent = userSettings?.show_content ?? false;

        // Compute minutes until start for body text
        const minsLeft = minutesUntilStart(event, now);

        let notifTitle = "곧 일정이 시작돼요 📅";
        let body: string;

        if (showContent) {
          notifTitle = event.title;
        }

        if (minsLeft !== null && event.start_time) {
          body = `${minsLeft}분 후 시작 · ${event.start_time}`;
        } else {
          // All-day event with no start_time
          body = "오늘 일정이 있어요";
        }

        const notificationId = crypto.randomUUID();
        const eventDate = event.date; // already 'YYYY-MM-DD' in KST
        const payload = JSON.stringify({
          title: notifTitle,
          body,
          data: {
            url: `/calendar?source=push&notification_id=${notificationId}&date=${eventDate}&type=event_reminder`,
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

        // Mark schedule as sent
        await supabase
          .from("notification_schedules")
          .update({ sent_at: now.toISOString() })
          .eq("id", scheduleId);

        // Log to notification_logs
        await supabase.from("notification_logs").insert({
          user_id: userId,
          type: "event_reminder",
          notification_id: notificationId,
          scheduled_date: toKSTDateString(now),
          status,
        });
      } catch (scheduleErr) {
        console.error(`[event-reminder] error processing schedule ${scheduleId}:`, scheduleErr);

        // Still mark as sent to avoid infinite retry loop on hard failures
        try {
          await supabase
            .from("notification_schedules")
            .update({ sent_at: now.toISOString() })
            .eq("id", scheduleId);

          await supabase.from("notification_logs").insert({
            user_id: userId,
            type: "event_reminder",
            notification_id: crypto.randomUUID(),
            scheduled_date: toKSTDateString(now),
            status: "failed",
          });
        } catch (logErr) {
          console.error(`[event-reminder] failed to log error for schedule ${scheduleId}:`, logErr);
        }
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
    console.error("[event-reminder] fatal error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
