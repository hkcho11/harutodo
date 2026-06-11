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
import EventDaySheet from "@/components/calendar/EventDaySheet";
import EventList from "@/components/calendar/EventList";
import EventSheet from "@/components/calendar/EventSheet";
import type { Event, EventFormValues } from "@/types/event";

export default function CalendarPage() {
  const today = new Date();
  const todayStr = todayISO();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { eventsByDate, loading, add, update, remove } = useMonthEvents(
    viewYear,
    viewMonth
  );
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);
  const showToast = useToastStore((s) => s.show);

  const isCurrentMonth =
    viewYear === today.getFullYear() && viewMonth === today.getMonth();

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

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const dayEvents = eventsByDate[date] ?? [];
    if (dayEvents.length > 0) {
      setDaySheetOpen(true);
    }
  };

  const openAdd = () => {
    setDaySheetOpen(false);
    setEditingEvent(null);
    setSheetOpen(true);
  };
  const openEdit = (e: Event) => {
    setDaySheetOpen(false);
    setEditingEvent(e);
    setSheetOpen(true);
  };
  const closeSheet = () => {
    setSheetOpen(false);
    setEditingEvent(null);
  };

  const selectedEvents = eventsByDate[selectedDate] ?? [];

  return (
    <div className="px-4 py-6 pb-28">
      <CalendarHeader
        year={viewYear}
        month={viewMonth}
        isCurrentMonth={isCurrentMonth}
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
        meName={me?.display_name ?? null}
        partnerName={partner?.display_name ?? null}
        onSelectDate={handleSelectDate}
      />

      {/* 선택 날짜 섹션 */}
      <section className="mt-5">
        <div className="mb-3 flex items-center gap-2.5 px-0.5">
          <span className="rounded-xl bg-haru-primary-soft px-3 py-1.5 text-sm font-bold text-haru-text">
            {formatDateLabel(selectedDate)}
          </span>
          {selectedEvents.length > 0 && (
            <span className="text-xs text-haru-muted">
              {selectedEvents.length}개
            </span>
          )}
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-haru-muted">
            불러오는 중...
          </p>
        ) : selectedEvents.length === 0 ? (
          <div className="rounded-2xl bg-haru-surface p-6 text-center shadow-card">
            <p className="mb-1 text-2xl">📅</p>
            <p className="text-sm font-semibold text-haru-text">
              이 날짜에 일정이 없어요
            </p>
            <button
              type="button"
              onClick={openAdd}
              className="mt-3 rounded-xl bg-haru-primary px-4 py-2 text-sm font-semibold text-haru-text active:bg-haru-primary-active"
            >
              일정 추가하기
            </button>
          </div>
        ) : (
          <EventList events={selectedEvents} onItemClick={openEdit} />
        )}
      </section>

      <button
        type="button"
        onClick={openAdd}
        aria-label="일정 추가"
        className="fixed right-5 bottom-[calc(56px+1.25rem+env(safe-area-inset-bottom,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-haru-primary text-haru-text shadow-card active:bg-haru-primary-active"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <EventDaySheet
        open={daySheetOpen}
        date={selectedDate}
        events={selectedEvents}
        onClose={() => setDaySheetOpen(false)}
        onItemClick={openEdit}
      />

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
