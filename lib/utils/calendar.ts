// 월간 캘린더 그리드 계산 — 일요일 시작 6주(42셀) 고정.

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DayCell {
  date: Date;
  iso: string;
  inMonth: boolean;
}

// month: 0-based (JS Date 컨벤션)
export function getMonthDays(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const startDate = new Date(year, month, 1 - startDay);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    cells.push({
      date: d,
      iso: toISO(d),
      inMonth: d.getMonth() === month,
    });
  }
  return cells;
}

export function monthRangeISO(year: number, month: number) {
  const first = toISO(new Date(year, month, 1));
  const last = toISO(new Date(year, month + 1, 0));
  return { first, last };
}

export function formatDateLabel(iso: string): string {
  // 'YYYY-MM-DD' → '5월 7일 (수)'
  return new Date(iso + "T00:00:00").toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}
