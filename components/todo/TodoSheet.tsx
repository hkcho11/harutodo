"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Trash2, Plus, Check, X } from "lucide-react";
import BottomSheet from "@/components/common/BottomSheet";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import DatePickerSheet from "@/components/common/DatePickerSheet";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { formatDateNavLabel } from "@/lib/utils/date";
import { useCoupleStore } from "@/store/useCoupleStore";
import { useCustomGroups } from "@/hooks/useCustomGroups";
import {
  MAX_CUSTOM_GROUPS_PER_COUPLE,
  ERR_GROUP_LIMIT_EXCEEDED,
} from "@/lib/services/customGroupService";
import { useToastStore } from "@/store/useToastStore";
import { cn } from "@/lib/utils/cn";
import type { Todo } from "@/types/todo";
import type { TodoFormValues, TodoFormGroup } from "@/hooks/useTodayTodos";

// group이 individual일 땐 assignee_id, custom일 땐 custom_group_id가 반드시 있어야 함.
const schema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "할 일을 입력해주세요")
      .max(200, "200자 이하로 입력해주세요"),
    date: z.string().min(1, "날짜를 선택해주세요"),
    group: z.enum(["together", "individual", "other", "custom"]),
    assignee_id: z.string().nullable(),
    custom_group_id: z.string().nullable(),
  })
  .refine(
    (data) => data.group !== "individual" || data.assignee_id !== null,
    {
      message: "담당자를 선택해주세요",
      path: ["assignee_id"],
    }
  )
  .refine(
    (data) => data.group !== "custom" || data.custom_group_id !== null,
    {
      message: "그룹을 선택해주세요",
      path: ["custom_group_id"],
    }
  );

type FormValues = z.infer<typeof schema>;

const BASE_GROUPS: { value: Exclude<TodoFormGroup, "custom">; label: string }[] = [
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
  const { groups: customGroups, add: addCustomGroup } = useCustomGroups();
  const showToast = useToastStore((s) => s.show);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // 그룹 인라인 추가 UI 상태
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

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
      group: "together",
      assignee_id: null,
      custom_group_id: null,
    },
  });

  const group = useWatch({ control, name: "group" });
  const assigneeId = useWatch({ control, name: "assignee_id" });
  const customGroupId = useWatch({ control, name: "custom_group_id" });
  const dateValue = useWatch({ control, name: "date" });

  useEffect(() => {
    if (!open) return;
    if (todo) {
      const safeGroup = todo.group as TodoFormGroup;
      reset({
        title: todo.title,
        date: todo.date ?? defaultDate,
        group: safeGroup,
        assignee_id: todo.assignee_id,
        custom_group_id: todo.custom_group_id,
      });
    } else {
      reset({
        title: "",
        date: defaultDate,
        group: "together",
        assignee_id: null,
        custom_group_id: null,
      });
    }
  }, [open, todo, defaultDate, reset]);
  // 인라인 그룹 추가 UI는 사용자의 명시적 액션(취소/완료)으로만 닫힘.
  // 시트 close 시 자동 reset은 안 함 — 사용자가 다시 열 때 같은 상태 유지.

  const onValid = async (values: FormValues) => {
    const payload: TodoFormValues = {
      title: values.title.trim(),
      date: values.date,
      group: values.group,
      assignee_id: values.group === "individual" ? values.assignee_id : null,
      custom_group_id:
        values.group === "custom" ? values.custom_group_id : null,
    };
    await onSubmit(payload);
    onClose();
  };

  const selectBaseGroup = (g: Exclude<TodoFormGroup, "custom">) => {
    setValue("group", g, { shouldValidate: true });
    setValue("custom_group_id", null);
  };
  const selectCustomGroup = (id: string) => {
    setValue("group", "custom", { shouldValidate: true });
    setValue("custom_group_id", id, { shouldValidate: true });
  };

  const submitNewGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) return;
    setCreatingGroup(true);
    try {
      const created = await addCustomGroup(trimmed);
      selectCustomGroup(created.id);
      setAddingGroup(false);
      setNewGroupName("");
    } catch (e) {
      const msg =
        (e as Error).message === ERR_GROUP_LIMIT_EXCEEDED
          ? `커스텀 그룹은 최대 ${MAX_CUSTOM_GROUPS_PER_COUPLE}개까지만 만들 수 있어요`
          : "그룹 생성에 실패했어요. 다시 시도해주세요";
      showToast(msg);
    } finally {
      setCreatingGroup(false);
    }
  };

  const canAddGroup = customGroups.length < MAX_CUSTOM_GROUPS_PER_COUPLE;

  const openDeleteConfirm = () => setConfirmOpen(true);

  const confirmDelete = async () => {
    if (!todo || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(todo.id);
      setConfirmOpen(false);
      onClose();
    } catch {
      setConfirmOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const chipBase =
    "min-h-[40px] rounded-full border px-4 text-sm font-medium transition-colors";
  const chipInactive = "bg-haru-surface text-haru-text border-haru-border";
  const chipActive = "bg-haru-primary text-haru-text border-haru-primary";

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
          <span className="text-sm font-medium text-haru-text">날짜</span>
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="min-h-[44px] w-full rounded-2xl border border-haru-border bg-haru-surface px-4 py-3 text-left text-base text-haru-text transition-colors active:border-haru-primary"
          >
            {dateValue ? formatDateNavLabel(dateValue) : "날짜 선택"}
          </button>
          {errors.date && (
            <p className="text-sm text-haru-danger">{errors.date.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-haru-text">그룹</span>
          <div className="flex flex-wrap gap-2">
            {BASE_GROUPS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => selectBaseGroup(g.value)}
                className={cn(
                  chipBase,
                  group === g.value ? chipActive : chipInactive
                )}
              >
                {g.label}
              </button>
            ))}
            {customGroups.map((cg) => (
              <button
                key={cg.id}
                type="button"
                onClick={() => selectCustomGroup(cg.id)}
                className={cn(
                  chipBase,
                  "max-w-[160px] truncate",
                  group === "custom" && customGroupId === cg.id
                    ? chipActive
                    : chipInactive
                )}
              >
                {cg.name}
              </button>
            ))}
            {!addingGroup ? (
              <button
                type="button"
                onClick={() => setAddingGroup(true)}
                disabled={!canAddGroup}
                aria-label={
                  canAddGroup
                    ? "새 그룹 추가"
                    : `최대 ${MAX_CUSTOM_GROUPS_PER_COUPLE}개까지 만들 수 있어요`
                }
                title={
                  canAddGroup
                    ? undefined
                    : `최대 ${MAX_CUSTOM_GROUPS_PER_COUPLE}개까지 만들 수 있어요`
                }
                className={cn(
                  chipBase,
                  "flex items-center gap-1 border-dashed text-haru-muted disabled:opacity-40"
                )}
              >
                <Plus className="h-4 w-4" />
                <span>새 그룹</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitNewGroup();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setAddingGroup(false);
                      setNewGroupName("");
                    }
                  }}
                  placeholder="그룹 이름"
                  maxLength={50}
                  autoFocus
                  disabled={creatingGroup}
                  className="min-h-[40px] w-32 rounded-full border border-haru-primary bg-haru-surface px-3 text-sm text-haru-text outline-none focus:ring-2 focus:ring-haru-primary-soft"
                />
                <button
                  type="button"
                  onClick={submitNewGroup}
                  disabled={creatingGroup || !newGroupName.trim()}
                  aria-label="그룹 만들기"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-haru-primary text-haru-text active:bg-haru-primary-active disabled:opacity-40"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingGroup(false);
                    setNewGroupName("");
                  }}
                  aria-label="취소"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-haru-border text-haru-muted active:bg-haru-primary-soft"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
          {errors.custom_group_id && (
            <p className="text-sm text-haru-danger">
              {errors.custom_group_id.message}
            </p>
          )}
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
                    assigneeId === me.id ? chipActive : chipInactive
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
                    assigneeId === partner.id ? chipActive : chipInactive
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

      <DatePickerSheet
        open={datePickerOpen}
        selectedDate={dateValue || defaultDate}
        onSelect={(iso) => setValue("date", iso, { shouldValidate: true })}
        onClose={() => setDatePickerOpen(false)}
      />

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
