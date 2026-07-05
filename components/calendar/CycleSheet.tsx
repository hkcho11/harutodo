"use client";

import { useState, useEffect } from "react";
import BottomSheet from "@/components/common/BottomSheet";
import CalendarPickerSheet from "@/components/common/CalendarPickerSheet";
import { useToastStore } from "@/store/useToastStore";
import { todayISO } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import {
  SYMPTOM_TAGS,
  type PersonalCycle,
  type CycleFormValues,
  type SymptomTag,
  type ShareLevel,
} from "@/types/cycle";

interface Props {
  open: boolean;
  cycle: PersonalCycle | null; // null = 추가 모드
  defaultDate: string;
  onClose: () => void;
  onSubmit: (values: CycleFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

const SHARE_LEVEL_OPTIONS: { value: ShareLevel; label: string; desc: string }[] = [
  { value: "private", label: "비공개", desc: "나만 볼 수 있어요" },
  { value: "period_only", label: "기간만 공유", desc: "파트너에게 주기 기간만 표시돼요" },
  { value: "period_and_condition", label: "기간 + 컨디션 공유", desc: "파트너에게 기간과 컨디션 태그가 표시돼요" },
];

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
  const [ongoing, setOngoing] = useState(true);
  const [symptomTags, setSymptomTags] = useState<SymptomTag[]>([]);
  const [note, setNote] = useState("");
  const [shareLevel, setShareLevel] = useState<ShareLevel>("private");
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 시트 열릴 때 기존 데이터로 초기화
  useEffect(() => {
    if (!open) return;
    if (cycle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStartDate(cycle.start_date);
      setEndDate(cycle.end_date);
      setOngoing(cycle.end_date === null);
      setSymptomTags((cycle.symptom_tags ?? []) as SymptomTag[]);
      setNote(cycle.note ?? "");
      setShareLevel(cycle.share_level as ShareLevel);
    } else {
      setStartDate(defaultDate);
      setEndDate(null);
      setOngoing(true);
      setSymptomTags([]);
      setNote("");
      setShareLevel("private");
    }
  }, [open, cycle, defaultDate]);

  const toggleTag = (tag: SymptomTag) => {
    setSymptomTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

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
    if (!ongoing && !endDate) {
      showToast("종료일을 선택해주세요");
      return;
    }
    if (!ongoing && endDate && endDate < startDate) {
      showToast("종료일은 시작일 이후여야 해요");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        start_date: startDate,
        end_date: ongoing ? null : endDate,
        symptom_tags: symptomTags,
        note,
        share_level: shareLevel,
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
        title={cycle ? "내 주기 수정" : "내 주기 기록"}
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
          {/* 시작일 */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-haru-muted">시작일</p>
            <button
              type="button"
              onClick={() => setStartPickerOpen(true)}
              className="w-full rounded-2xl border border-haru-border bg-haru-surface-soft px-4 py-3 text-left text-sm text-haru-text active:bg-haru-border"
            >
              {startDate}
            </button>
          </div>

          {/* 종료일 */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-haru-muted">종료일</p>
            <button
              type="button"
              onClick={() => setOngoing((v) => !v)}
              className={cn(
                "mb-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                ongoing
                  ? "bg-haru-cycle text-haru-text"
                  : "border border-haru-border text-haru-muted"
              )}
            >
              <span
                className={cn(
                  "h-3.5 w-3.5 rounded-full border-2 transition-colors",
                  ongoing ? "border-haru-primary-active bg-haru-primary-active" : "border-haru-border"
                )}
              />
              아직 진행 중
            </button>
            {!ongoing && (
              <button
                type="button"
                onClick={() => setEndPickerOpen(true)}
                className="w-full rounded-2xl border border-haru-border bg-haru-surface-soft px-4 py-3 text-left text-sm text-haru-text active:bg-haru-border"
              >
                {endDate ?? "날짜 선택"}
              </button>
            )}
          </div>

          {/* 컨디션 태그 */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-haru-muted">컨디션 (선택)</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                    symptomTags.includes(tag)
                      ? "bg-haru-cycle text-haru-text"
                      : "border border-haru-border bg-haru-surface-soft text-haru-muted active:bg-haru-border"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-haru-muted">메모 (선택)</p>
              <p className="text-xs text-haru-muted">나만 볼 수 있어요</p>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="기록하고 싶은 내용을 적어요"
              rows={3}
              maxLength={500}
              className="w-full resize-none rounded-2xl border border-haru-border bg-haru-surface-soft px-4 py-3 text-sm text-haru-text placeholder:text-haru-muted focus:border-haru-primary focus:outline-none focus:ring-2 focus:ring-haru-primary-soft"
            />
          </div>

          {/* 공유 범위 */}
          <div>
            <p className="mb-1.5 text-xs font-semibold text-haru-muted">공유 범위</p>
            <div className="space-y-1">
              {SHARE_LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setShareLevel(opt.value)}
                  className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors active:bg-haru-primary-soft"
                >
                  <span
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition-colors",
                      shareLevel === opt.value
                        ? "border-haru-primary-active bg-haru-primary-active"
                        : "border-haru-border bg-transparent"
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-haru-text">{opt.label}</p>
                    <p className="text-xs text-haru-muted">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 pl-7 text-xs text-haru-muted">
              메모는 어떤 경우에도 파트너에게 공유되지 않아요
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
