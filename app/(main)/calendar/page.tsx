"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useMonthEvents } from "@/hooks/useMonthEvents";
import { useCoupleStore } from "@/store/useCoupleStore";
import { useToastStore } from "@/store/useToastStore";
import { todayISO } from "@/lib/utils/date";
import { formatDateLabel } from "@/lib/utils/calendar";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import EventList from "@/components/calendar/EventList";
import EventSheet from "@/components/calendar/EventSheet";
import type { Event, EventFormValues } from "@/types/event";

export default function CalendarPage() {
  const today = new Date();
  const todayStr = todayISO();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { eventsByDate, loading, add, update, remove } = useMonthEvents(
    viewYear,
    viewMonth
  );
  const me = useCoupleStore((s) => s.me);
  const showToast = useToastStore((s) => s.show);

  const handleSubmit = async (values: EventFormValues) => {
    try {
      if (editingEvent) {
        await update(editingEvent.id, values);
      } else {
        await add(values);
      }
    } catch {
      showToast("저장에 실패했어요. 잠시 후 다시 시도해주세요");
      throw new Error("submit_failed");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await remove(id);
    } catch {
      showToast("삭제에 실패했어요. 잠시 후 다시 시도해주세요");
      throw new Error("delete_failed");
    }
  };

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const handleNext = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const handleToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  const openAdd = () => {
    setEditingEvent(null);
    setSheetOpen(true);
  };
  const openEdit = (e: Event) => {
    setEditingEvent(e);
    setSheetOpen(true);
  };
  const closeSheet = () => {
    setSheetOpen(false);
    setEditingEvent(null);
  };

  const selectedEvents = eventsByDate[selectedDate] ?? [];

  return (
    <div className="px-4 py-6">
      <CalendarHeader
        year={viewYear}
        month={viewMonth}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      <MonthCalendar
        year={viewYear}
        month={viewMonth}
        selectedDate={selectedDate}
        todayISO={todayStr}
        eventsByDate={eventsByDate}
        meId={me?.id ?? null}
        onSelectDate={setSelectedDate}
      />

      <section className="mt-6">
        <header className="mb-3 flex items-baseline gap-2 px-1">
          <h2 className="text-base font-bold text-haru-text">
            {formatDateLabel(selectedDate)}
          </h2>
          {selectedEvents.length > 0 && (
            <span className="text-xs text-haru-muted">
              {selectedEvents.length}개
            </span>
          )}
        </header>

        {loading ? (
          <p className="py-8 text-center text-sm text-haru-muted">
            불러오는 중...
          </p>
        ) : selectedEvents.length === 0 ? (
          <div className="rounded-2xl bg-haru-surface p-6 text-center shadow-card">
            <p className="text-sm text-haru-text">이 날짜에 일정이 없어요</p>
            <p className="mt-1 text-xs text-haru-muted">
              우하단 + 버튼으로 추가해보세요
            </p>
          </div>
        ) : (
          <EventList events={selectedEvents} onItemClick={openEdit} />
        )}
      </section>

      <button
        type="button"
        onClick={openAdd}
        aria-label="일정 추가"
        className="fixed right-5 bottom-[calc(56px+1.25rem+env(safe-area-inset-bottom,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-haru-primary text-white shadow-card active:bg-haru-primary-active"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <EventSheet
        open={sheetOpen}
        event={editingEvent}
        defaultDate={selectedDate}
        onClose={closeSheet}
        onSubmit={handleSubmit}
        onDelete={editingEvent ? handleRemove : undefined}
      />
    </div>
  );
}
