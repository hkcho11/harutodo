import type { Tables } from "./supabase";

export type Event = Tables<"events">;

// 일정 폼 입력 (RHF + zod)
export interface EventFormValues {
  title: string;
  date: string;
  start_time: string | null; // 'HH:MM' or null
  end_time: string | null;
  assignee_id: string | null; // null = 함께
}
