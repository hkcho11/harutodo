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
  isPreview?: boolean; // 다음 달 미리보기 행
}

// month: 0-based (JS Date 컨벤션)
// 현재 월의 자연스러운 주 수 + 다음 달 1주 미리보기 행을 반환
export function getMonthDays(year: number, month: number): DayCell[] {
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0=Sun
  const startDate = new Date(year, month, 1 - startDay);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mainCellCount = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const totalCells = Math.max(mainCellCount, 35); // 최소 5행, 6주 달은 6행

  const cells: DayCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    cells.push({
      date: d,
      iso: toISO(d),
      inMonth: d.getMonth() === month,
      isPreview: i >= mainCellCount,
    });
  }
  return cells;
}

// 캘린더 그리드 첫째 날 (첫 행 일요일 — 이전 달 leading 날짜 포함)
export function gridFirstISO(year: number, month: number): string {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  return toISO(new Date(year, month, 1 - startDay));
}

// 캘린더 그리드 마지막 날 (최소 5행 기준 마지막 토요일 — 다음 달 trailing 날짜 포함)
export function gridLastISO(year: number, month: number): string {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const startDate = new Date(year, month, 1 - startDay);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mainCellCount = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const totalCells = Math.max(mainCellCount, 35);
  const lastCell = new Date(startDate);
  lastCell.setDate(startDate.getDate() + totalCells - 1);
  return toISO(lastCell);
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
