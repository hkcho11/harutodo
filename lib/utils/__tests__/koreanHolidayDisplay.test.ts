import { describe, expect, it } from "vitest";
import {
  buildOfficialHolidayMap,
  type OfficialHolidayRow,
} from "../koreanHolidayDisplay";

function row(
  holidayDate: string,
  name: string,
  isSubstitute = false
): OfficialHolidayRow {
  return {
    holiday_date: holidayDate,
    names: [name],
    is_substitute: isSubstitute,
  };
}

describe("buildOfficialHolidayMap", () => {
  it("공식 API의 설 연휴 연속 날짜만 연휴로 표시한다", () => {
    const holidays = buildOfficialHolidayMap([
      row("2027-02-06", "설날"),
      row("2027-02-07", "설날"),
      row("2027-02-08", "설날"),
    ]);

    expect(holidays.get("2027-02-06")?.name).toBe("설연휴");
    expect(holidays.get("2027-02-07")?.name).toBe("설날");
    expect(holidays.get("2027-02-08")?.name).toBe("설연휴");
  });

  it("일반 대체공휴일은 공식 데이터의 직전 원 공휴일을 붙인다", () => {
    const holidays = buildOfficialHolidayMap([
      row("2026-10-03", "개천절"),
      row("2026-10-05", "대체공휴일", true),
    ]);

    expect(holidays.get("2026-10-05")?.name).toBe("개천절 대체공휴일");
  });

  it("공식 API의 괄호형 대체공휴일 명칭을 자연스러운 순서로 표시한다", () => {
    const holidays = buildOfficialHolidayMap([
      row("2026-10-03", "개천절"),
      row("2026-10-05", "대체공휴일(개천절)", true),
    ]);

    expect(holidays.get("2026-10-05")?.name).toBe("개천절 대체공휴일");
  });

  it("원 공휴일을 공식 데이터에서 찾지 못하면 API 명칭을 그대로 둔다", () => {
    const holidays = buildOfficialHolidayMap([
      row("2026-06-03", "임시공휴일"),
    ]);

    expect(holidays.get("2026-06-03")?.name).toBe("임시공휴일");
  });
});
