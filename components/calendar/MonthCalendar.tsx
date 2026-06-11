"use client";

import { useMemo } from "react";
import { getMonthDays, type DayCell as DayCellData } from "@/lib/utils/calendar";
import { cn } from "@/lib/utils/cn";
import DayCell from "./DayCell";
import type { Event } from "@/types/event";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface Props {
  year: number;
  month: number;
  selectedDate: string;
  todayISO: string;
  eventsByDate: Record<string, Event[]>;
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
  meId,
  meName,
  partnerName,
  markedDates,
  onSelectDate,
}: Props) {
  const cells = useMemo(() => getMonthDays(year, month), [year, month]);

  const weeks = useMemo(() => {
    const result: DayCellData[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  }, [cells]);

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
        {weeks.map((weekCells, weekIdx) => (
          <div
            key={weekIdx}
            className="grid grid-cols-7 border-b border-haru-border"
          >
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
                events={eventsByDate[cell.iso] ?? []}
                meId={meId}
                meName={meName ?? null}
                partnerName={partnerName ?? null}
                onClick={() => onSelectDate(cell.iso)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
