// 로컬 타임존 기준 YYYY-MM-DD (DB date 컬럼 포맷)
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatTodayLabel(): string {
  return new Date().toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

// ISO 날짜 문자열에 days를 더한 새 ISO 문자열 반환
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 날짜 네비게이션 헤더용 레이블 (예: "2026년 5월 29일 (목)")
export function formatDateNavLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  return `${y}년 ${m}월 ${day}일 (${w})`;
}

// 폼 버튼 등 좁은 공간용 짧은 날짜 (예: "5월 29일 (목)")
export function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  return `${m}월 ${day}일 (${w})`;
}
