import { z } from "zod";
import type {
  Feedback,
  FeedbackPage,
  FeedbackPreferences,
  FeedbackCapabilities,
  FeedbackCounts,
  FeedbackAttachment,
} from "@/types/domain/feedback";

const attachment = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  mediaType: z.string(),
  byteSize: z.number(),
});
const feedback = z.object({
  id: z.string().uuid(),
  authorId: z.string().uuid(),
  authorName: z.string(),
  title: z.string(),
  content: z.string(),
  revision: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  replyRevision: z.number(),
  readReplyRevision: z.number(),
  reply: z
    .object({
      content: z.string(),
      revision: z.number(),
      updatedAt: z.string(),
    })
    .nullable(),
  attachments: z.array(attachment),
});
export const toFeedback = (data: unknown): Feedback => feedback.parse(data);
export const toFeedbackPage = (data: unknown): FeedbackPage =>
  z
    .object({ items: z.array(feedback), nextCursor: z.string().nullable() })
    .parse(data);
export const toFeedbackPreferences = (data: unknown): FeedbackPreferences =>
  z.object({ enabled: z.boolean(), promptSeen: z.boolean() }).parse(data);
export const toFeedbackContext = (
  data: unknown,
): FeedbackCapabilities & FeedbackCounts =>
  z
    .object({
      userId: z.string().uuid(),
      isAdmin: z.boolean(),
      unreadReplies: z.number(),
      pendingFeedback: z.number(),
      answeredFeedback: z.number(),
    })
    .parse(data);
export const toFeedbackAttachment = (data: unknown): FeedbackAttachment =>
  attachment.parse(data);
