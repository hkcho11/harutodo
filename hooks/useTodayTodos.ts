"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import { todayISO } from "@/lib/utils/date";
import type { Todo } from "@/types/todo";

export type TodoFormGroup = "together" | "individual" | "other";

export interface TodoFormValues {
  title: string;
  date: string;
  group: TodoFormGroup;
  assignee_id: string | null;
}

// 오늘 날짜 + 현재 커플 기준 투두 CRUD.
// 낙관적 업데이트: 토글/추가/삭제는 즉시 UI 반영, 실패 시 refetch로 복구 + throw.
// 호출자가 throw를 catch해서 토스트 등 사용자 피드백을 띄운다.
export function useTodayTodos() {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const me = useCoupleStore((s) => s.me);
  const today = todayISO();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  // 초기 로드: 취소 가드 + Promise 콜백 (effect 동기 setState 회피)
  // CoupleProvider가 render-phase에 store를 hydrate하므로 첫 effect에서 coupleId가 이미 채워져 있다.
  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    supabase
      .from("todo_items")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("date", today)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setTodos(data ?? []);
        setFetchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId, today, supabase]);

  // coupleId 자체가 없는 비정상 케이스(레이아웃 게이트 통과 못 한 경우)에는
  // 로딩이 영구 true가 되지 않도록 derived로 짤라낸다.
  const loading = coupleId !== null && fetchLoading;

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from("todo_items")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("date", today)
      .order("created_at", { ascending: true });
    setTodos(data ?? []);
    setFetchLoading(false);
  }, [coupleId, today, supabase]);

  const add = useCallback(
    async (input: TodoFormValues) => {
      if (!coupleId || !me) throw new Error("no_couple");
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
      if (input.date === today) {
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
      if (input.date === today) {
        setTodos((prev) => prev.map((t) => (t.id === tempId ? data : t)));
      }
    },
    [coupleId, me, supabase, today, refetch]
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
      // RLS에 더해 클라이언트도 현재 커플 범위로 명시 — 방어적 가드
      const { error } = await supabase
        .from("todo_items")
        .update(input)
        .eq("id", id)
        .eq("couple_id", coupleId);
      if (error) {
        await refetch();
        throw error;
      }
      if (input.date && input.date !== today) {
        setTodos((cur) => cur.filter((t) => t.id !== id));
      }
    },
    [coupleId, supabase, today, refetch]
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

  return { todos, loading, refetch, add, update, toggle, remove };
}
