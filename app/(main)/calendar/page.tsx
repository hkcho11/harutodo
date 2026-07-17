"use client";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { useMonthEvents } from "@/hooks/useMonthEvents";
import { usePersonalCycles } from "@/hooks/usePersonalCycles";
import { useCoupleStore } from "@/store/useCoupleStore";
import { useToastStore } from "@/store/useToastStore";
import { trackEvent } from "@/lib/services/analyticsService";
import { todayISO } from "@/lib/utils/date";
import { formatDateLabel } from "@/lib/utils/calendar";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import EventDaySheet from "@/components/calendar/EventDaySheet";
import CycleSheet from "@/components/calendar/CycleSheet";
import LoadingScreen from "@/components/common/LoadingScreen";
import EventList from "@/components/calendar/EventList";
import EventSheet from "@/components/calendar/EventSheet";
import type { Event, EventFormValues } from "@/types/event";
import type { PersonalCycle, CycleFormValues } from "@/types/cycle";

function parsePushDate(fallbackYear: number, fallbackMonth: number) {
  if (typeof window === "undefined") return { date: null, year: fallbackYear, month: fallbackMonth };
  const raw = new URLSearchParams(window.location.search).get("date");
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { date: null, year: fallbackYear, month: fallbackMonth };
  const d = new Date(`${raw}T00:00:00`);
  if (isNaN(d.getTime())) return { date: null, year: fallbackYear, month: fallbackMonth };
  return { date: raw, year: d.getFullYear(), month: d.getMonth() };
}

export default function CalendarPage() {
  const today = new Date();
  const todayStr = todayISO();

  const [pushDate] = useState(() => parsePushDate(today.getFullYear(), today.getMonth()).date);
  const [viewYear, setViewYear] = useState(() => parsePushDate(today.getFullYear(), today.getMonth()).year);
  const [viewMonth, setViewMonth] = useState(() => parsePushDate(today.getFullYear(), today.getMonth()).month); // 0-based
  const [selectedDate, setSelectedDate] = useState(() => parsePushDate(today.getFullYear(), today.getMonth()).date ?? todayStr);

  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const { events, eventsByDate, loading, add, update, remove } = useMonthEvents(
    viewYear,
    viewMonth
  );
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);
  const showToast = useToastStore((s) => s.show);

  const { cycleRanges, cyclePredictions, getCycleForDate, addCycle, updateCycle, deleteCycle } =
    usePersonalCycles(viewYear, viewMonth);

  const [cycleSheetOpen, setCycleSheetOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<PersonalCycle | null>(null);

  // Push 알림 진입 시 해당 날짜의 DaySheet 자동 오픈 (한 번만)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!pushDate || loading || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    const dayEvents = eventsByDate[pushDate] ?? [];
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (dayEvents.length > 0) setDaySheetOpen(true);
  }, [loading, pushDate, eventsByDate]);

  // date URL 파라미터 정리 — 한 번만 실행
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("date")) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("date");
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    if (!me?.id) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") !== "push") return;
    const notificationId = params.get("notification_id");
    const type = params.get("type");
    if (notificationId && type) {
      void trackEvent(me.id, "push_clicked", { notification_id: notificationId, type, source: "push" });
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("source");
    url.searchParams.delete("notification_id");
    url.searchParams.delete("type");
    url.searchParams.delete("date");
    window.history.replaceState({}, "", url.toString());
  }, [me?.id]);


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

  const sameDayInMonth = (isoDate: string, year: number, month: number) => {
    const day = parseInt(isoDate.split("-")[2], 10);
    const lastDay = new Date(year, month + 1, 0).getDate();
    const d = Math.min(day, lastDay);
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const handlePrev = () => {
    const newYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    const newMonth = viewMonth === 0 ? 11 : viewMonth - 1;
    setViewYear(newYear);
    setViewMonth(newMonth);
    setSelectedDate(sameDayInMonth(selectedDate, newYear, newMonth));
  };
  const handleNext = () => {
    const newYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    const newMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    setViewYear(newYear);
    setViewMonth(newMonth);
    setSelectedDate(sameDayInMonth(selectedDate, newYear, newMonth));
  };
  const handleToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    const dayEvents = eventsByDate[date] ?? [];
    if (dayEvents.length > 0 || me?.cycle_enabled) {
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

  const openAddCycle = () => {
    setEditingCycle(null);
    setDaySheetOpen(false);
    setCycleSheetOpen(true);
  };

  const openEditCycle = (cycle: PersonalCycle) => {
    setEditingCycle(cycle);
    setDaySheetOpen(false);
    setCycleSheetOpen(true);
  };

  const closeCycleSheet = () => {
    setCycleSheetOpen(false);
    setEditingCycle(null);
  };

  const handleCycleSubmit = async (values: CycleFormValues) => {
    if (editingCycle) {
      await updateCycle(editingCycle.id, values);
    } else {
      await addCycle(values);
    }
  };

  const handleCycleDelete = async (id: string) => {
    await deleteCycle(id);
  };

  const selectedEvents = eventsByDate[selectedDate] ?? [];
  const cyclePredictionItems = cyclePredictions.map((prediction) => ({
    prediction,
    label:
      prediction.userId === me?.id
        ? "내"
        : prediction.userId === partner?.id
        ? `${partner.display_name}의`
        : "",
  }));

  const swipeStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) handleNext();
    else handlePrev();
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="px-4 py-6 pb-28">
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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
          events={events}
          meId={me?.id ?? null}
          meColor={me?.avatar_color ?? null}
          partnerColor={partner?.avatar_color ?? null}
          cycleRanges={me?.cycle_enabled ? cycleRanges : undefined}
          cyclePredictions={me?.cycle_enabled ? cyclePredictions : undefined}
          onSelectDate={handleSelectDate}
        />
      </div>

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

        {selectedEvents.length === 0 ? (
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
        cycleEnabled={me?.cycle_enabled ?? false}
        myCycle={me?.cycle_enabled ? getCycleForDate(selectedDate) : null}
        cyclePredictionItems={me?.cycle_enabled ? cyclePredictionItems : []}
        onAddCycle={openAddCycle}
        onEditCycle={openEditCycle}
      />

      <EventSheet
        open={sheetOpen}
        event={editingEvent}
        defaultDate={selectedDate}
        onClose={closeSheet}
        onSubmit={handleSubmit}
        onDelete={editingEvent ? handleRemove : undefined}
      />

      <CycleSheet
        open={cycleSheetOpen}
        cycle={editingCycle}
        defaultDate={selectedDate}
        onClose={closeCycleSheet}
        onSubmit={handleCycleSubmit}
        onDelete={editingCycle ? handleCycleDelete : undefined}
      />
    </div>
  );
}
