"use client";

import { MapPin } from "lucide-react";
import { useCoupleStore } from "@/store/useCoupleStore";
import { cn } from "@/lib/utils/cn";
import { formatEventTimeRange } from "@/lib/utils/event";
import type { Event } from "@/types/event";

interface Props {
  events: Event[];
  onItemClick: (event: Event) => void;
}

function participantLabel(
  event: Event,
  meId: string | null,
  partnerName: string | null
): string {
  if (event.assignee_id === null) return "함께";
  if (meId && event.assignee_id === meId) return "나";
  return partnerName ?? "파트너";
}

function colorBarClass(event: Event, meId: string | null): string {
  if (event.assignee_id === null) return "bg-haru-secondary";
  if (meId && event.assignee_id === meId) return "bg-haru-primary-active";
  return "bg-haru-accent";
}

export default function EventList({ events, onItemClick }: Props) {
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {events.map((e) => {
        const timeRange = formatEventTimeRange(e);
        const isAllDay = timeRange === "종일";

        return (
          <button
            key={e.id}
            type="button"
            onClick={() => onItemClick(e)}
            className="flex w-full items-stretch overflow-hidden rounded-2xl bg-haru-surface shadow-card animate-haru-fade-up text-left"
          >
            {/* 참여자 색상 바 */}
            <div className={cn("w-1 shrink-0", colorBarClass(e, me?.id ?? null))} />

            {/* 일정 내용 */}
            <div className="flex flex-1 flex-col justify-center gap-0.5 px-4 py-3">
              <div className="flex items-center gap-1.5">
                {isAllDay ? (
                  <span className="rounded-full bg-haru-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-haru-text">
                    종일
                  </span>
                ) : (
                  <span className="text-xs text-haru-muted">{timeRange}</span>
                )}
                <span className="text-[10px] text-haru-border">·</span>
                <span className="text-xs text-haru-muted">
                  {participantLabel(e, me?.id ?? null, partner?.display_name ?? null)}
                </span>
              </div>
              <p className="truncate text-sm font-semibold text-haru-text">
                {e.title}
              </p>
              {e.location_name && (
                <div className="flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 shrink-0 text-haru-muted" />
                  <span className="truncate text-xs text-haru-muted">{e.location_name}</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
