"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { useTodayTodos, type TodoFormValues } from "@/hooks/useTodayTodos";
import { useToastStore } from "@/store/useToastStore";
import TodoSection from "@/components/todo/TodoSection";
import IndividualSection from "@/components/todo/IndividualSection";
import TodoSheet from "@/components/todo/TodoSheet";
import { todayISO, formatTodayLabel } from "@/lib/utils/date";
import type { Todo } from "@/types/todo";

export default function HomePage() {
  const { todos, loading, add, update, toggle, remove } = useTodayTodos();
  const showToast = useToastStore((s) => s.show);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const today = todayISO();

  const openAdd = () => {
    setEditingTodo(null);
    setSheetOpen(true);
  };
  const openEdit = (t: Todo) => {
    setEditingTodo(t);
    setSheetOpen(true);
  };
  const closeSheet = () => {
    setSheetOpen(false);
    setEditingTodo(null);
  };

  // 모든 변이 액션은 실패 시 토스트로 사용자에게 알린다.
  const handleSubmit = async (values: TodoFormValues) => {
    try {
      if (editingTodo) {
        await update(editingTodo.id, values);
      } else {
        await add(values);
      }
    } catch {
      showToast("저장에 실패했어요. 잠시 후 다시 시도해주세요");
      throw new Error("submit_failed"); // TodoSheet의 onClose 막기
    }
  };

  const handleToggle = useCallback(
    async (id: string, completed: boolean) => {
      try {
        await toggle(id, completed);
      } catch {
        showToast("변경에 실패했어요. 잠시 후 다시 시도해주세요");
      }
    },
    [toggle, showToast]
  );

  const handleRemove = async (id: string) => {
    try {
      await remove(id);
    } catch {
      showToast("삭제에 실패했어요. 잠시 후 다시 시도해주세요");
      throw new Error("delete_failed");
    }
  };

  const togetherTodos = todos.filter((t) => t.group === "together");
  const individualTodos = todos.filter((t) => t.group === "individual");
  const otherTodos = todos.filter(
    (t) => t.group === "other" || t.group === "custom"
  );

  return (
    <div className="px-4 py-6">
      <header className="mb-5">
        <p className="text-sm text-haru-muted">오늘</p>
        <h1 className="text-2xl font-bold text-haru-text">
          {formatTodayLabel()}
        </h1>
      </header>

      {loading ? (
        <p className="py-12 text-center text-sm text-haru-muted">
          불러오는 중...
        </p>
      ) : todos.length === 0 ? (
        <div className="rounded-3xl bg-haru-surface p-8 text-center shadow-card">
          <div className="mb-2 text-3xl">🌤️</div>
          <p className="text-sm text-haru-text">오늘 할 일이 없어요</p>
          <p className="mt-1 text-xs text-haru-muted">
            우하단 + 버튼으로 추가해보세요
          </p>
        </div>
      ) : (
        <>
          <TodoSection
            group="together"
            todos={togetherTodos}
            onToggle={handleToggle}
            onItemClick={openEdit}
          />
          <IndividualSection
            todos={individualTodos}
            onToggle={handleToggle}
            onItemClick={openEdit}
          />
          <TodoSection
            group="other"
            todos={otherTodos}
            onToggle={handleToggle}
            onItemClick={openEdit}
          />
        </>
      )}

      <button
        type="button"
        onClick={openAdd}
        aria-label="할 일 추가"
        className="fixed right-5 bottom-[calc(56px+1.25rem+env(safe-area-inset-bottom,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-haru-primary text-white shadow-card active:bg-haru-primary-active"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>

      <TodoSheet
        open={sheetOpen}
        todo={editingTodo}
        defaultDate={today}
        onClose={closeSheet}
        onSubmit={handleSubmit}
        onDelete={editingTodo ? handleRemove : undefined}
      />
    </div>
  );
}
