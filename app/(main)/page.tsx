"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { useTodayTodos, type TodoFormValues } from "@/hooks/useTodayTodos";
import { useCustomGroups } from "@/hooks/useCustomGroups";
import { useToastStore } from "@/store/useToastStore";
import TodoSection from "@/components/todo/TodoSection";
import IndividualSection from "@/components/todo/IndividualSection";
import TodoSheet from "@/components/todo/TodoSheet";
import { todayISO, formatTodayLabel } from "@/lib/utils/date";
import type { Todo } from "@/types/todo";

export default function HomePage() {
  const { todos, loading, add, update, toggle, remove } = useTodayTodos();
  const { groups: customGroups } = useCustomGroups();
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

  const handleSubmit = async (values: TodoFormValues) => {
    try {
      if (editingTodo) {
        await update(editingTodo.id, values);
      } else {
        await add(values);
      }
    } catch {
      showToast("저장에 실패했어요. 잠시 후 다시 시도해주세요");
      throw new Error("submit_failed");
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
  // "그 외" — group=other + (group=custom이지만 그룹이 삭제됐거나 매칭되는 그룹이 없는 todo)
  const customGroupIds = new Set(customGroups.map((g) => g.id));
  const otherTodos = todos.filter(
    (t) =>
      t.group === "other" ||
      (t.group === "custom" &&
        (!t.custom_group_id || !customGroupIds.has(t.custom_group_id)))
  );
  // 커스텀 그룹별 분류
  const customGroupTodos = customGroups.map((g) => ({
    group: g,
    todos: todos.filter(
      (t) => t.group === "custom" && t.custom_group_id === g.id
    ),
  }));

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
          {customGroupTodos.map(({ group, todos: gTodos }) => (
            <TodoSection
              key={group.id}
              label={group.name}
              todos={gTodos}
              onToggle={handleToggle}
              onItemClick={openEdit}
            />
          ))}
        </>
      )}

      <button
        type="button"
        onClick={openAdd}
        aria-label="할 일 추가"
        className="fixed right-5 bottom-[calc(56px+1.25rem+env(safe-area-inset-bottom,0px))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-haru-primary text-haru-text shadow-card active:bg-haru-primary-active"
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
