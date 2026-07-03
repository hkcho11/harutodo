import type { Tables } from "./supabase";

export type PersonalCycle = Tables<"personal_cycles">;

export type ShareLevel = "private" | "period_only" | "period_and_condition";

export const SYMPTOM_TAGS = ["통증", "피곤함", "예민함", "두통"] as const;
export type SymptomTag = (typeof SYMPTOM_TAGS)[number];

export interface CycleFormValues {
  start_date: string;       // 'YYYY-MM-DD'
  end_date: string | null;  // null = 진행 중
  symptom_tags: SymptomTag[];
  note: string;
  share_level: ShareLevel;
}

// MonthCalendar에 전달하는 경량 표현
export interface CycleRange {
  id: string;
  start_date: string;
  end_date: string | null;
  share_level: ShareLevel;
}
