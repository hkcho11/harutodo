"use client";

import { cn } from "@/lib/utils/cn";
import { getKoreanHolidayLabelLines } from "@/lib/utils/koreanHolidayLabel";
import type { KoreanHoliday } from "@/types/domain/holiday";

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSunday: boolean;
  isSaturday?: boolean;
  holiday?: KoreanHoliday | null;
  hasMark?: boolean;
  overflowCount?: number;
  disabled?: boolean;
  onClick: () => void;
}

export default function DayCell({
  date,
  iso,
  inMonth,
  isToday,
  isSelected,
  isSunday,
  isSaturday = false,
  holiday = null,
  hasMark = false,
  overflowCount = 0,
  disabled = false,
  onClick,
}: Props) {
  const dayNum = date.getDate();

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={holiday ? `${iso}, ${holiday.name}` : iso}
      title={holiday?.name}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      className={cn(
        "flex h-full w-full flex-col items-center transition-colors",
        !disabled && "active:bg-haru-primary-soft/60",
        !inMonth && "opacity-30",
        disabled && inMonth && "opacity-30 cursor-default"
      )}
    >
      <div className="relative grid h-7 w-full min-w-0 grid-cols-[minmax(0,1fr)_1.25rem_minmax(0,1fr)] items-center px-0.5">
        <span className="flex min-w-0 items-center justify-center">
          {holiday && (
            <span className="flex w-max shrink-0 flex-col items-center justify-center text-center text-[8px] font-semibold leading-[9px] text-haru-danger">
              {getKoreanHolidayLabelLines(holiday.name).map((line) => (
                <span key={line} className="whitespace-nowrap">
                  {line}
                </span>
              ))}
            </span>
          )}
        </span>
        <span
          className={cn(
            "relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-xs leading-none",
            isToday && isSelected
              ? "bg-haru-primary/25 ring-2 ring-haru-primary-active"
              : isToday
              ? "ring-2 ring-haru-primary-active"
              : isSelected
              ? "bg-haru-primary/25"
              : "",
            holiday || isSunday
              ? "text-haru-danger"
              : isSaturday
                ? "text-haru-saturday"
                : "text-haru-text"
          )}
        >
          {dayNum}
        </span>
        {overflowCount > 0 && (
          <span className="ml-1 justify-self-start text-[9px] leading-none text-haru-muted">
            +{overflowCount}
          </span>
        )}
        {hasMark && (
          <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-haru-primary" />
        )}
      </div>
    </button>
  );
}
