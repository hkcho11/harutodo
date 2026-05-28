"use client";

import { useMemo } from "react";
import { getMonthDays } from "@/lib/utils/calendar";
import { cn } from "@/lib/utils/cn";
import DayCell from "./DayCell";
import type { Event } from "@/types/event";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface Props {
  year: number;
  month: number; // 0-based
  selectedDate: string;
  todayISO: string;
  eventsByDate: Record<string, Event[]>;
  meId: string | null;
  onSelectDate: (iso: string) => void;
}

export default function MonthCalendar({
  year,
  month,
  selectedDate,
  todayISO,
  eventsByDate,
  meId,
  onSelectDate,
}: Props) {
  const cells = useMemo(() => getMonthDays(year, month), [year, month]);

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <span
            key={d}
            className={cn(
              "py-1 text-center text-xs font-medium",
              i === 0 ? "text-haru-danger" : "text-haru-muted"
            )}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, idx) => (
          <DayCell
            key={c.iso}
            date={c.date}
            iso={c.iso}
            inMonth={c.inMonth}
            isToday={c.iso === todayISO}
            isSelected={c.iso === selectedDate}
            isSunday={idx % 7 === 0}
            events={eventsByDate[c.iso] ?? []}
            meId={meId}
            onClick={() => onSelectDate(c.iso)}
          />
        ))}
      </div>
    </div>
  );
}
