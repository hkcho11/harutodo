import { describe, expect, it } from "vitest";
import {
  feedbackInputSchema,
  feedbackReplySchema,
  validateFeedbackImage,
  safeFeedbackReturnPath,
  hasUnreadFeedbackReply,
  shouldResetFeedbackAccount,
} from "@/lib/utils/feedback";

describe("의견 입력과 비공개 알림 경계", () => {
  it("같은 계정의 인증 갱신은 작성 내용을 유지하고 계정 전환/로그아웃만 초기화한다", () => {
    expect(shouldResetFeedbackAccount("user-a", "user-a")).toBe(false);
    expect(shouldResetFeedbackAccount("user-a", "user-b")).toBe(true);
    expect(shouldResetFeedbackAccount("user-a", null)).toBe(true);
  });
  it("공백뿐인 제목/내용과 길이 초과를 거부하고 입력을 정리한다", () => {
    expect(
      feedbackInputSchema.safeParse({ title: "  ", content: "내용" }).success,
    ).toBe(false);
    expect(
      feedbackInputSchema.safeParse({
        title: "제목",
        content: " ",
        attachmentIds: [],
      }).success,
    ).toBe(false);
    expect(
      feedbackInputSchema.safeParse({
        title: "가".repeat(101),
        content: "내용",
      }).success,
    ).toBe(false);
    expect(
      feedbackInputSchema.parse({ title: " 제목 ", content: " 내용 " }),
    ).toEqual({ title: "제목", content: "내용", attachmentIds: [] });
    expect(feedbackReplySchema.safeParse("가".repeat(5001)).success).toBe(
      false,
    );
  });
  it("3장 및 10MiB 경계를 허용하고 형식 위장과 초과를 거부한다", () => {
    expect(
      validateFeedbackImage({ type: "image/png", size: 10 * 1024 * 1024 }),
    ).toBeNull();
    expect(
      validateFeedbackImage({ type: "image/png", size: 10 * 1024 * 1024 + 1 }),
    ).toBeTruthy();
    expect(
      validateFeedbackImage({ type: "image/svg+xml", size: 100 }),
    ).toBeTruthy();
    expect(validateFeedbackImage({ type: "image/jpeg", size: 0 })).toBeTruthy();
    expect(
      feedbackInputSchema.safeParse({
        title: "제목",
        content: "내용",
        attachmentIds: Array(4).fill("11111111-1111-4111-8111-111111111111"),
      }).success,
    ).toBe(false);
  });
  it("의견함 내부 목적지만 로그인 복귀 경로로 허용한다", () => {
    expect(safeFeedbackReturnPath("/feedback/admin/abc")).toBe(
      "/feedback/admin/abc",
    );
    for (const path of [
      "https://evil.test",
      "//evil.test",
      "/feedback-evil",
      "/feedback/../api/auth/signout",
      "/feedback/%2e%2e/login",
      "/feedback\\evil",
    ]) {
      expect(safeFeedbackReturnPath(path)).toBe("/");
    }
  });
  it("읽은 버전보다 새 답변만 미확인으로 판단한다", () => {
    expect(
      hasUnreadFeedbackReply({ replyRevision: 2, readReplyRevision: 1 }),
    ).toBe(true);
    expect(
      hasUnreadFeedbackReply({ replyRevision: 2, readReplyRevision: 2 }),
    ).toBe(false);
    expect(
      hasUnreadFeedbackReply({ replyRevision: 0, readReplyRevision: 0 }),
    ).toBe(false);
  });
});
