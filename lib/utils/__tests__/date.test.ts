import { describe, it, expect } from "vitest";
import { addDays, formatDateNavLabel, formatDateShort } from "../date";

describe("addDays", () => {
  it("일반 날짜에 양수 더하기", () => {
    expect(addDays("2026-01-15", 5)).toBe("2026-01-20");
  });

  it("월 경계 넘기", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("연 경계 넘기", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("음수로 날짜 빼기", () => {
    expect(addDays("2026-06-01", -1)).toBe("2026-05-31");
  });

  it("윤년 2월 28일 다음날은 29일", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
  });

  it("윤년 2월 29일 다음날은 3월 1일", () => {
    expect(addDays("2024-02-29", 1)).toBe("2024-03-01");
  });

  it("비윤년 2월 28일 다음날은 3월 1일", () => {
    expect(addDays("2025-02-28", 1)).toBe("2025-03-01");
  });

  it("0을 더하면 원본 반환", () => {
    expect(addDays("2026-06-14", 0)).toBe("2026-06-14");
  });

  it("큰 수 더하기 — 여러 월 넘기", () => {
    expect(addDays("2026-01-01", 365)).toBe("2027-01-01");
  });
});

describe("formatDateNavLabel", () => {
  it("2026-05-29는 금요일 형식", () => {
    expect(formatDateNavLabel("2026-05-29")).toBe("2026년 5월 29일 (금)");
  });

  it("2026-01-01은 목요일 형식", () => {
    expect(formatDateNavLabel("2026-01-01")).toBe("2026년 1월 1일 (목)");
  });

  it("12월은 두 자리 월 형식", () => {
    expect(formatDateNavLabel("2026-12-25")).toBe("2026년 12월 25일 (금)");
  });

  it("일요일 표기 확인", () => {
    expect(formatDateNavLabel("2026-06-14")).toBe("2026년 6월 14일 (일)");
  });
});

describe("formatDateShort", () => {
  it("5월 형식 — 연도 없음", () => {
    expect(formatDateShort("2026-05-29")).toBe("5월 29일 (금)");
  });

  it("12월 형식", () => {
    expect(formatDateShort("2026-12-25")).toBe("12월 25일 (금)");
  });

  it("1월 1일 형식", () => {
    expect(formatDateShort("2026-01-01")).toBe("1월 1일 (목)");
  });

  it("일요일 표기 확인", () => {
    expect(formatDateShort("2026-06-14")).toBe("6월 14일 (일)");
  });
});
