"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import { monthRangeISO } from "@/lib/utils/calendar";
import type { Todo } from "@/types/todo";
import type { TodoFormValues } from "./useTodayTodos";

// 월 단위 투두 fetch + CRUD. useTodayTodos와 같은 낙관적 패턴.
// month는 0-based (JS Date 컨벤션).
export function useMonthTodos(year: number, month: number) {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const me = useCoupleStore((s) => s.me);
  const { first, last } = monthRangeISO(year, month);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    supabase
      .from("todo_items")
      .select("*")
      .eq("couple_id", coupleId)
      .gte("date", first)
      .lte("date", last)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setTodos(data ?? []);
        setFetchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId, first, last, supabase]);

  const loading = coupleId !== null && fetchLoading;

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from("todo_items")
      .select("*")
      .eq("couple_id", coupleId)
      .gte("date", first)
      .lte("date", last)
      .order("created_at", { ascending: true });
    setTodos(data ?? []);
    setFetchLoading(false);
  }, [coupleId, first, last, supabase]);

  const add = useCallback(
    async (input: TodoFormValues) => {
      if (!coupleId || !me) throw new Error("no_couple");
      const inRange = input.date >= first && input.date <= last;
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic: Todo = {
        id: tempId,
        couple_id: coupleId,
        created_by: me.id,
        assignee_id: input.assignee_id,
        custom_group_id: null,
        title: input.title,
        date: input.date,
        group: input.group,
        is_completed: false,
        created_at: now,
        updated_at: now,
      };
      if (inRange) {
        setTodos((prev) => [...prev, optimistic]);
      }

      const { data, error } = await supabase
        .from("todo_items")
        .insert({
          couple_id: coupleId,
          created_by: me.id,
          title: input.title,
          date: input.date,
          group: input.group,
          assignee_id: input.assignee_id,
        })
        .select()
        .single();

      if (error || !data) {
        await refetch();
        throw error ?? new Error("insert_failed");
      }
      if (inRange) {
        setTodos((prev) => prev.map((t) => (t.id === tempId ? data : t)));
      }
    },
    [coupleId, me, supabase, first, last, refetch]
  );

  const update = useCallback(
    async (
      id: string,
      input: Partial<TodoFormValues> & { is_completed?: boolean }
    ) => {
      if (!coupleId) throw new Error("no_couple");
      setTodos((cur) =>
        cur.map((t) => (t.id === id ? { ...t, ...input } : t))
      );
      const { error } = await supabase
        .from("todo_items")
        .update(input)
        .eq("id", id)
        .eq("couple_id", coupleId);
      if (error) {
        await refetch();
        throw error;
      }
      // 날짜가 현재 보고 있는 월 밖으로 이동했다면 캐시에서 제거
      if (input.date && (input.date < first || input.date > last)) {
        setTodos((cur) => cur.filter((t) => t.id !== id));
      }
    },
    [coupleId, supabase, first, last, refetch]
  );

  const toggle = useCallback(
    (id: string, isCompleted: boolean) =>
      update(id, { is_completed: isCompleted }),
    [update]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!coupleId) throw new Error("no_couple");
      setTodos((cur) => cur.filter((t) => t.id !== id));
      const { error } = await supabase
        .from("todo_items")
        .delete()
        .eq("id", id)
        .eq("couple_id", coupleId);
      if (error) {
        await refetch();
        throw error;
      }
    },
    [coupleId, supabase, refetch]
  );

  // 날짜별 그룹핑
  const todosByDate = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    for (const t of todos) {
      if (!t.date) continue;
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push(t);
    }
    return map;
  }, [todos]);

  return {
    todos,
    todosByDate,
    loading,
    refetch,
    add,
    update,
    toggle,
    remove,
  };
}
