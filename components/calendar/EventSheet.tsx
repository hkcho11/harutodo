"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import BottomSheet from "@/components/common/BottomSheet";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useCoupleStore } from "@/store/useCoupleStore";
import { cn } from "@/lib/utils/cn";
import { formatTime } from "@/lib/utils/event";
import type { Event, EventFormValues } from "@/types/event";

// 일정 검증:
// - title 1~200자
// - date 필수
// - start/end는 옵션이지만, end만 있고 start 없는 경우 금지 + end >= start
const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "일정 제목을 입력해주세요")
      .max(200, "200자 이하로 입력해주세요"),
    date: z.string().min(1, "날짜를 선택해주세요"),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    assignee_id: z.string().nullable(),
  })
  .refine(
    (d) => !(d.end_time && !d.start_time),
    {
      message: "시작 시간을 먼저 선택해주세요",
      path: ["end_time"],
    }
  )
  .refine(
    (d) => !d.start_time || !d.end_time || d.end_time >= d.start_time,
    {
      message: "종료 시간은 시작 시간 이후여야 해요",
      path: ["end_time"],
    }
  );

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  event: Event | null;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

// 참여자 선택 칩 — 함께 / 나 / 파트너 3-way
type Participant = "together" | "me" | "partner";

export default function EventSheet({
  open,
  event,
  defaultDate,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      date: defaultDate,
      start_time: null,
      end_time: null,
      assignee_id: null, // 기본: 함께
    },
  });

  const assigneeId = useWatch({ control, name: "assignee_id" });
  const startTime = useWatch({ control, name: "start_time" });
  const endTime = useWatch({ control, name: "end_time" });

  // 현재 폼의 참여자 선택을 chip 종류로 매핑
  const participant: Participant =
    assigneeId === null
      ? "together"
      : me && assigneeId === me.id
      ? "me"
      : "partner";

  useEffect(() => {
    if (!open) return;
    if (event) {
      reset({
        title: event.title,
        date: event.date,
        start_time: formatTime(event.start_time),
        end_time: formatTime(event.end_time),
        assignee_id: event.assignee_id,
      });
    } else {
      reset({
        title: "",
        date: defaultDate,
        start_time: null,
        end_time: null,
        assignee_id: null,
      });
    }
  }, [open, event, defaultDate, reset]);

  const setParticipant = (p: Participant) => {
    if (p === "together") setValue("assignee_id", null, { shouldValidate: true });
    else if (p === "me" && me)
      setValue("assignee_id", me.id, { shouldValidate: true });
    else if (p === "partner" && partner)
      setValue("assignee_id", partner.id, { shouldValidate: true });
  };

  const onValid = async (values: FormValues) => {
    const payload: EventFormValues = {
      title: values.title.trim(),
      date: values.date,
      start_time: values.start_time || null,
      end_time: values.end_time || null,
      assignee_id: values.assignee_id,
    };
    await onSubmit(payload);
    onClose();
  };

  const openDeleteConfirm = () => setConfirmOpen(true);

  const confirmDelete = async () => {
    if (!event || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(event.id);
      setConfirmOpen(false);
      onClose();
    } catch {
      setConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearTimes = () => {
    setValue("start_time", null, { shouldValidate: true });
    setValue("end_time", null, { shouldValidate: true });
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={event ? "일정 편집" : "일정 추가"}
    >
      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4">
        <Input
          id="event-title"
          placeholder="일정 제목"
          autoFocus
          {...register("title")}
          error={errors.title?.message}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="event-date"
            className="text-sm font-medium text-haru-text"
          >
            날짜
          </label>
          <input
            id="event-date"
            type="date"
            {...register("date")}
            className="min-h-[44px] w-full rounded-2xl border border-haru-border bg-haru-surface px-4 py-3 text-base text-haru-text outline-none transition-colors focus:border-haru-primary focus:ring-2 focus:ring-haru-primary-soft"
          />
          {errors.date && (
            <p className="text-sm text-haru-danger">{errors.date.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-haru-text">시간</span>
            {(startTime || endTime) && (
              <button
                type="button"
                onClick={clearTimes}
                className="text-xs text-haru-muted active:text-haru-text"
              >
                종일로 변경
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              {...register("start_time")}
              className="min-h-[44px] flex-1 rounded-2xl border border-haru-border bg-haru-surface px-3 py-3 text-base text-haru-text outline-none focus:border-haru-primary focus:ring-2 focus:ring-haru-primary-soft"
              aria-label="시작 시간"
            />
            <span className="text-haru-muted">–</span>
            <input
              type="time"
              {...register("end_time")}
              className="min-h-[44px] flex-1 rounded-2xl border border-haru-border bg-haru-surface px-3 py-3 text-base text-haru-text outline-none focus:border-haru-primary focus:ring-2 focus:ring-haru-primary-soft"
              aria-label="종료 시간"
            />
          </div>
          {errors.end_time && (
            <p className="text-sm text-haru-danger">
              {errors.end_time.message}
            </p>
          )}
          {!startTime && !endTime && (
            <p className="text-xs text-haru-muted">시간을 비우면 종일 일정이에요</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-haru-text">참여</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setParticipant("together")}
              className={cn(
                "min-h-[40px] flex-1 rounded-full border px-3 text-sm font-medium transition-colors",
                participant === "together"
                  ? "bg-haru-secondary text-haru-text border-haru-secondary"
                  : "bg-haru-surface text-haru-text border-haru-border"
              )}
            >
              함께
            </button>
            {me && (
              <button
                type="button"
                onClick={() => setParticipant("me")}
                className={cn(
                  "min-h-[40px] flex-1 rounded-full border px-3 text-sm font-medium transition-colors truncate",
                  participant === "me"
                    ? "bg-haru-primary text-haru-text border-haru-primary"
                    : "bg-haru-surface text-haru-text border-haru-border"
                )}
              >
                나
              </button>
            )}
            {partner && (
              <button
                type="button"
                onClick={() => setParticipant("partner")}
                className={cn(
                  "min-h-[40px] flex-1 rounded-full border px-3 text-sm font-medium transition-colors truncate",
                  participant === "partner"
                    ? "bg-haru-accent text-haru-text border-haru-accent"
                    : "bg-haru-surface text-haru-text border-haru-border"
                )}
              >
                {partner.display_name}
              </button>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 mt-2 flex gap-2 border-t border-haru-border bg-haru-surface px-5 pt-3 pb-1">
          {event && onDelete && (
            <button
              type="button"
              onClick={openDeleteConfirm}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-haru-border text-haru-danger active:bg-haru-primary-soft"
              aria-label="삭제"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <Button type="submit" isLoading={isSubmitting}>
            {event ? "저장" : "추가"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="일정을 삭제할까요?"
        description="삭제한 일정은 되돌릴 수 없어요."
        confirmLabel="삭제"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
}
