"use client";

import { useState, useEffect, useMemo } from "react";
import BottomSheet from "@/components/common/BottomSheet";
import TimeDrum from "@/components/ui/TimeDrum";
import Button from "@/components/ui/Button";
import { todayISO } from "@/lib/utils/date";

interface Props {
  open: boolean;
  selectedDate: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}

function daysInMonth(year: number, month: number): number {
  // month: 1-indexed. new Date(y, m, 0) = last day of (m-1)th month = days in month m
  return new Date(year, month, 0).getDate();
}

function parseDate(iso: string): { y: string; m: string; d: string } {
  const [y, m, d] = iso.split("-");
  return { y, m, d };
}

export default function DatePickerSheet({ open, selectedDate, onSelect, onClose }: Props) {
  const todayYear = parseInt(todayISO().split("-")[0]);

  const YEARS = useMemo(
    () => Array.from({ length: 8 }, (_, i) => String(todayYear - 1 + i)),
    [todayYear]
  );
  const MONTHS = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  const { y: initY, m: initM, d: initD } = parseDate(selectedDate);
  const [year, setYear] = useState(initY);
  const [month, setMonth] = useState(initM);
  const [day, setDay] = useState(initD);

  const DAYS = useMemo(() => {
    const count = daysInMonth(parseInt(year), parseInt(month));
    return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [year, month]);

  // 월/년 바뀔 때 일이 초과하면 마지막 날로 클램프
  useEffect(() => {
    const max = daysInMonth(parseInt(year), parseInt(month));
    if (parseInt(day) > max) {
      setDay(String(max).padStart(2, "0"));
    }
  }, [year, month, day]);

  // 시트 열릴 때 현재 값으로 초기화
  useEffect(() => {
    if (!open) return;
    const { y, m, d } = parseDate(selectedDate);
    setYear(y);
    setMonth(m);
    setDay(d);
  }, [open, selectedDate]);

  const handleConfirm = () => {
    onSelect(`${year}-${month}-${day}`);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="날짜 선택">
      <div className="flex flex-col items-center gap-6 py-2">
        {/* 드럼 */}
        <div className="flex items-center gap-2">
          <TimeDrum items={YEARS} value={year} onChange={setYear} label="년" />
          <TimeDrum items={MONTHS} value={month} onChange={setMonth} label="월" />
          <TimeDrum items={DAYS} value={day} onChange={setDay} label="일" />
        </div>

        {/* 현재 선택값 표시 */}
        <div className="rounded-2xl bg-haru-primary-soft px-8 py-2">
          <span className="text-2xl font-bold tabular-nums text-haru-text">
            {year}.{month}.{day}
          </span>
        </div>

        <Button onClick={handleConfirm} className="w-full">
          확인
        </Button>
      </div>
      <div className="h-2" />
    </BottomSheet>
  );
}
