import { describe, expect, it } from "vitest";
import { feedbackDeliveryDecision } from "../../../supabase/functions/_shared/feedbackNotification";

const base = {
  kind: "new" as "new" | "reply",
  recipientId: "admin",
  authorId: "user",
  recipientIsAdmin: true,
  enabled: false,
  replyRevision: 0,
  eventRevision: 0,
};
describe("의견 알림 수신 정책", () => {
  it("관리자 새 의견은 개인 답변 알림이 꺼져도 보내고 본인 의견과 권한 해제는 제외한다", () => {
    expect(feedbackDeliveryDecision(base)).toEqual({
      send: true,
      body: "새로운 의견이 도착했어요.",
      admin: true,
    });
    expect(feedbackDeliveryDecision({ ...base, authorId: "admin" }).send).toBe(
      false,
    );
    expect(
      feedbackDeliveryDecision({ ...base, recipientIsAdmin: false }).send,
    ).toBe(false);
  });
  it("사용자가 켠 답변만 보내며 오래된 버전이나 수신자 위조를 제외한다", () => {
    const reply = {
      ...base,
      kind: "reply" as const,
      recipientId: "user",
      enabled: true,
      replyRevision: 2,
      eventRevision: 2,
    };
    expect(feedbackDeliveryDecision(reply)).toEqual({
      send: true,
      body: "개발자가 답변을 조금 다듬었어요. 다시 확인해주세요.",
      admin: false,
    });
    expect(feedbackDeliveryDecision({ ...reply, eventRevision: 1 }).send).toBe(
      false,
    );
    expect(feedbackDeliveryDecision({ ...reply, enabled: false }).send).toBe(
      false,
    );
    expect(
      feedbackDeliveryDecision({ ...reply, recipientId: "stranger" }).send,
    ).toBe(false);
  });
});
