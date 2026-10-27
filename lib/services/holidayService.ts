import { createClient } from "@/lib/supabase/client";
import {
  buildOfficialHolidayMap,
  type OfficialHolidayRow,
} from "@/lib/utils/koreanHolidayDisplay";
import type { KoreanHoliday } from "@/types/domain/holiday";

export async function fetchKoreanHolidays(
  startDate: string,
  endDate: string
): Promise<Map<string, KoreanHoliday>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("korean_holidays")
    .select("holiday_date, names, is_substitute")
    .gte("holiday_date", startDate)
    .lte("holiday_date", endDate)
    .order("holiday_date");

  if (error) throw error;

  return buildOfficialHolidayMap((data ?? []) as OfficialHolidayRow[]);
}
