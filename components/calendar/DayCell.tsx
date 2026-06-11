"use client";

import { cn } from "@/lib/utils/cn";
import type { Event } from "@/types/event";

const MAX_VISIBLE = 2;

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSunday: boolean;
  hasMark?: boolean;
  events?: Event[];
  meId?: string | null;
  meName?: string | null;
  partnerName?: string | null;
  onClick: () => void;
}

function ParticipantDot({
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
      <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-haru-secondary/30 text-[7px] leading-none text-haru-secondary">
        ♥
      </span>
    );
  }
  if (meId && event.assignee_id === meId) {
    return (
      <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-haru-primary-active/20 text-[7px] leading-none text-haru-primary-active">
        {meName ? meName[0] : "나"}
      </span>
    );
  }
  return (
    <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-haru-accent/20 text-[7px] leading-none text-haru-accent">
      {partnerName ? partnerName[0] : "파"}
    </span>
  );
}

export default function DayCell({
  date,
  iso,
  inMonth,
  isToday,
  isSelected,
  isSunday,
  hasMark = false,
  events = [],
  meId = null,
  meName = null,
  partnerName = null,
  onClick,
}: Props) {
  const dayNum = date.getDate();
  const visibleEvents = events.slice(0, MAX_VISIBLE);
  const overflowCount = Math.max(0, events.length - MAX_VISIBLE);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${iso}, 일정 ${events.length}개`}
      aria-pressed={isSelected}
      className={cn(
        "flex h-[76px] w-full flex-col items-center overflow-hidden pt-1.5 transition-colors active:bg-haru-primary-soft/60",
        !inMonth && "opacity-30"
      )}
    >
      {/* 날짜 숫자 — 오늘=테두리링, 선택=배경채움, 둘 다=링+채움 */}
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

      {/* 투두 점 (CalendarPickerSheet 전용) */}
      {hasMark && (
        <span className="mt-1 h-1 w-1 rounded-full bg-haru-primary" />
      )}

      {/* 이벤트 행 — 최대 2개 */}
      {visibleEvents.map((event) => (
        <div
          key={event.id}
          className="mt-0.5 flex w-full items-center gap-0.5 px-0.5"
        >
          <ParticipantDot
            event={event}
            meId={meId}
            meName={meName}
            partnerName={partnerName}
          />
          <span className="min-w-0 truncate text-[9px] leading-none text-haru-text">
            {event.title}
          </span>
        </div>
      ))}

      {/* 오버플로우 */}
      {overflowCount > 0 && (
        <span className="mt-auto pb-0.5 text-[9px] text-haru-muted">
          +{overflowCount}
        </span>
      )}
    </button>
  );
}
