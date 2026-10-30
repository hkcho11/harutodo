import { describe, expect, it } from "vitest";
import { isFeedbackImageSignature } from "@/lib/utils/feedback";

describe("첨부 실제 형식", () => {
  it("확장자나 MIME만 믿지 않고 실제 이미지 헤더를 확인한다", () => {
    expect(
      isFeedbackImageSignature(
        new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
        "image/png",
      ),
    ).toBe(true);
    expect(
      isFeedbackImageSignature(
        new Uint8Array([255, 216, 255, 224]),
        "image/jpeg",
      ),
    ).toBe(true);
    expect(
      isFeedbackImageSignature(
        new TextEncoder().encode("RIFF0000WEBP"),
        "image/webp",
      ),
    ).toBe(true);
    expect(
      isFeedbackImageSignature(
        new TextEncoder().encode("<svg onload='evil'>"),
        "image/png",
      ),
    ).toBe(false);
    expect(
      isFeedbackImageSignature(new Uint8Array([137, 80]), "image/png"),
    ).toBe(false);
  });
});
