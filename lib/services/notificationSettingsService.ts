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
    if (error.code !== "PGRST116") throw error;
    // row 없으면 기본값으로 생성 (기존 유저 또는 트리거 누락 시 fallback)
    const { data: created, error: insertError } = await supabase
      .from("notification_settings")
      .insert({ user_id: userId })
      .select()
      .single();
    if (insertError) throw insertError;
    return created;
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
