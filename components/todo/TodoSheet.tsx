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
import type { Todo } from "@/types/todo";
import type { TodoFormValues, TodoFormGroup } from "@/hooks/useTodayTodos";

// group이 individual일 땐 assignee_id가 반드시 있어야 함.
const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "할 일을 입력해주세요")
      .max(200, "200자 이하로 입력해주세요"),
    date: z.string().min(1, "날짜를 선택해주세요"),
    group: z.enum(["together", "individual", "other"]),
    assignee_id: z.string().nullable(),
  })
  .refine(
    (data) => data.group !== "individual" || data.assignee_id !== null,
    {
      message: "담당자를 선택해주세요",
      path: ["assignee_id"],
    }
  );

type FormValues = z.infer<typeof schema>;

const GROUPS: { value: TodoFormGroup; label: string }[] = [
  { value: "together", label: "함께" },
  { value: "individual", label: "사람별" },
  { value: "other", label: "그 외" },
];

interface Props {
  open: boolean;
  todo: Todo | null;
  defaultDate: string;
  onClose: () => void;
  onSubmit: (values: TodoFormValues) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function TodoSheet({
  open,
  todo,
  defaultDate,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);

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
      group: "other",
      assignee_id: null,
    },
  });

  // useWatch — useForm.watch 대신 control 기반. React Compiler 메모이제이션 호환.
  const group = useWatch({ control, name: "group" });
  const assigneeId = useWatch({ control, name: "assignee_id" });

  useEffect(() => {
    if (!open) return;
    if (todo) {
      const safeGroup: TodoFormGroup =
        todo.group === "custom" ? "other" : (todo.group as TodoFormGroup);
      reset({
        title: todo.title,
        date: todo.date ?? defaultDate,
        group: safeGroup,
        assignee_id: todo.assignee_id,
      });
    } else {
      reset({
        title: "",
        date: defaultDate,
        group: "other",
        assignee_id: null,
      });
    }
  }, [open, todo, defaultDate, reset]);

  // 삭제 확인 다이얼로그 — 모바일 실수 방지
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onValid = async (values: FormValues) => {
    const payload: TodoFormValues = {
      title: values.title.trim(),
      date: values.date,
      group: values.group,
      // 그룹이 사람별이 아닌 경우 담당자 null 강제
      assignee_id: values.group === "individual" ? values.assignee_id : null,
    };
    await onSubmit(payload);
    onClose();
  };

  const openDeleteConfirm = () => {
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!todo || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(todo.id);
      setConfirmOpen(false);
      onClose();
    } catch {
      // 토스트는 호출 측에서 띄움. 다이얼로그만 닫고 시트는 유지.
      setConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={todo ? "할 일 편집" : "할 일 추가"}
    >
      <form onSubmit={handleSubmit(onValid)} className="flex flex-col gap-4">
        <Input
          id="title"
          placeholder="할 일 제목"
          autoFocus
          {...register("title")}
          error={errors.title?.message}
        />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="date"
            className="text-sm font-medium text-haru-text"
          >
            날짜
          </label>
          <input
            id="date"
            type="date"
            {...register("date")}
            className="min-h-[44px] w-full rounded-2xl border border-haru-border bg-haru-surface px-4 py-3 text-base text-haru-text outline-none transition-colors focus:border-haru-primary focus:ring-2 focus:ring-haru-primary-soft"
          />
          {errors.date && (
            <p className="text-sm text-haru-danger">{errors.date.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-haru-text">그룹</span>
          <div className="flex gap-2">
            {GROUPS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() =>
                  setValue("group", g.value, { shouldValidate: true })
                }
                className={cn(
                  "min-h-[40px] flex-1 rounded-full border px-4 text-sm font-medium transition-colors",
                  group === g.value
                    ? "bg-haru-primary text-white border-haru-primary"
                    : "bg-haru-surface text-haru-text border-haru-border"
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {group === "individual" && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-haru-text">담당자</span>
            <div className="flex gap-2">
              {me && (
                <button
                  type="button"
                  onClick={() =>
                    setValue("assignee_id", me.id, { shouldValidate: true })
                  }
                  className={cn(
                    "min-h-[40px] flex-1 rounded-full border px-4 text-sm font-medium transition-colors",
                    assigneeId === me.id
                      ? "bg-haru-primary text-white border-haru-primary"
                      : "bg-haru-surface text-haru-text border-haru-border"
                  )}
                >
                  나 ({me.display_name})
                </button>
              )}
              {partner && (
                <button
                  type="button"
                  onClick={() =>
                    setValue("assignee_id", partner.id, {
                      shouldValidate: true,
                    })
                  }
                  className={cn(
                    "min-h-[40px] flex-1 rounded-full border px-4 text-sm font-medium transition-colors",
                    assigneeId === partner.id
                      ? "bg-haru-primary text-white border-haru-primary"
                      : "bg-haru-surface text-haru-text border-haru-border"
                  )}
                >
                  {partner.display_name}
                </button>
              )}
            </div>
            {errors.assignee_id && (
              <p className="text-sm text-haru-danger">
                {errors.assignee_id.message}
              </p>
            )}
          </div>
        )}

        {/* sticky 액션 영역 — 시트 본문 스크롤 시에도 항상 하단에 노출 */}
        <div className="sticky bottom-0 -mx-5 mt-2 flex gap-2 border-t border-haru-border bg-haru-surface px-5 pt-3 pb-1">
          {todo && onDelete && (
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
            {todo ? "저장" : "추가"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmOpen}
        title="할 일을 삭제할까요?"
        description="삭제한 할 일은 되돌릴 수 없어요."
        confirmLabel="삭제"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </BottomSheet>
  );
}
