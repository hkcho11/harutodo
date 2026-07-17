"use client";

import { cn } from "@/lib/utils/cn";
import type { CycleDayType } from "@/types/cycle";

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSunday: boolean;
  isSaturday?: boolean;
  isHoliday?: boolean;
  hasMark?: boolean;
  overflowCount?: number;
  disabled?: boolean;
  cycleType?: CycleDayType | null;
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
  isHoliday = false,
  hasMark = false,
  overflowCount = 0,
  disabled = false,
  cycleType,
  onClick,
}: Props) {
  const dayNum = date.getDate();

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={iso}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      className={cn(
        "flex h-full w-full flex-col items-center pt-1.5 transition-colors",
        !disabled && "active:bg-haru-primary-soft/60",
        !inMonth && "opacity-30",
        disabled && inMonth && "opacity-30 cursor-default"
      )}
    >
      <div className="relative flex w-full justify-center">
        <span
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-full text-xs leading-none",
            cycleType === "expected" && inMonth && "border border-dashed border-haru-cycle/70",
            isToday && isSelected
              ? "bg-haru-primary/25 ring-2 ring-haru-primary-active"
              : isToday
              ? "ring-2 ring-haru-primary-active"
              : isSelected
              ? "bg-haru-primary/25"
              : isHoliday || isSunday
              ? "text-haru-danger"
              : isSaturday
              ? "text-haru-saturday"
              : "text-haru-text"
          )}
        >
          {dayNum}
          {cycleType === "recorded" && inMonth && (
            <span className="absolute bottom-0 h-0.5 w-3 rounded-full bg-haru-cycle/70" />
          )}
          {cycleType === "ovulation" && inMonth && (
            <span className="absolute -right-1 top-1 h-1 w-1 rounded-full bg-haru-accent" />
          )}
        </span>
        {overflowCount > 0 && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] leading-none text-haru-muted">
            +{overflowCount}
          </span>
        )}
      </div>
      {hasMark && <span className="mt-1 h-1 w-1 rounded-full bg-haru-primary" />}
    </button>
  );
}
