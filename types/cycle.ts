import type { Tables } from "./supabase";

export type PersonalCycle = Tables<"personal_cycles">;

export type ShareLevel = "period_only";

export type CycleDayType = "recorded" | "expected" | "ovulation";

export interface CycleFormValues {
  start_date: string;       // 'YYYY-MM-DD'
  end_date: string | null;  // null = 종료일 미입력
}

// MonthCalendar에 전달하는 경량 표현
export interface CycleRange {
  id: string;
  start_date: string;
  end_date: string | null;
  share_level: ShareLevel;
  user_id: string;
}

export interface CyclePrediction {
  userId: string;
  expectedStartDate: string;
  ovulationDate: string;
  cycleLengthDays: number;
  sampleCount: number;
  isFallback: boolean;
}
