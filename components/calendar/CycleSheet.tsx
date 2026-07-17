"use client";

import { useEffect, useState } from "react";
import BottomSheet from "@/components/common/BottomSheet";
import CalendarPickerSheet from "@/components/common/CalendarPickerSheet";
import { useToastStore } from "@/store/useToastStore";
import { todayISO, formatDateShort } from "@/lib/utils/date";
import type {
  PersonalCycle,
  CycleFormValues,
} from "@/types/cycle";

interface Props {
  open: boolean;
  cycle: PersonalCycle | null;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (values: CycleFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function CycleSheet({
  open,
  cycle,
  defaultDate,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const today = todayISO();
  const showToast = useToastStore((s) => s.show);

  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (cycle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartDate(cycle.start_date);
      setEndDate(cycle.end_date);
    } else {
      setStartDate(defaultDate);
      setEndDate(null);
    }
  }, [open, cycle, defaultDate]);

  const handleClose = () => {
    if (submitting || deleting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!startDate) {
      showToast("시작일을 선택해주세요");
      return;
    }
    if (endDate && endDate < startDate) {
      showToast("종료일은 시작일 이후여야 해요");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        start_date: startDate,
        end_date: endDate,
      });
      onClose();
    } catch {
      showToast("저장에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!cycle || deleting || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(cycle.id);
      onClose();
    } catch {
      showToast("삭제에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={handleClose}
        title={cycle ? "생리 기록 수정" : "생리 기록"}
        footer={
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || deleting}
              className="w-full rounded-2xl bg-haru-primary py-3 text-sm font-semibold text-haru-text disabled:opacity-40 active:bg-haru-primary-active"
            >
              {submitting ? "저장 중..." : "저장"}
            </button>
            {cycle && onDelete && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={submitting || deleting}
                className="w-full rounded-2xl border border-haru-danger py-3 text-sm font-semibold text-haru-danger disabled:opacity-40 active:bg-haru-danger/10"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          <p className="rounded-2xl bg-haru-cycle-soft px-4 py-3 text-sm leading-relaxed text-haru-text">
            시작일과 종료일만 기록해요. 기록을 바탕으로 다음 예정일과 배란예상일을 캘린더에 표시합니다.
          </p>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-haru-muted">시작일</p>
            <button
              type="button"
              onClick={() => setStartPickerOpen(true)}
              className="w-full rounded-2xl border border-haru-border bg-haru-surface-soft px-4 py-3 text-left text-sm font-semibold text-haru-text active:bg-haru-border"
            >
              {formatDateShort(startDate)}
            </button>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-haru-muted">종료일</p>
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate(null)}
                  className="text-xs font-medium text-haru-muted active:text-haru-text"
                >
                  비우기
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEndPickerOpen(true)}
              className="w-full rounded-2xl border border-haru-border bg-haru-surface-soft px-4 py-3 text-left text-sm font-semibold text-haru-text active:bg-haru-border"
            >
              {endDate ? formatDateShort(endDate) : "종료일 선택"}
            </button>
            <p className="mt-2 text-xs leading-relaxed text-haru-muted">
              아직 끝나지 않았다면 종료일은 나중에 입력해도 돼요.
            </p>
          </div>
        </div>
      </BottomSheet>

      <CalendarPickerSheet
        open={startPickerOpen}
        selectedDate={startDate}
        onSelect={(d) => {
          setStartDate(d);
          if (endDate && d > endDate) setEndDate(null);
        }}
        onClose={() => setStartPickerOpen(false)}
        maxDate={today}
      />

      <CalendarPickerSheet
        open={endPickerOpen}
        selectedDate={endDate ?? startDate}
        onSelect={(d) => setEndDate(d)}
        onClose={() => setEndPickerOpen(false)}
        minDate={startDate}
        maxDate={today}
      />
    </>
  );
}
