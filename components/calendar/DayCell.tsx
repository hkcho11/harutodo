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
  barLanes?: number; // 위에 오버레이된 멀티데이 bar 레인 수 → 해당 높이만큼 이벤트 행 아래로 이동
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
  barLanes = 0,
  onClick,
}: Props) {
  const dayNum = date.getDate();
  const visibleEvents = events.slice(0, MAX_VISIBLE);
  const overflowCount = Math.max(0, events.length - MAX_VISIBLE);

  // 멀티데이 bar 레인당 15px(bar 13px + gap 2px) 만큼 이벤트 행 아래로 이동
  const eventTopOffset = barLanes > 0 ? barLanes * 15 : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${iso}, 일정 ${events.length}개`}
      aria-pressed={isSelected}
      className={cn(
        "flex h-full w-full flex-col items-center overflow-hidden pt-1.5 transition-colors active:bg-haru-primary-soft/60",
        !inMonth && "opacity-30"
      )}
    >
      {/* 날짜 숫자 */}
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

      {/* 멀티데이 bar 영역 확보용 스페이서 */}
      {eventTopOffset > 0 && <div style={{ height: eventTopOffset }} className="shrink-0" />}

      {/* 단일 이벤트 행 */}
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

      {overflowCount > 0 && (
        <span className="mt-auto pb-0.5 text-[9px] text-haru-muted">
          +{overflowCount}
        </span>
      )}
    </button>
  );
}
