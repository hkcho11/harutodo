"use client";

import { cn } from "@/lib/utils/cn";
import { eventColorClassSoft } from "@/lib/utils/event";
import type { Event } from "@/types/event";

const MAX_LABELS = 2;

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSunday: boolean;
  events: Event[];
  meId: string | null;
  hasMark?: boolean;
  onClick: () => void;
}

// 캘린더 한 칸. 날짜 + 참여자별 색상 라벨(시간 + 제목 truncate).
// 선택일은 ring으로 강조 — fill로 강조하면 내부 라벨 색상이 묻혀서.
export default function DayCell({
  date,
  iso,
  inMonth,
  isToday,
  isSelected,
  isSunday,
  events,
  meId,
  hasMark = false,
  onClick,
}: Props) {
  const dayNum = date.getDate();
  const visible = events.slice(0, MAX_LABELS);
  const overflow = Math.max(0, events.length - MAX_LABELS);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${iso}, 일정 ${events.length}개`}
      aria-pressed={isSelected}
      className={cn(
        "flex min-h-[68px] flex-col gap-0.5 rounded-lg p-1 text-left transition-colors",
        !inMonth && "opacity-30",
        isSelected
          ? "ring-2 ring-haru-primary bg-haru-surface"
          : isToday
          ? "bg-haru-primary-soft"
          : "bg-transparent active:bg-haru-primary-soft"
      )}
    >
      <span
        className={cn(
          "block text-center text-xs leading-tight",
          isToday || isSelected
            ? "font-bold text-haru-text"
            : isSunday
            ? "text-haru-danger"
            : "text-haru-text"
        )}
      >
        {dayNum}
      </span>
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        {hasMark && visible.length === 0 && (
          <div className="flex justify-center pt-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-haru-primary" />
          </div>
        )}
        {visible.map((e) => (
          <span
            key={e.id}
            className={cn(
              "block truncate rounded-sm px-1 text-[10px] leading-tight",
              eventColorClassSoft(e, meId)
            )}
          >
            {e.title}
          </span>
        ))}
        {overflow > 0 && (
          <span className="block px-1 text-[9px] leading-tight text-haru-muted">
            +{overflow}
          </span>
        )}
      </div>
    </button>
  );
}
