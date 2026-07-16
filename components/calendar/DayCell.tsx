"use client";

import { cn } from "@/lib/utils/cn";

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
  cycleType?: "recorded" | null;
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
        cycleType === "recorded" && inMonth && "bg-haru-cycle-soft",
        !disabled && "active:bg-haru-primary-soft/60",
        !inMonth && "opacity-30",
        disabled && inMonth && "opacity-30 cursor-default"
      )}
    >
      <div className="relative flex w-full justify-center">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs leading-none",
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
        </span>
        {overflowCount > 0 && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] leading-none text-haru-muted">
            +{overflowCount}
          </span>
        )}
      </div>
      {hasMark && (
        <span className="mt-1 h-1 w-1 rounded-full bg-haru-primary" />
      )}
    </button>
  );
}
