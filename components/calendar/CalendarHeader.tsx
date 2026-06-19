"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  year: number;
  month: number; // 0-based
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function CalendarHeader({
  year,
  month,
  onPrev,
  onNext,
  onToday,
}: Props) {
  return (
    <div className="mb-4 flex items-center gap-1">
      <button
        type="button"
        onClick={onPrev}
        aria-label="이전 달"
        className="flex h-11 w-11 items-center justify-center rounded-full text-haru-muted active:bg-haru-primary-soft"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="flex-1 text-center text-lg font-bold text-haru-text">
        {year}년 {month + 1}월
      </h2>
      <button
        type="button"
        onClick={onNext}
        aria-label="다음 달"
        className="flex h-11 w-11 items-center justify-center rounded-full text-haru-muted active:bg-haru-primary-soft"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onToday}
        aria-label="오늘로 이동"
        className="ml-1 min-h-[44px] rounded-xl bg-haru-primary-soft px-3 text-sm font-semibold text-haru-text transition-colors active:bg-haru-primary"
      >
        오늘
      </button>
    </div>
  );
}
