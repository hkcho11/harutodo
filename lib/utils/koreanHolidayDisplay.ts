import { addDays } from "@/lib/utils/date";
import type { KoreanHoliday } from "@/types/domain/holiday";

export interface OfficialHolidayRow {
  holiday_date: string;
  names: string[];
  is_substitute: boolean;
}

function normalizeOfficialName(name: string): string {
  const substituteMatch = name.trim().match(/^대체공휴일\((.+)\)$/);
  return substituteMatch ? `${substituteMatch[1].trim()} 대체공휴일` : name.trim();
}

function normalizedName(names: string[]): string {
  return names.map(normalizeOfficialName).join(" · ").trim();
}

function isSameHolidayName(row: OfficialHolidayRow, name: string): boolean {
  return normalizedName(row.names).replace(/\s+/g, "") === name;
}

function applyHolidayPeriodLabels(
  rows: OfficialHolidayRow[],
  holidays: Map<string, KoreanHoliday>,
  officialName: "설날" | "추석",
  periodLabel: "설연휴" | "추석연휴"
): void {
  const periodRows = rows.filter((row) => isSameHolidayName(row, officialName));
  let run: OfficialHolidayRow[] = [];

  const applyRun = (): void => {
    if (run.length < 3) return;
    const holidayIndex = Math.floor(run.length / 2);
    run.forEach((row, index) => {
      if (index === holidayIndex) return;
      holidays.set(row.holiday_date, {
        name: periodLabel,
        isSubstitute: row.is_substitute,
      });
    });
  };

  for (const row of periodRows) {
    const previous = run.at(-1);
    if (previous && row.holiday_date !== addDays(previous.holiday_date, 1)) {
      applyRun();
      run = [];
    }
    run.push(row);
  }
  applyRun();
}

function findSubstituteOrigin(
  rows: OfficialHolidayRow[],
  substituteIndex: number
): string | null {
  const substituteDate = rows[substituteIndex].holiday_date;
  for (let index = substituteIndex - 1; index >= 0; index--) {
    const candidate = rows[index];
    if (candidate.holiday_date < addDays(substituteDate, -3)) break;
    const candidateName = normalizedName(candidate.names);
    if (
      candidate.is_substitute ||
      candidateName.replace(/\s+/g, "") === "대체공휴일"
    ) {
      continue;
    }
    return candidateName;
  }
  return null;
}

export function buildOfficialHolidayMap(
  sourceRows: OfficialHolidayRow[]
): Map<string, KoreanHoliday> {
  const rows = [...sourceRows].sort((left, right) =>
    left.holiday_date.localeCompare(right.holiday_date)
  );
  const holidays = new Map<string, KoreanHoliday>();

  rows.forEach((row, index) => {
    const rawName = normalizedName(row.names);
    const isGenericSubstitute =
      row.is_substitute && rawName.replace(/\s+/g, "") === "대체공휴일";
    const origin = isGenericSubstitute ? findSubstituteOrigin(rows, index) : null;
    holidays.set(row.holiday_date, {
      name: origin ? `${origin} 대체공휴일` : rawName,
      isSubstitute: row.is_substitute,
    });
  });

  applyHolidayPeriodLabels(rows, holidays, "설날", "설연휴");
  applyHolidayPeriodLabels(rows, holidays, "추석", "추석연휴");
  return holidays;
}
