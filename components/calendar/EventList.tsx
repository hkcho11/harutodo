"use client";

import { useCoupleStore } from "@/store/useCoupleStore";
import { cn } from "@/lib/utils/cn";
import { eventColorClass, formatEventTimeRange } from "@/lib/utils/event";
import type { Event } from "@/types/event";

interface Props {
  events: Event[];
  onItemClick: (event: Event) => void;
}

const PARTICIPANT_LABEL = (
  event: Event,
  meId: string | null,
  partnerName: string | null
): string => {
  if (event.assignee_id === null) return "함께";
  if (meId && event.assignee_id === meId) return "나";
  return partnerName ?? "파트너";
};

// 선택일의 일정 리스트. 항목 탭 → 편집 시트 오픈.
export default function EventList({ events, onItemClick }: Props) {
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {events.map((e) => (
        <button
          key={e.id}
          type="button"
          onClick={() => onItemClick(e)}
          className="flex items-center gap-3 rounded-2xl bg-haru-surface px-4 py-3 text-left shadow-card min-h-[60px] animate-haru-fade-up"
        >
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
              eventColorClass(e, me?.id ?? null)
            )}
          >
            {formatEventTimeRange(e)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="truncate text-base text-haru-text">{e.title}</p>
            <p className="text-xs text-haru-muted">
              {PARTICIPANT_LABEL(e, me?.id ?? null, partner?.display_name ?? null)}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
