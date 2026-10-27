import { describe, expect, it } from "vitest";
import {
  getKoreanHolidayLabel,
  getKoreanHolidayLabelLines,
} from "../koreanHolidayLabel";

describe("getKoreanHolidayLabel", () => {
  it.each([
    ["설연휴", "설연휴"],
    ["설날", "설날"],
    ["설날 대체공휴일", "설날대체공휴일"],
    ["추석연휴", "추석연휴"],
    ["추석", "추석"],
    ["추석 대체공휴일", "추석대체공휴일"],
    ["개천절", "개천절"],
    ["개천절 대체공휴일", "개천절대체공휴일"],
  ])("%s를 %s로 표시한다", (name, expected) => {
    expect(getKoreanHolidayLabel(name)).toBe(expected);
  });

  it("대체공휴일은 최대 두 줄로 의미 단위를 나눈다", () => {
    expect(getKoreanHolidayLabelLines("개천절 대체공휴일")).toEqual([
      "개천절",
      "대체공휴일",
    ]);
  });

  it("짧은 원 공휴일명도 대체공휴일과 두 줄로 표시한다", () => {
    expect(getKoreanHolidayLabelLines("설날 대체공휴일")).toEqual([
      "설날",
      "대체공휴일",
    ]);
  });
});
