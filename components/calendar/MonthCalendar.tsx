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
const DATE_AREA_H = 30;

interface BarLayout {
  event: Event;
  lane: number;
  startCol: number;
  endCol: number;
  isStart: boolean;
  isEnd: boolean;
}

function ParticipantAvatar({
  event,
  meId,
  meName,
  partnerName,
}: {
  event: Event;
  meId: string | null;
  meName: string | null;
  partnerName: string | null;
}) {
  if (event.assignee_id === null) {
    return (
      <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-haru-secondary/50 text-[7px] leading-none text-haru-secondary">
        ♥
      </span>
    );
  }
  if (meId && event.assignee_id === meId) {
    return (
      <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-haru-primary-active/40 text-[7px] leading-none text-haru-primary-active">
        {meName?.[0] ?? "나"}
      </span>
    );
  }
  return (
    <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-haru-accent/40 text-[7px] leading-none text-haru-accent">
      {partnerName?.[0] ?? "파"}
    </span>
  );
}

function getBarBgClass(event: Event, meId: string | null): string {
  if (event.assignee_id === null) return "bg-haru-secondary/20";
  if (meId && event.assignee_id === meId) return "bg-haru-primary-active/15";
  return "bg-haru-accent/15";
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

  // 다일 이벤트 우선, 같으면 시작일 빠른 순
  relevant.sort((a, b) => {
    const aMulti = a.end_date && a.end_date > a.date ? 1 : 0;
    const bMulti = b.end_date && b.end_date > b.date ? 1 : 0;
    if (aMulti !== bMulti) return bMulti - aMulti;
    return a.date < b.date ? -1 : 1;
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
          return (
            <div
              key={weekIdx}
              className="relative border-b border-haru-border"
              style={{ height: 76 }}
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
                  {bars.map((bar) => (
                    <div
                      key={`${bar.event.id}-${bar.lane}`}
                      style={{
                        gridColumn: `${bar.startCol + 1} / ${bar.endCol + 2}`,
                        gridRow: bar.lane + 1,
                      }}
                      className={cn(
                        "flex items-center gap-0.5 overflow-hidden pl-0.5 text-[9px] leading-none",
                        bar.isStart && bar.isEnd
                          ? "mx-0.5 rounded-full pr-1"
                          : bar.isStart
                          ? "ml-0.5 rounded-l-full"
                          : bar.isEnd
                          ? "rounded-r-full pr-1"
                          : "",
                        getBarBgClass(bar.event, meId)
                      )}
                    >
                      {bar.isStart && (
                        <ParticipantAvatar
                          event={bar.event}
                          meId={meId}
                          meName={meName ?? null}
                          partnerName={partnerName ?? null}
                        />
                      )}
                      {bar.isStart && (
                        <span className="truncate text-haru-text">{bar.event.title}</span>
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
