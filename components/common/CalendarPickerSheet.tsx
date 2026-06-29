"use client";

import { useState, useEffect } from "react";
import BottomSheet from "@/components/common/BottomSheet";
import CalendarHeader from "@/components/calendar/CalendarHeader";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import { todayISO } from "@/lib/utils/date";
import { useMonthTodoDates } from "@/hooks/useMonthTodoDates";

interface Props {
  open: boolean;
  selectedDate: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
  minDate?: string;
}

export default function CalendarPickerSheet({
  open,
  selectedDate,
  onSelect,
  onClose,
  minDate,
}: Props) {
  const today = todayISO();
  const [viewYear, setViewYear] = useState(() => {
    const [y] = selectedDate.split("-");
    return parseInt(y);
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const [, m] = selectedDate.split("-");
    return parseInt(m) - 1; // 0-based
  });

  const markedDates = useMonthTodoDates(viewYear, viewMonth);

  // 시트 열릴 때 선택된 날짜의 월로 이동
  useEffect(() => {
    if (!open) return;
    const [y, m] = selectedDate.split("-");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewYear(parseInt(y));
    setViewMonth(parseInt(m) - 1);
  }, [open, selectedDate]);

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
    const [y, m] = today.split("-");
    setViewYear(parseInt(y));
    setViewMonth(parseInt(m) - 1);
  };

  const handleSelectDate = (iso: string) => {
    onSelect(iso);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="날짜 선택">
      <div className="pb-4">
        <CalendarHeader
          year={viewYear}
          month={viewMonth}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
        />
        <div className="mt-3">
          <MonthCalendar
            year={viewYear}
            month={viewMonth}
            selectedDate={selectedDate}
            todayISO={today}
            meId={null}
            markedDates={markedDates}
            minDate={minDate}
            onSelectDate={handleSelectDate}
          />
        </div>
      </div>
    </BottomSheet>
  );
}
