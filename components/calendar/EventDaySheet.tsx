"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import EventList from "@/components/calendar/EventList";
import { formatDateLabel } from "@/lib/utils/calendar";
import type { Event } from "@/types/event";

interface Props {
  open: boolean;
  date: string;
  events: Event[];
  onClose: () => void;
  onItemClick: (event: Event) => void;
}

export default function EventDaySheet({
  open,
  date,
  events,
  onClose,
  onItemClick,
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
          <EventList events={events} onItemClick={onItemClick} />
        </div>
      </div>
    </div>,
    document.body
  );
}
