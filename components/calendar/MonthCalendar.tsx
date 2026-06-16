"use client";

import { useMemo } from "react";
import { getMonthDays, type DayCell as DayCellData } from "@/lib/utils/calendar";
import { cn } from "@/lib/utils/cn";
import { getAvatarColor, AVATAR_COLOR_CLASSES, type AvatarColor } from "@/lib/utils/avatarColor";
import DayCell from "./DayCell";
import type { Event } from "@/types/event";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_LANES = 4;
const BAR_H = 18;
const BAR_GAP = 2;
const DATE_AREA_H = 28;
const ROW_H = 112;

interface BarLayout {
  event: Event;
  lane: number;
  startCol: number;
  endCol: number;
  isStart: boolean;
  isEnd: boolean;
}


function getBarBgClass(
  event: Event,
  meId: string | null,
  meColor: AvatarColor,
  partnerColor: AvatarColor
): string {
  if (event.assignee_id === null) return "bg-haru-secondary/30";
  if (meId && event.assignee_id === meId) return AVATAR_COLOR_CLASSES[meColor].barBgSoft;
  return AVATAR_COLOR_CLASSES[partnerColor].barBgSoft;
}

function computeWeekBars(
  weekCells: DayCellData[],
  events: Event[]
): { bars: BarLayout[]; overflowByIso: Record<string, number> } {
  const weekStart = weekCells[0].iso;
  const weekEnd = weekCells[6].iso;

  const relevant = events.filter((e) => {
    const eEnd = e.end_date ?? e.date;
    return e.date <= weekEnd && eEnd >= weekStart;
  });

  // 주 내 실제 시작 열 기준 정렬 (이전 주에서 이어지는 일정은 모두 sc=0으로 동일)
  // 같은 시작 열이면 긴 일정 우선 (더 긴 bar가 위 lane 차지)
  relevant.sort((a, b) => {
    const aSc = a.date < weekStart ? weekStart : a.date;
    const bSc = b.date < weekStart ? weekStart : b.date;
    if (aSc !== bSc) return aSc < bSc ? -1 : 1;
    const aEnd = (a.end_date ?? a.date) > weekEnd ? weekEnd : (a.end_date ?? a.date);
    const bEnd = (b.end_date ?? b.date) > weekEnd ? weekEnd : (b.end_date ?? b.date);
    return aEnd > bEnd ? -1 : aEnd < bEnd ? 1 : 0;
  });

  const bars: BarLayout[] = [];
  const laneEnd: number[] = [];
  const overflowByIso: Record<string, number> = {};

  for (const event of relevant) {
    const eEnd = event.end_date ?? event.date;
    const rawSc = event.date < weekStart ? 0 : weekCells.findIndex((c) => c.iso === event.date);
    const rawEc = eEnd > weekEnd ? 6 : weekCells.findIndex((c) => c.iso === eEnd);
    const sc = rawSc < 0 ? 0 : rawSc;
    const ec = rawEc < 0 ? 6 : rawEc;

    let lane = laneEnd.findIndex((end) => end < sc);
    if (lane === -1) lane = laneEnd.length;
    laneEnd[lane] = ec;

    if (lane < MAX_LANES) {
      bars.push({
        event,
        lane,
        startCol: sc,
        endCol: ec,
        isStart: event.date >= weekStart,
        isEnd: eEnd <= weekEnd,
      });
    } else {
      for (let col = sc; col <= ec; col++) {
        const iso = weekCells[col]?.iso;
        if (iso) overflowByIso[iso] = (overflowByIso[iso] ?? 0) + 1;
      }
    }
  }

  return { bars, overflowByIso };
}

interface Props {
  year: number;
  month: number;
  selectedDate: string;
  todayISO: string;
  events?: Event[];
  meId: string | null;
  meColor?: string | null;
  partnerColor?: string | null;
  markedDates?: Set<string>;
  onSelectDate: (iso: string) => void;
}

export default function MonthCalendar({
  year,
  month,
  selectedDate,
  todayISO,
  events,
  meId,
  meColor,
  partnerColor,
  markedDates,
  onSelectDate,
}: Props) {
  const resolvedMeColor = getAvatarColor(meColor);
  const resolvedPartnerColor = getAvatarColor(partnerColor);

  // 현재 월의 첫날·마지막날 (bar별 투명도 판단에 사용)
  const monthFirst = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthLast = (() => {
    const d = new Date(year, month + 1, 0).getDate();
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  })();

  const cells = useMemo(() => getMonthDays(year, month), [year, month]);

  const weeks = useMemo(() => {
    const result: DayCellData[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cells]);

  const weekBars = useMemo(() => {
    if (!events || events.length === 0) {
      return weeks.map(() => ({ bars: [] as BarLayout[], overflowByIso: {} as Record<string, number> }));
    }
    return weeks.map((weekCells) => computeWeekBars(weekCells, events));
  }, [weeks, events]);

  return (
    <div>
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-haru-border py-1.5">
        {WEEKDAYS.map((d, i) => (
          <span
            key={d}
            className={cn(
              "text-center text-xs font-medium",
              i === 0 ? "text-haru-danger" : "text-haru-muted"
            )}
          >
            {d}
          </span>
        ))}
      </div>

      {/* 주 행 */}
      <div className="flex flex-col">
        {weeks.map((weekCells, weekIdx) => {
          const { bars, overflowByIso } = weekBars[weekIdx];
          const isPreviewWeek = weekCells[0].isPreview === true;
          return (
            <div
              key={weekIdx}
              className="relative border-b border-haru-border"
              style={{ height: ROW_H }}
            >
              {/* 날짜 숫자 셀 */}
              <div className="grid grid-cols-7 h-full">
                {weekCells.map((cell, colIdx) => (
                  <DayCell
                    key={cell.iso}
                    date={cell.date}
                    iso={cell.iso}
                    inMonth={cell.inMonth}
                    isToday={cell.iso === todayISO}
                    isSelected={cell.iso === selectedDate}
                    isSunday={colIdx === 0}
                    hasMark={markedDates?.has(cell.iso) ?? false}
                    overflowCount={overflowByIso[cell.iso] ?? 0}
                    onClick={() => onSelectDate(cell.iso)}
                  />
                ))}
              </div>

              {/* 이벤트 bar 오버레이 */}
              {bars.length > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 grid grid-cols-7"
                  style={{
                    top: DATE_AREA_H,
                    gridTemplateRows: `repeat(${MAX_LANES}, ${BAR_H}px)`,
                    gap: `${BAR_GAP}px 0`,
                  }}
                >
                  {bars.map((bar) => {
                    const eEnd = bar.event.end_date ?? bar.event.date;
                    const inCurrentMonth =
                      !isPreviewWeek &&
                      bar.event.date <= monthLast &&
                      eEnd >= monthFirst;
                    return (
                      <div
                        key={`${bar.event.id}-${bar.lane}`}
                        style={{
                          gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
                          gridRow: bar.lane + 1,
                        }}
                        className={cn(
                          "flex items-center overflow-hidden text-[11px] font-medium leading-none",
                          bar.isStart && bar.isEnd
                            ? "mx-0.5 rounded-md pl-2"
                            : bar.isStart
                            ? "ml-0.5 rounded-l-md pl-2"
                            : bar.isEnd
                            ? "rounded-r-md"
                            : "",
                          inCurrentMonth ? "" : "opacity-40",
                          getBarBgClass(bar.event, meId, resolvedMeColor, resolvedPartnerColor)
                        )}
                      >
                        {bar.isStart && (
                          <span className="whitespace-nowrap text-haru-text">{bar.event.title}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}
