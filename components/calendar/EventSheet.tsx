"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, CalendarDays, Clock } from "lucide-react";
import BottomSheet from "@/components/common/BottomSheet";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DatePickerSheet from "@/components/common/DatePickerSheet";
import TimePickerSheet from "@/components/ui/TimePickerSheet";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import LocationInput from "@/components/calendar/LocationInput";
import LocationMapPreview from "@/components/calendar/LocationMapPreview";
import { useCoupleStore } from "@/store/useCoupleStore";
import { cn } from "@/lib/utils/cn";
import { formatTime, formatEventTimeRange } from "@/lib/utils/event";
import { formatDateShort } from "@/lib/utils/date";
import type { Event, EventFormValues, SelectedLocation } from "@/types/event";

const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "일정 제목을 입력해주세요")
      .max(200, "200자 이하로 입력해주세요"),
    date: z.string().min(1, "날짜를 선택해주세요"),
    end_date: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    assignee_id: z.string().nullable(),
  })
  .refine((d) => !d.end_date || d.end_date >= d.date, {
    message: "종료 날짜는 시작 날짜 이후여야 해요",
    path: ["end_date"],
  })
  .refine((d) => !(d.end_time && !d.start_time), {
    message: "시작 시간을 먼저 선택해주세요",
    path: ["end_time"],
  })
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

type Participant = "together" | "me" | "partner";
type TimePicking = "start" | "end" | null;

function addOneHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = Math.min(h * 60 + m + 60, 23 * 60 + 30);
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

// 현재 시각 기준으로 가장 가까운 미래 30분 단위 시간 (최대 23:30)
function nearestFutureTime(): string {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.ceil(totalMinutes / 30) * 30;
  const capped = Math.min(rounded, 23 * 60 + 30);
  const h = Math.floor(capped / 60);
  const m = capped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [timePicking, setTimePicking] = useState<TimePicking>(null);
  const [location, setLocation] = useState<SelectedLocation | null>(null);

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
      end_date: defaultDate,
      start_time: null,
      end_time: null,
      assignee_id: null,
    },
  });

  const assigneeId = useWatch({ control, name: "assignee_id" });
  const startTime = useWatch({ control, name: "start_time" });
  const endTime = useWatch({ control, name: "end_time" });
  const date = useWatch({ control, name: "date" });
  const endDate = useWatch({ control, name: "end_date" });

  // end_date가 start_date보다 이후인 경우만 다일 일정
  const isMultiDay = !!endDate && endDate > date;

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
        end_date: event.end_date ?? event.date,
        start_time: formatTime(event.start_time),
        end_time: formatTime(event.end_time),
        assignee_id: event.assignee_id,
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(
        event.location_name && event.location_latitude != null && event.location_longitude != null
          ? {
              name: event.location_name,
              address: event.location_address ?? "",
              latitude: event.location_latitude,
              longitude: event.location_longitude,
              provider: event.location_provider ?? "kakao",
              providerId: event.location_provider_id ?? "",
              url: event.location_url ?? "",
            }
          : null
      );
    } else {
      const st = nearestFutureTime();
      const et = addOneHour(st);
      reset({
        title: "",
        date: defaultDate,
        end_date: defaultDate,          // 당일 종료 기본값
        start_time: st,
        end_time: et !== st ? et : null, // 23:30 cap으로 같아지면 null
        assignee_id: null,
      });
      setLocation(null);
    }
  }, [open, event, defaultDate, reset]);

  const setParticipant = (p: Participant) => {
    if (p === "together") setValue("assignee_id", null, { shouldValidate: true });
    else if (p === "me" && me) setValue("assignee_id", me.id, { shouldValidate: true });
    else if (p === "partner" && partner) setValue("assignee_id", partner.id, { shouldValidate: true });
  };

  const onValid = async (values: FormValues) => {
    // end_date가 date보다 이후여야 진짜 다일 일정 — 같은 날은 단일 일정으로 저장
    const multiDay = !!values.end_date && values.end_date > values.date;
    const payload: EventFormValues = {
      title: values.title.trim(),
      date: values.date,
      end_date: multiDay ? values.end_date : null,
      start_time: multiDay ? null : (values.start_time || null),
      end_time: multiDay ? null : (values.end_time || null),
      assignee_id: values.assignee_id,
      location_name: location?.name ?? null,
      location_address: location?.address ?? null,
      location_latitude: location?.latitude ?? null,
      location_longitude: location?.longitude ?? null,
      location_provider: location?.provider ?? null,
      location_provider_id: location?.providerId ?? null,
      location_url: location?.url ?? null,
    };
    try {
      await onSubmit(payload);
      onClose();
    } catch {
      // 에러는 부모(toast)에서 처리. 시트는 열린 채로 유지.
    }
  };

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

  const handleTimeConfirm = (v: string | null) => {
    if (timePicking === "start") {
      setValue("start_time", v, { shouldValidate: true });
      if (!v) {
        setValue("end_time", null, { shouldValidate: true });
      } else {
        setValue("end_time", addOneHour(v), { shouldValidate: true });
      }
    } else if (timePicking === "end") {
      setValue("end_time", v, { shouldValidate: true });
    }
  };

  const clearTimes = () => {
    setValue("start_time", null, { shouldValidate: true });
    setValue("end_time", null, { shouldValidate: true });
  };

  const timeDisplayLabel =
    !startTime && !endTime
      ? "종일"
      : formatEventTimeRange({
          start_time: startTime,
          end_time: endTime,
        } as Event);

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={event ? "일정 편집" : "일정 추가"}
        footer={
          <div className="flex gap-2">
            {event && onDelete && (
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-haru-border text-haru-danger active:bg-haru-primary-soft"
                aria-label="삭제"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <Button type="submit" form="event-form" isLoading={isSubmitting}>
              {event ? "저장" : "추가"}
            </Button>
          </div>
        }
      >
        <form id="event-form" onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4">
          <Input
            id="event-title"
            placeholder="일정 제목"
            autoFocus
            {...register("title")}
            error={errors.title?.message}
          />

          {/* 날짜 — 시작/종료 한 행 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-haru-text">날짜</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className="flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border border-haru-border bg-haru-surface px-3 py-2 text-sm text-haru-text transition-colors active:bg-haru-primary-soft"
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-haru-muted" />
                <span className="truncate">{date ? formatDateShort(date) : "시작"}</span>
              </button>
              <span className="shrink-0 text-xs text-haru-muted">→</span>
              <button
                type="button"
                onClick={() => setEndDatePickerOpen(true)}
                className={cn(
                  "flex flex-1 min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border px-3 py-2 text-sm transition-colors active:bg-haru-primary-soft",
                  isMultiDay
                    ? "border-haru-primary bg-haru-primary-soft text-haru-text"
                    : "border-haru-border bg-haru-surface text-haru-muted"
                )}
              >
                <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{endDate ? formatDateShort(endDate) : "종료"}</span>
              </button>
            </div>
            {isMultiDay && (
              <p className="text-xs text-haru-muted px-1">
                {formatEventTimeRange({ date, end_date: endDate, start_time: null, end_time: null } as Event)}
              </p>
            )}
            {(errors.date || errors.end_date) && (
              <p className="text-sm text-haru-danger">
                {errors.date?.message ?? errors.end_date?.message}
              </p>
            )}
          </div>

          {/* 시간 — 다일 일정에서는 숨김 */}
          {!isMultiDay && <div className="flex flex-col gap-1.5">
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

            <div className="flex gap-2">
              {/* 시작 시간 */}
              <button
                type="button"
                onClick={() => setTimePicking("start")}
                className={cn(
                  "flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                  startTime
                    ? "border-haru-primary bg-haru-primary-soft text-haru-text"
                    : "border-haru-border bg-haru-surface text-haru-muted"
                )}
              >
                <Clock className="h-4 w-4 shrink-0" />
                {startTime ?? "시작"}
              </button>

              <span className="flex items-center text-haru-muted">–</span>

              {/* 종료 시간 */}
              <button
                type="button"
                onClick={() => setTimePicking("end")}
                disabled={!startTime}
                className={cn(
                  "flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium transition-colors",
                  endTime
                    ? "border-haru-primary bg-haru-primary-soft text-haru-text"
                    : "border-haru-border bg-haru-surface text-haru-muted",
                  !startTime && "opacity-40 pointer-events-none"
                )}
              >
                <Clock className="h-4 w-4 shrink-0" />
                {endTime ?? "종료"}
              </button>
            </div>

            {/* 종일 표시 */}
            {!startTime && !endTime && (
              <p className="text-xs text-haru-muted">
                시간을 선택하지 않으면 종일 일정이에요
              </p>
            )}
            {/* 현재 시간 범위 뱃지 */}
            {(startTime || endTime) && (
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-haru-secondary-soft px-3 py-0.5 text-xs font-semibold text-haru-text">
                  {timeDisplayLabel}
                </span>
              </div>
            )}

            {errors.end_time && (
              <p className="text-sm text-haru-danger">
                {errors.end_time.message}
              </p>
            )}
          </div>}

          {/* 참여 */}
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

          {/* 장소 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-haru-text">장소</span>
            <LocationInput value={location} onChange={setLocation} />
            {location && <LocationMapPreview location={location} />}
          </div>

        </form>
      </BottomSheet>

      {/* 날짜 피커 */}
      <DatePickerSheet
        open={datePickerOpen}
        selectedDate={date || defaultDate}
        onSelect={(iso) => {
          setValue("date", iso, { shouldValidate: true });
          if (endDate) {
            if (endDate === date || iso > endDate) {
              // 같은 날 → 새 날짜에 동기화 / 시작이 종료 이후로 이동 → 리셋
              setValue("end_date", iso, { shouldValidate: true });
            }
          }
          setDatePickerOpen(false);
        }}
        onClose={() => setDatePickerOpen(false)}
      />

      {/* 종료 날짜 피커 */}
      <DatePickerSheet
        open={endDatePickerOpen}
        selectedDate={endDate || date || defaultDate}
        onSelect={(iso) => {
          setValue("end_date", iso, { shouldValidate: true });
          setEndDatePickerOpen(false);
        }}
        onClose={() => setEndDatePickerOpen(false)}
      />

      {/* 시간 피커 */}
      <TimePickerSheet
        open={timePicking !== null}
        value={timePicking === "start" ? startTime : endTime}
        title={timePicking === "start" ? "시작 시간" : "종료 시간"}
        onConfirm={handleTimeConfirm}
        onClose={() => setTimePicking(null)}
      />

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
    </>
  );
}
