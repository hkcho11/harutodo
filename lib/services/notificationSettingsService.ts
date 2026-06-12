import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/supabase";

export type NotificationSettings = Tables<"notification_settings">;

export type NotificationSettingsUpdate = Pick<
  NotificationSettings,
  | "morning_enabled"
  | "morning_time"
  | "event_enabled"
  | "event_lead_min"
  | "evening_enabled"
  | "evening_time"
  | "partner_enabled"
  | "show_content"
>;

export async function getNotificationSettings(
  userId: string
): Promise<NotificationSettings | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function updateNotificationSettings(
  userId: string,
  patch: Partial<NotificationSettingsUpdate>
): Promise<NotificationSettings> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("notification_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
