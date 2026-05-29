import type { Event } from "@/types/event";

// 일정 색상은 참여자(assignee_id) 기준으로 분기.
// 함께(null) = secondary(살구) / 본인 = primary(연두) / 파트너 = accent(스카이)
// 컴포넌트에서 임의 색상 하드코딩 금지 — 항상 이 함수를 통해 호출.
export function eventColorClass(
  event: Pick<Event, "assignee_id">,
  meId: string | null
): string {
  if (event.assignee_id === null) return "bg-haru-secondary text-haru-text";
  if (meId && event.assignee_id === meId)
    return "bg-haru-primary text-haru-text";
  return "bg-haru-accent text-haru-text";
}

// 'HH:MM:SS' → 'HH:MM' (DB에서 오는 time 값을 표시용으로 자름)
export function formatTime(t: string | null): string | null {
  if (!t) return null;
  return t.slice(0, 5);
}

// 캘린더 셀에 짧게 표시할 라벨 — 시간이 있으면 prefix
export function formatEventLabel(event: Event): string {
  const time = formatTime(event.start_time);
  return time ? `${time} ${event.title}` : event.title;
}

// 상세 시간 표시 — 시작/종료 둘 다, 또는 종일
export function formatEventTimeRange(event: Event): string {
  const s = formatTime(event.start_time);
  const e = formatTime(event.end_time);
  if (!s && !e) return "종일";
  if (s && e) return `${s} – ${e}`;
  if (s) return `${s}부터`;
  return `${e}까지`;
}
