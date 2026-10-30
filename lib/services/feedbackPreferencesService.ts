import { feedbackClient, feedbackError } from "./feedbackClient";
import { toFeedbackPreferences } from "./mappers/feedbackMapper";
import { subscribePush } from "./pushService";
import { getFeedbackContext } from "./feedbackService";
import type { FeedbackPreferences } from "@/types/domain/feedback";

export async function getFeedbackPreferences() {
  const { data, error } = await feedbackClient().rpc(
    "feedback_preferences_get",
  );
  if (error) throw feedbackError(error);
  return toFeedbackPreferences(data);
}
export async function updateFeedbackPreferences(
  patch: Partial<FeedbackPreferences>,
) {
  const { data, error } = await feedbackClient().rpc(
    "feedback_preferences_set",
    { p_enabled: patch.enabled, p_prompt_seen: patch.promptSeen },
  );
  if (error) throw feedbackError(error);
  return toFeedbackPreferences(data);
}
export async function enableFeedbackNotifications(): Promise<
  "enabled" | "denied" | "unsupported" | "failed"
> {
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("PushManager" in window) ||
    !("serviceWorker" in navigator)
  )
    return "unsupported";
  // Request permission synchronously from the click, before waiting for account/network data.
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  try {
    const { userId } = await getFeedbackContext();
    if (!(await subscribePush(userId))) return "failed";
    await updateFeedbackPreferences({ enabled: true, promptSeen: true });
    return "enabled";
  } catch {
    return "failed";
  }
}
