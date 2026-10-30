import { z } from "zod";

export function shouldResetFeedbackAccount(
  previous: string | null | undefined,
  next: string | null,
): boolean {
  return previous !== next;
}

export const feedbackInputSchema = z.object({
  title: z.string().trim().min(1, "제목을 적어주세요").max(100),
  content: z.string().trim().min(1, "이야기를 적어주세요").max(5000),
  attachmentIds: z.array(z.string().uuid()).max(3).default([]),
});
export const feedbackReplySchema = z
  .string()
  .trim()
  .min(1, "답변을 적어주세요")
  .max(5000);
export function validateFeedbackImage(file: {
  type: string;
  size: number;
}): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "JPG, PNG, WebP 이미지로 골라주세요";
  if (file.size <= 0 || file.size > 10 * 1024 * 1024)
    return "이미지는 한 장당 10MB 이하로 골라주세요";
  return null;
}
export function safeFeedbackReturnPath(value: string | null): string {
  if (!value || !/^\/feedback(?:\/|$)/.test(value) || /[\\%?#]/.test(value))
    return "/";
  const path = new URL(value, "https://harutodo.invalid").pathname;
  return /^\/feedback(?:\/|$)/.test(path) ? path : "/";
}
export function hasUnreadFeedbackReply(item: {
  replyRevision: number;
  readReplyRevision: number;
}): boolean {
  return item.replyRevision > item.readReplyRevision;
}
export function isFeedbackImageSignature(
  bytes: Uint8Array,
  type: string,
): boolean {
  if (type === "image/jpeg")
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png")
    return [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  return (
    type === "image/webp" &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}
