"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useDateTodos, type TodoFormValues } from "@/hooks/useDateTodos";
import { useCustomGroups } from "@/hooks/useCustomGroups";
import { usePastIncompleteTodos } from "@/hooks/usePastIncompleteTodos";
import { useToastStore } from "@/store/useToastStore";
import { useCoupleStore } from "@/store/useCoupleStore";
import { trackEvent } from "@/lib/services/analyticsService";
import TodoSection from "@/components/todo/TodoSection";
import IndividualSection from "@/components/todo/IndividualSection";
import TodoSheet from "@/components/todo/TodoSheet";
import PastIncompleteTodoSheet from "@/components/todo/PastIncompleteTodoSheet";
import { todayISO, addDays, formatDateNavLabel } from "@/lib/utils/date";
import CalendarPickerSheet from "@/components/common/CalendarPickerSheet";
import LoadingScreen from "@/components/common/LoadingScreen";
import PushBanner from "@/components/common/PushBanner";
import type { Todo } from "@/types/todo";

export default function HomePage() {
  const todayStr = todayISO();
  const [selectedDate, setSelectedDate] = useState(() => {
    if (typeof window !== "undefined") {
      const d = new URLSearchParams(window.location.search).get("date");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    }
    return todayISO();
  });
  const me = useCoupleStore((s) => s.me);

  // Push 날짜 파라미터 정리 — 한 번만 실행
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("date") && params.get("source") !== "push") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("date");
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    if (!me?.id) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") !== "push") return;
    const notificationId = params.get("notification_id");
    const type = params.get("type");
    if (notificationId && type) {
      void trackEvent(me.id, "push_clicked", { notification_id: notificationId, type, source: "push" });
      const url = new URL(window.location.href);
      url.searchParams.delete("source");
      url.searchParams.delete("notification_id");
      url.searchParams.delete("type");
      window.history.replaceState({}, "", url.toString());
    }
  }, [me?.id]);

  const { todos, loading, add, update, toggle, remove, refetch } =
    useDateTodos(selectedDate);
  const { groups: customGroups } = useCustomGroups();
  const {
    todos: pastTodos,
    count: pastCount,
    loading: pastLoading,
    moveTodos,
    deleteTodos,
  } = usePastIncompleteTodos();
  const showToast = useToastStore((s) => s.show);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pastSheetOpen, setPastSheetOpen] = useState(false);

  const isToday = selectedDate === todayStr;

  const goPrev = () => setSelectedDate((d) => addDays(d, -1));
  const goNext = () => setSelectedDate((d) => addDays(d, 1));
  const goToday = () => setSelectedDate(todayStr);

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

  const handleMove = useCallback(
    async (ids: string[], targetDate: string) => {
      await moveTodos(ids, targetDate);
      if (targetDate === selectedDate) {
        await refetch();
      }
    },
    [moveTodos, refetch, selectedDate]
  );

  const togetherTodos = todos.filter((t) => t.group === "together");
  const individualTodos = todos.filter((t) => t.group === "individual");
  const customGroupIds = new Set(customGroups.map((g) => g.id));
  const otherTodos = todos.filter(
    (t) =>
      t.group === "other" ||
      (t.group === "custom" &&
        (!t.custom_group_id || !customGroupIds.has(t.custom_group_id)))
  );
  const customGroupTodos = customGroups.map((g) => ({
    group: g,
    todos: todos.filter(
      (t) => t.group === "custom" && t.custom_group_id === g.id
    ),
  }));

  const completedCount = todos.filter((t) => t.is_completed).length;
  const allDone = todos.length > 0 && completedCount === todos.length;

  const swipeStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (swipeStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="pb-28" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <PushBanner />
      <div className="px-4 py-6">
      {/* 날짜 네비게이션 */}
      <header className="mb-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full text-haru-muted active:bg-haru-primary-soft"
            aria-label="이전 날"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-2xl px-4 py-1 active:bg-haru-primary-soft"
              aria-label="날짜 선택"
            >
              <h1 className="text-xl font-bold text-haru-text">
                {formatDateNavLabel(selectedDate)}
              </h1>
            </button>
            <p className="-mt-1 mb-1 text-xs text-haru-muted">탭하면 날짜를 선택할 수 있어요</p>
            {isToday ? (
              <span className="rounded-full bg-haru-primary px-3 py-0.5 text-xs font-semibold text-haru-text">
                오늘
              </span>
            ) : (
              <button
                type="button"
                onClick={goToday}
                className="rounded-full bg-haru-primary-soft px-3 py-0.5 text-xs font-semibold text-haru-text active:bg-haru-primary"
              >
                오늘로
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="flex h-10 w-10 items-center justify-center rounded-full text-haru-muted active:bg-haru-primary-soft"
            aria-label="다음 날"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 진행 요약 바 */}
      {!loading && todos.length > 0 && (
        <div className="mb-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-haru-border">
            <div
              className="h-full rounded-full bg-haru-primary transition-all duration-500"
              style={{
                width: `${Math.round((completedCount / todos.length) * 100)}%`,
              }}
            />
          </div>
          <span className="shrink-0 tabular-nums text-xs text-haru-muted">
            {completedCount} / {todos.length}
          </span>
        </div>
      )}

      {/* 모두 완료 배너 */}
      {!loading && allDone && (
        <div className="mb-5 rounded-2xl bg-haru-primary px-5 py-3 text-center">
          <p className="text-sm font-semibold text-haru-text">
            오늘 할 일을 모두 완료했어요 🎉
          </p>
        </div>
      )}

      {/* 지난 미완료 진입점 */}
      {!pastLoading && pastCount > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-haru-surface px-4 py-3 shadow-card">
          <p className="text-sm text-haru-muted">
            지난 미완료 할 일{" "}
            <span className="font-semibold text-haru-text">{pastCount}개</span>
          </p>
          <button
            type="button"
            onClick={() => setPastSheetOpen(true)}
            className="rounded-full bg-haru-primary-soft px-3 py-1.5 text-xs font-semibold text-haru-text active:bg-haru-primary"
          >
            정리하기
          </button>
        </div>
      )}

      {todos.length === 0 ? (
        <div className="rounded-3xl bg-haru-surface p-8 text-center shadow-card">
          <div className="mb-2 text-3xl">🌤️</div>
          <p className="text-sm font-semibold text-haru-text">할 일이 없어요</p>
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
        defaultDate={selectedDate}
        onClose={closeSheet}
        onSubmit={handleSubmit}
        onDelete={editingTodo ? handleRemove : undefined}
      />

      <CalendarPickerSheet
        open={pickerOpen}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        onClose={() => setPickerOpen(false)}
      />

      <PastIncompleteTodoSheet
        open={pastSheetOpen}
        onClose={() => setPastSheetOpen(false)}
        todos={pastTodos}
        loading={pastLoading}
        onMove={handleMove}
        onDelete={deleteTodos}
      />
      </div>
    </div>
  );
}
