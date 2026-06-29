"use client";

import { useState, useMemo } from "react";
import { Check } from "lucide-react";
import BottomSheet from "@/components/common/BottomSheet";
import CalendarPickerSheet from "@/components/common/CalendarPickerSheet";
import { todayISO, formatDateShort } from "@/lib/utils/date";
import { useToastStore } from "@/store/useToastStore";
import { useCoupleStore } from "@/store/useCoupleStore";
import type { Todo } from "@/types/todo";

interface Props {
  open: boolean;
  onClose: () => void;
  todos: Todo[];
  loading: boolean;
  onMove: (ids: string[], targetDate: string) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
}

export default function PastIncompleteTodoSheet({
  open,
  onClose,
  todos,
  loading,
  onMove,
  onDelete,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const showToast = useToastStore((s) => s.show);
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);
  const today = todayISO();

  const groupedByDate = useMemo(() => {
    const groups: Record<string, Todo[]> = {};
    for (const todo of todos) {
      if (!todo.date) continue;
      if (!groups[todo.date]) groups[todo.date] = [];
      groups[todo.date].push(todo);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [todos]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  const handleMoveToToday = async () => {
    if (selectedIds.size === 0 || moving) return;
    const idsToMove = [...selectedIds];
    const remaining = todos.filter((t) => !idsToMove.includes(t.id));
    setMoving(true);
    try {
      await onMove(idsToMove, today);
      showToast("선택한 할 일을 오늘로 옮겼어요", "success");
      setSelectedIds(new Set());
      if (remaining.length === 0) onClose();
    } catch {
      showToast("이동에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setMoving(false);
    }
  };

  const handleMoveToDate = async (targetDate: string) => {
    if (selectedIds.size === 0 || moving) return;
    const idsToMove = [...selectedIds];
    const remaining = todos.filter((t) => !idsToMove.includes(t.id));
    setMoving(true);
    try {
      await onMove(idsToMove, targetDate);
      showToast("선택한 할 일을 선택한 날짜로 옮겼어요", "success");
      setSelectedIds(new Set());
      if (remaining.length === 0) onClose();
    } catch {
      showToast("이동에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setMoving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0 || moving) return;
    const idsToDelete = [...selectedIds];
    const remaining = todos.filter((t) => !idsToDelete.includes(t.id));
    setMoving(true);
    try {
      await onDelete(idsToDelete);
      showToast("선택한 할 일을 삭제했어요", "success");
      setSelectedIds(new Set());
      if (remaining.length === 0) onClose();
    } catch {
      showToast("삭제에 실패했어요. 잠시 후 다시 시도해주세요");
    } finally {
      setMoving(false);
    }
  };

  const getBadge = (todo: Todo) => {
    if (todo.group === "together") {
      return { label: "함께", className: "bg-haru-secondary text-haru-text" };
    }
    if (todo.assignee_id) {
      const assignee =
        todo.assignee_id === me?.id
          ? me
          : todo.assignee_id === partner?.id
          ? partner
          : null;
      if (assignee) {
        return {
          label: assignee.display_name,
          className:
            assignee.id === me?.id
              ? "bg-haru-primary-soft text-haru-text"
              : "bg-haru-accent-soft text-haru-text",
        };
      }
    }
    return null;
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={handleClose}
        title="지난 미완료 할 일"
        footer={
          <div className="space-y-3">
            <p className="text-center text-xs text-haru-muted">
              {selectedIds.size > 0
                ? `${selectedIds.size}개 선택됨`
                : "이동하거나 삭제할 할 일을 선택하세요"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleMoveToToday()}
                disabled={selectedIds.size === 0 || moving}
                className="flex-1 rounded-2xl bg-haru-primary py-3 text-sm font-semibold text-haru-text disabled:opacity-40 active:bg-haru-primary-active"
              >
                오늘로 이동
              </button>
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                disabled={selectedIds.size === 0 || moving}
                className="flex-1 rounded-2xl bg-haru-surface-soft py-3 text-sm font-semibold text-haru-text disabled:opacity-40 active:bg-haru-border"
              >
                날짜 선택 후 이동
              </button>
            </div>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={selectedIds.size === 0 || moving}
              className="w-full rounded-2xl border border-haru-danger py-3 text-sm font-semibold text-haru-danger disabled:opacity-40 active:bg-haru-danger/10"
            >
              삭제
            </button>
          </div>
        }
      >
        {loading && (
          <div className="py-10 text-center text-sm text-haru-muted">
            불러오는 중...
          </div>
        )}
        {!loading && todos.length === 0 && (
          <div className="py-10 text-center">
            <div className="mb-2 text-3xl">✅</div>
            <p className="text-sm font-semibold text-haru-text">
              지난 미완료 할 일이 없어요
            </p>
          </div>
        )}
        {!loading &&
          groupedByDate.map(([date, dateTodos]) => (
            <div key={date} className="mb-5">
              <p className="mb-2 text-xs font-semibold text-haru-muted">
                {formatDateShort(date)}
              </p>
              <div className="space-y-1.5">
                {dateTodos.map((todo) => {
                  const selected = selectedIds.has(todo.id);
                  const badge = getBadge(todo);
                  return (
                    <button
                      key={todo.id}
                      type="button"
                      onClick={() => toggleSelect(todo.id)}
                      className={`flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors ${
                        selected
                          ? "bg-haru-primary-soft"
                          : "bg-haru-surface-soft active:bg-haru-border"
                      }`}
                      aria-pressed={selected}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                          selected
                            ? "border-haru-primary-active bg-haru-primary"
                            : "border-haru-border bg-transparent"
                        }`}
                        aria-hidden="true"
                      >
                        {selected && (
                          <Check
                            className="h-3 w-3 text-haru-text"
                            strokeWidth={3}
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-haru-text">
                          {todo.title}
                        </p>
                        {todo.date && (
                          <p className="mt-0.5 text-xs text-haru-muted">
                            {formatDateShort(todo.date)}
                          </p>
                        )}
                      </div>
                      {badge && (
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
      </BottomSheet>

      <CalendarPickerSheet
        open={datePickerOpen}
        selectedDate={today}
        onSelect={(date) => void handleMoveToDate(date)}
        onClose={() => setDatePickerOpen(false)}
        minDate={today}
      />
    </>
  );
}
