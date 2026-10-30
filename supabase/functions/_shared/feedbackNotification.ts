export interface FeedbackDeliveryInput {
  kind: "new" | "reply";
  recipientId: string;
  authorId: string;
  recipientIsAdmin: boolean;
  enabled: boolean;
  replyRevision: number;
  eventRevision: number;
}
export function feedbackDeliveryDecision(input: FeedbackDeliveryInput): {
  send: boolean;
  body?: string;
  admin?: boolean;
} {
  if (input.kind === "new")
    return input.recipientIsAdmin && input.authorId !== input.recipientId
      ? { send: true, body: "새로운 의견이 도착했어요.", admin: true }
      : { send: false };
  if (
    !input.enabled ||
    input.recipientId !== input.authorId ||
    input.replyRevision !== input.eventRevision
  )
    return { send: false };
  return {
    send: true,
    body:
      input.eventRevision > 1
        ? "개발자가 답변을 조금 다듬었어요. 다시 확인해주세요."
        : "남겨주신 이야기에 개발자가 답했어요.",
    admin: false,
  };
}
