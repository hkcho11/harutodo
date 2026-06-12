import { createClient } from "@/lib/supabase/client";

export type AnalyticsEventName = "push_clicked";

export interface PushClickedProperties {
  notification_id: string;
  type: "morning" | "evening" | "event_reminder";
  source: "push";
}

export async function trackEvent(
  userId: string,
  eventName: AnalyticsEventName,
  properties: Record<string, string>
): Promise<void> {
  const supabase = createClient();
  await supabase.from("analytics_events").insert({
    user_id: userId,
    event_name: eventName,
    properties,
  });
}
