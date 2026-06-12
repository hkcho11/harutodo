"use client";

import { useState, useEffect } from "react";
import BottomSheet from "@/components/common/BottomSheet";
import TimeDrum from "@/components/ui/TimeDrum";
import Button from "@/components/ui/Button";

const HOURS = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0")
);
const MINUTES = ["00", "30"];

interface Props {
  open: boolean;
  value: string | null; // "HH:MM" or null
  title: string;
  allowClear?: boolean; // false면 "종일로" 버튼 숨김 (알림 시각 설정 등)
  onConfirm: (v: string | null) => void;
  onClose: () => void;
}

function nearestTime(): { h: string; m: string } {
  const now = new Date();
  const total = now.getHours() * 60 + now.getMinutes();
  const next = Math.ceil(total / 30) * 30;
  const capped = Math.min(next, 23 * 60 + 30);
  return {
    h: String(Math.floor(capped / 60)).padStart(2, "0"),
    m: capped % 60 === 0 ? "00" : "30",
  };
}

function parseTime(v: string | null): { h: string; m: string } {
  if (!v) return nearestTime();
  const [h, m] = v.split(":");
  const mSnapped = parseInt(m) >= 30 ? "30" : "00";
  return { h: h.padStart(2, "0"), m: mSnapped };
}

// 시간 선택 바텀시트.
// 분은 00 / 30 두 가지만 허용.
export default function TimePickerSheet({
  open,
  value,
  title,
  allowClear = true,
  onConfirm,
  onClose,
}: Props) {
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");

  // 시트 열릴 때 현재 값으로 초기화
  useEffect(() => {
    if (!open) return;
    const { h, m } = parseTime(value);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour(h);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinute(m);
  }, [open, value]);

  const handleConfirm = () => {
    onConfirm(`${hour}:${minute}`);
    onClose();
  };

  const handleClear = () => {
    onConfirm(null);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-6 py-2">
        {/* 드럼 */}
        <div className="flex items-center gap-2">
          <TimeDrum
            items={HOURS}
            value={hour}
            onChange={setHour}
            label="시"
          />
          <span className="mb-1 text-2xl font-bold text-haru-text">:</span>
          <TimeDrum
            items={MINUTES}
            value={minute}
            onChange={setMinute}
            label="분"
          />
        </div>

        {/* 현재 선택값 표시 */}
        <div className="rounded-2xl bg-haru-primary-soft px-8 py-2">
          <span className="text-2xl font-bold tabular-nums text-haru-text">
            {hour}:{minute}
          </span>
        </div>

        {/* 액션 */}
        <div className="flex w-full gap-3">
          {allowClear && (
            <Button variant="ghost" onClick={handleClear} className="flex-1">
              종일로
            </Button>
          )}
          <Button onClick={handleConfirm} className="flex-1">
            확인
          </Button>
        </div>
      </div>
      <div className="h-2" />
    </BottomSheet>
  );
}
