import type { Tables } from "./supabase";

export type Event = Tables<"events">;

// 일정 폼 입력 (RHF + zod)
export interface EventFormValues {
  title: string;
  date: string;
  end_date: string | null; // null = 단일일
  start_time: string | null; // 'HH:MM' or null
  end_time: string | null;
  assignee_id: string | null; // null = 함께
  location_name: string | null;
  location_address: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  location_provider: string | null;
  location_provider_id: string | null;
  location_url: string | null;
}

// 장소 검색 결과 선택 항목
export interface SelectedLocation {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  provider: string;
  providerId: string;
  url: string;
}
