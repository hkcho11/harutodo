"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import EventList from "@/components/calendar/EventList";
import { formatDateLabel } from "@/lib/utils/calendar";
import type { Event } from "@/types/event";
import type { PersonalCycle } from "@/types/cycle";

interface Props {
  open: boolean;
  date: string;
  events: Event[];
  onClose: () => void;
  onItemClick: (event: Event) => void;
  cycleEnabled?: boolean;
  myCycle?: PersonalCycle | null;
  onAddCycle?: () => void;
  onEditCycle?: (cycle: PersonalCycle) => void;
}

export default function EventDaySheet({
  open,
  date,
  events,
  onClose,
  onItemClick,
  cycleEnabled = false,
  myCycle,
  onAddCycle,
  onEditCycle,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ zIndex: 110 }}
      role="dialog"
      aria-modal="true"
      aria-label={formatDateLabel(date)}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-haru-surface shadow-card animate-haru-fade-up">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-haru-text">
            {formatDateLabel(date)}
          </h2>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-haru-muted active:bg-haru-primary-soft"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60dvh] overflow-y-auto px-5 pb-5">
          {/* 내 주기 상태 배너 */}
          {cycleEnabled && myCycle && (
            <button
              type="button"
              onClick={() => onEditCycle?.(myCycle)}
              className="mb-3 flex w-full items-center gap-2.5 rounded-2xl bg-haru-cycle-soft px-4 py-3 text-left active:bg-haru-cycle/20"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-haru-cycle" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-haru-text">내 주기 중</p>
                {myCycle.symptom_tags.length > 0 && (
                  <p className="mt-0.5 truncate text-xs text-haru-muted">
                    {myCycle.symptom_tags.join(" · ")}
                  </p>
                )}
              </div>
              <span className="text-xs text-haru-muted">수정</span>
            </button>
          )}

          {/* 일정 목록 */}
          <EventList events={events} onItemClick={onItemClick} />

          {/* 내 주기 기록 버튼 (기능 활성화 + 해당 날짜에 주기 없을 때) */}
          {cycleEnabled && !myCycle && onAddCycle && (
            <button
              type="button"
              onClick={onAddCycle}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-haru-cycle py-3 text-sm font-medium text-haru-muted active:bg-haru-cycle-soft"
            >
              <span className="h-2 w-2 rounded-full bg-haru-cycle" />
              내 주기 기록
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
