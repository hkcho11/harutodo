import { feedbackClient, feedbackError } from "./feedbackClient";
import {
  toFeedback,
  toFeedbackPage,
  toFeedbackContext,
} from "./mappers/feedbackMapper";
import { feedbackInputSchema, feedbackReplySchema } from "@/lib/utils/feedback";
import type { FeedbackInput } from "@/types/domain/feedback";
import type { Json } from "@/types/feedback-database";

export async function getFeedbackContext() {
  const { data, error } = await feedbackClient().rpc("feedback_context");
  if (error) throw feedbackError(error);
  return toFeedbackContext(data);
}
export const getFeedbackCapabilities = getFeedbackContext;
export const getFeedbackCounts = getFeedbackContext;
async function list(status: "mine" | "pending" | "answered", cursor?: string) {
  const { data, error } = await feedbackClient().rpc("list_feedback", {
    p_status: status,
    p_cursor: cursor ? (JSON.parse(cursor) as Json) : undefined,
  });
  if (error) throw feedbackError(error);
  return toFeedbackPage(data);
}
export const listMyFeedback = (cursor?: string) => list("mine", cursor);
export const listAdminFeedback = (
  status: "pending" | "answered",
  cursor?: string,
) => list(status, cursor);
export async function getFeedback(id: string) {
  const { data, error } = await feedbackClient().rpc("feedback_json", {
    p_id: id,
  });
  if (error) throw feedbackError(error);
  if (!data) throw new Error("의견을 찾을 수 없거나 확인할 권한이 없어요");
  return toFeedback(data);
}
export async function submitFeedback(
  input: FeedbackInput & { requestId: string },
) {
  const value = feedbackInputSchema.parse(input);
  const { data, error } = await feedbackClient().rpc("submit_feedback", {
    p_request_id: input.requestId,
    p_title: value.title,
    p_content: value.content,
    p_attachments: value.attachmentIds,
  });
  if (error) throw feedbackError(error);
  return toFeedback(data);
}
export async function updateFeedback(
  id: string,
  input: FeedbackInput & { expectedRevision: number },
) {
  const value = feedbackInputSchema.parse(input);
  const { data, error } = await feedbackClient().rpc("update_feedback", {
    p_id: id,
    p_revision: input.expectedRevision,
    p_title: value.title,
    p_content: value.content,
    p_attachments: value.attachmentIds,
  });
  if (error) throw feedbackError(error);
  return toFeedback(data);
}
export async function deleteFeedback(id: string, expectedRevision: number) {
  const { error } = await feedbackClient().rpc("delete_feedback", {
    p_id: id,
    p_revision: expectedRevision,
  });
  if (error) throw feedbackError(error);
}
export async function saveFeedbackReply(
  id: string,
  input: {
    expectedRevision: number;
    expectedReplyRevision: number;
    content: string;
  },
) {
  const { data, error } = await feedbackClient().rpc("save_feedback_reply", {
    p_id: id,
    p_revision: input.expectedRevision,
    p_reply_revision: input.expectedReplyRevision,
    p_content: feedbackReplySchema.parse(input.content),
  });
  if (error) throw feedbackError(error);
  return toFeedback(data);
}
export async function markFeedbackReplyRead(id: string, replyRevision: number) {
  const { error } = await feedbackClient().rpc("mark_feedback_reply_read", {
    p_id: id,
    p_revision: replyRevision,
  });
  if (error) throw feedbackError(error);
}
