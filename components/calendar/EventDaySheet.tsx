"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import EventList from "@/components/calendar/EventList";
import { formatDateLabel } from "@/lib/utils/calendar";
import { cn } from "@/lib/utils/cn";
import type { Event } from "@/types/event";
import type { CyclePrediction, PersonalCycle } from "@/types/cycle";

export interface CyclePredictionItem {
  prediction: CyclePrediction;
  label: string;
}

interface Props {
  open: boolean;
  date: string;
  events: Event[];
  onClose: () => void;
  onItemClick: (event: Event) => void;
  cycleEnabled?: boolean;
  myCycle?: PersonalCycle | null;
  cyclePredictionItems?: CyclePredictionItem[];
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
  cyclePredictionItems = [],
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
                <p className="text-xs font-semibold text-haru-text">생리 기록</p>
                <p className="mt-0.5 text-xs text-haru-muted">시작일과 종료일을 수정할 수 있어요</p>
              </div>
              <span className="text-xs text-haru-muted">수정</span>
            </button>
          )}

          {cycleEnabled && !myCycle && cyclePredictionItems.map(({ prediction, label }) => {
            const isExpected = prediction.expectedStartDate === date;
            const isOvulation = prediction.ovulationDate === date;
            if (!isExpected && !isOvulation) return null;
            return (
              <div
                key={`${prediction.userId}-${isExpected ? "expected" : "ovulation"}`}
                className={cn(
                  "mb-3 rounded-2xl px-4 py-3",
                  isExpected ? "bg-haru-cycle-soft" : "bg-haru-accent-soft"
                )}
              >
                <p className="text-xs font-semibold text-haru-text">
                  {label} {isExpected ? "다음 생리 예정일" : "배란예상일"}
                </p>
                <p className="mt-0.5 text-xs text-haru-muted">
                  {prediction.isFallback
                    ? "기록이 부족해 28일 표준 참고값으로 예상했어요."
                    : `최근 기록 ${prediction.sampleCount}개 간격을 기준으로 약 ${prediction.cycleLengthDays}일 주기로 예상했어요.`}
                </p>
              </div>
            );
          })}

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
              생리 기록
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
