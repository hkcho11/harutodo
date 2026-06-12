"use client";

import { useMemo } from "react";
import { getMonthDays, type DayCell as DayCellData } from "@/lib/utils/calendar";
import { cn } from "@/lib/utils/cn";
import DayCell from "./DayCell";
import type { Event } from "@/types/event";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_LANES = 2;
const BAR_H = 13;
const BAR_GAP = 2;
const DATE_AREA_H = 30; // pt-1.5(6px) + h-6(24px)

interface BarLayout {
  event: Event;
  lane: number;
  startCol: number;
  endCol: number;
  isStart: boolean;
  isEnd: boolean;
}

function getBarColorClass(event: Event, meId: string | null): string {
  if (event.assignee_id === null) return "bg-haru-secondary/30 text-haru-secondary";
  if (meId && event.assignee_id === meId) return "bg-haru-primary-active/20 text-haru-primary-active";
  return "bg-haru-accent/20 text-haru-accent";
}

function computeWeekBars(
  weekCells: DayCellData[],
  multiDayEvents: Event[]
): {
  bars: BarLayout[];
  overflowByIso: Record<string, number>;
  maxLaneByCol: number[];
} {
  const weekStart = weekCells[0].iso;
  const weekEnd = weekCells[6].iso;

  const relevant = multiDayEvents.filter((e) => {
    const eEnd = e.end_date!;
    return e.date <= weekEnd && eEnd >= weekStart;
  });

  relevant.sort((a, b) => {
    // 더 긴 일정 먼저, 같으면 시작일 빠른 순
    const aLen = a.end_date! > a.date ? 1 : 0;
    const bLen = b.end_date! > b.date ? 1 : 0;
    if (aLen !== bLen) return bLen - aLen;
    return a.date < b.date ? -1 : 1;
  });

  const bars: BarLayout[] = [];
  const laneEnd: number[] = [];
  const overflowByIso: Record<string, number> = {};

  for (const event of relevant) {
    const eEnd = event.end_date!;
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

  // 각 열에서 활성 bar 레인 수 → DayCell 스페이서 계산용
  const maxLaneByCol = new Array<number>(7).fill(0);
  for (const bar of bars) {
    for (let col = bar.startCol; col <= bar.endCol; col++) {
      maxLaneByCol[col] = Math.max(maxLaneByCol[col], bar.lane + 1);
    }
  }

  return { bars, overflowByIso, maxLaneByCol };
}

interface Props {
  year: number;
  month: number;
  selectedDate: string;
  todayISO: string;
  eventsByDate?: Record<string, Event[]>;
  events?: Event[]; // 멀티데이 bar 계산용 전체 이벤트 목록
  meId: string | null;
  meName?: string | null;
  partnerName?: string | null;
  markedDates?: Set<string>;
  onSelectDate: (iso: string) => void;
}

export default function MonthCalendar({
  year,
  month,
  selectedDate,
  todayISO,
  eventsByDate,
  events,
  meId,
  meName,
  partnerName,
  markedDates,
  onSelectDate,
}: Props) {
  const cells = useMemo(() => getMonthDays(year, month), [year, month]);

  const weeks = useMemo(() => {
    const result: DayCellData[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cells]);

  // 2일 이상 일정만 추출
  const multiDayEvents = useMemo(
    () => (events ?? []).filter((e) => e.end_date && e.end_date > e.date),
    [events]
  );

  const weekBars = useMemo(() => {
    if (multiDayEvents.length === 0) {
      return weeks.map(() => ({
        bars: [] as BarLayout[],
        overflowByIso: {} as Record<string, number>,
        maxLaneByCol: new Array<number>(7).fill(0),
      }));
    }
    return weeks.map((weekCells) => computeWeekBars(weekCells, multiDayEvents));
  }, [weeks, multiDayEvents]);

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
          const { bars, overflowByIso, maxLaneByCol } = weekBars[weekIdx];
          return (
            <div
              key={weekIdx}
              className="relative border-b border-haru-border"
              style={{ height: 76 }}
            >
              {/* 날짜 셀 (단일 이벤트 포함) */}
              <div className="grid grid-cols-7 h-full">
                {weekCells.map((cell, colIdx) => {
                  // 단일 이벤트만 DayCell에 전달 (멀티데이는 bar 오버레이로 표시)
                  const singleDayEvents = (eventsByDate?.[cell.iso] ?? []).filter(
                    (e) => !e.end_date || e.end_date === e.date
                  );
                  return (
                    <DayCell
                      key={cell.iso}
                      date={cell.date}
                      iso={cell.iso}
                      inMonth={cell.inMonth}
                      isToday={cell.iso === todayISO}
                      isSelected={cell.iso === selectedDate}
                      isSunday={colIdx === 0}
                      hasMark={markedDates?.has(cell.iso) ?? false}
                      events={singleDayEvents}
                      meId={meId}
                      meName={meName ?? null}
                      partnerName={partnerName ?? null}
                      barLanes={maxLaneByCol[colIdx]}
                      onClick={() => onSelectDate(cell.iso)}
                    />
                  );
                })}
              </div>

              {/* 멀티데이 이벤트 bar 오버레이 */}
              {bars.length > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 grid grid-cols-7"
                  style={{
                    top: DATE_AREA_H,
                    gridTemplateRows: `repeat(${MAX_LANES}, ${BAR_H}px)`,
                    gap: `${BAR_GAP}px 0`,
                  }}
                >
                  {bars.map((bar) => (
                    <div
                      key={`${bar.event.id}-${bar.lane}`}
                      style={{
                        gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
                        gridRow: bar.lane + 1,
                      }}
                      className={cn(
                        "flex items-center overflow-hidden text-[9px] leading-none",
                        bar.isStart && bar.isEnd
                          ? "mx-0.5 rounded-full"
                          : bar.isStart
                          ? "ml-0.5 rounded-l-full"
                          : bar.isEnd
                          ? "mr-0.5 rounded-r-full"
                          : "",
                        getBarColorClass(bar.event, meId)
                      )}
                    >
                      {bar.isStart && (
                        <span className="truncate px-1.5">{bar.event.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 오버플로우 카운트 */}
              {Object.keys(overflowByIso).length > 0 && (
                <div
                  className="pointer-events-none absolute inset-x-0 grid grid-cols-7"
                  style={{ bottom: 3 }}
                >
                  {weekCells.map((cell) =>
                    overflowByIso[cell.iso] ? (
                      <span
                        key={cell.iso}
                        className="text-center text-[8px] text-haru-muted"
                      >
                        +{overflowByIso[cell.iso]}
                      </span>
                    ) : (
                      <span key={cell.iso} />
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
