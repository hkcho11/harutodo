import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { verifyCronRequest } from "../_shared/verifyCronRequest.ts";
import { feedbackDeliveryDecision } from "../_shared/feedbackNotification.ts";

type Job = {
  id: string;
  feedback_id: string;
  recipient_id: string;
  kind: "new" | "reply";
  reply_revision: number;
  attempts: number;
  lease_token: string;
  delivered_endpoints: string[];
};
type Subscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};
const headers = { "Content-Type": "application/json" };
const hash = async (value: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
Deno.serve(async (request) => {
  const denied = verifyCronRequest(request);
  if (denied) return denied;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  webpush.setVapidDetails(
    "mailto:cmkbeew@gmail.com",
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
  const { data: jobs, error } = await client.rpc(
    "claim_feedback_notifications",
  );
  if (error)
    return new Response(JSON.stringify({ error: "claim_failed" }), {
      status: 500,
      headers,
    });
  let processed = 0;
  for (const job of (jobs ?? []) as Job[]) {
    const delivered = [...(job.delivered_endpoints ?? [])];
    const finish = async (status: string) => {
      const { error: updateError } = await client
        .from("feedback_notification_outbox")
        .update({
          status,
          delivered_endpoints: delivered,
          lease_until: null,
          next_attempt_at: new Date(
            Date.now() + 60000 * job.attempts,
          ).toISOString(),
        })
        .eq("id", job.id)
        .eq("lease_token", job.lease_token);
      if (updateError)
        console.error("[feedback-push] state_update_failed", job.id);
    };
    try {
      const [
        { data: feedback, error: itemError },
        { data: admin, error: adminError },
        { data: prefs, error: prefsError },
      ] = await Promise.all([
        client
          .from("feedback")
          .select("author_id,reply_revision")
          .eq("id", job.feedback_id)
          .maybeSingle(),
        client
          .from("feedback_admins")
          .select("user_id")
          .eq("user_id", job.recipient_id)
          .maybeSingle(),
        client
          .from("feedback_preferences")
          .select("enabled")
          .eq("user_id", job.recipient_id)
          .maybeSingle(),
      ]);
      if (itemError || adminError || prefsError)
        throw new Error("lookup_failed");
      if (!feedback) {
        await finish("skipped");
        continue;
      }
      const decision = feedbackDeliveryDecision({
        kind: job.kind,
        recipientId: job.recipient_id,
        authorId: feedback.author_id,
        recipientIsAdmin: !!admin,
        enabled: prefs?.enabled ?? false,
        replyRevision: feedback.reply_revision,
        eventRevision: job.reply_revision,
      });
      if (!decision.send) {
        await finish("skipped");
        continue;
      }
      const { data: subscriptions, error: subError } = await client
        .from("push_subscriptions")
        .select("id,subscription")
        .eq("user_id", job.recipient_id);
      if (subError) throw new Error("subscriptions_failed");
      if (!subscriptions?.length) {
        await finish("skipped");
        continue;
      }
      const payload = JSON.stringify({
        title: "하루투두",
        body: decision.body,
        data: {
          url: `/feedback/${decision.admin ? "admin/" : ""}${job.feedback_id}`,
        },
      });
      let failed = false;
      for (const row of subscriptions) {
        const subscription = row.subscription as Subscription;
        const endpointHash = await hash(subscription.endpoint);
        if (delivered.includes(endpointHash)) continue;
        try {
          await webpush.sendNotification(subscription, payload, {
            timeout: 10000,
          });
          delivered.push(endpointHash);
        } catch (error) {
          const code =
            error && typeof error === "object" && "statusCode" in error
              ? error.statusCode
              : 0;
          if (code === 404 || code === 410) {
            await client.from("push_subscriptions").delete().eq("id", row.id);
          } else failed = true;
        }
      }
      await finish(
        failed ? (job.attempts >= 3 ? "failed" : "pending") : "sent",
      );
      processed++;
    } catch {
      await finish(job.attempts >= 3 ? "failed" : "pending");
      console.error("[feedback-push] delivery_failed", job.id);
    }
  }
  return new Response(JSON.stringify({ processed }), { headers });
});
