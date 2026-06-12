"use client";

import { cn } from "@/lib/utils/cn";

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSunday: boolean;
  hasMark?: boolean;
  onClick: () => void;
}

export default function DayCell({
  date,
  iso,
  inMonth,
  isToday,
  isSelected,
  isSunday,
  hasMark = false,
  onClick,
}: Props) {
  const dayNum = date.getDate();

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={iso}
      aria-pressed={isSelected}
      className={cn(
        "flex h-full w-full flex-col items-center pt-1.5 transition-colors active:bg-haru-primary-soft/60",
        !inMonth && "opacity-30"
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs leading-none",
          isToday && isSelected
            ? "bg-haru-primary/25 ring-2 ring-haru-primary-active"
            : isToday
            ? "ring-2 ring-haru-primary-active"
            : isSelected
            ? "bg-haru-primary/25"
            : isSunday
            ? "text-haru-danger"
            : "text-haru-text"
        )}
      >
        {dayNum}
      </span>
      {hasMark && (
        <span className="mt-1 h-1 w-1 rounded-full bg-haru-primary" />
      )}
    </button>
  );
}
