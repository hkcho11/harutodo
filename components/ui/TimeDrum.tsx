"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

const ITEM_H = 52;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2); // 위아래 패딩 아이템 수

interface Props {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}

// CSS scroll-snap 기반 드럼 피커 컬럼.
// - 스크롤이 멈추면 가장 가까운 아이템으로 스냅.
// - value가 바뀌면 해당 위치로 부드럽게 이동.
export default function TimeDrum({ items, value, onChange, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // value → 스크롤 동기화
  useEffect(() => {
    const idx = items.indexOf(value);
    if (idx < 0 || !ref.current) return;
    isSyncingRef.current = true;
    ref.current.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
    const t = setTimeout(() => {
      isSyncingRef.current = false;
    }, 400);
    return () => clearTimeout(t);
  }, [value, items]);

  const handleScroll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!ref.current || isSyncingRef.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_H);
      const clamped = Math.max(0, Math.min(idx, items.length - 1));
      if (items[clamped] !== value) onChange(items[clamped]);
    }, 120);
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-xs font-medium text-haru-muted">{label}</span>
      )}
      <div className="relative">
        {/* 선택 영역 하이라이트 */}
        <div
          className="pointer-events-none absolute inset-x-0 rounded-xl bg-haru-primary-soft"
          style={{
            top: PAD * ITEM_H,
            height: ITEM_H,
          }}
        />
        {/* 위 그라데이션 */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-10 rounded-t-2xl"
          style={{
            height: PAD * ITEM_H,
            background:
              "linear-gradient(to bottom, var(--color-haru-surface) 0%, transparent 100%)",
          }}
        />
        {/* 아래 그라데이션 */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 rounded-b-2xl"
          style={{
            height: PAD * ITEM_H,
            background:
              "linear-gradient(to top, var(--color-haru-surface) 0%, transparent 100%)",
          }}
        />
        <div
          ref={ref}
          onScroll={handleScroll}
          className="relative z-[1] w-20 overflow-y-scroll"
          style={{
            height: VISIBLE * ITEM_H,
            scrollSnapType: "y mandatory",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {/* 위 패딩 */}
          {Array.from({ length: PAD }).map((_, i) => (
            <div key={`top-${i}`} style={{ height: ITEM_H }} />
          ))}
          {items.map((item) => (
            <div
              key={item}
              onClick={() => onChange(item)}
              style={{ height: ITEM_H, scrollSnapAlign: "center" }}
              className={cn(
                "flex cursor-pointer items-center justify-center text-xl transition-colors",
                item === value
                  ? "font-bold text-haru-success"
                  : "font-medium text-haru-muted/40"
              )}
            >
              {item}
            </div>
          ))}
          {/* 아래 패딩 */}
          {Array.from({ length: PAD }).map((_, i) => (
            <div key={`bot-${i}`} style={{ height: ITEM_H }} />
          ))}
        </div>
      </div>
    </div>
  );
}
