"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import { todayISO } from "@/lib/utils/date";
import {
  subscribeCoupleTable,
  unsubscribeCouple,
} from "@/lib/services/realtimeService";
import type { Todo } from "@/types/todo";

export function usePastIncompleteTodos() {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const today = todayISO();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from("todo_items")
      .select("*")
      .eq("couple_id", coupleId)
      .lt("date", today)
      .eq("is_completed", false)
      .order("date", { ascending: false })
      .order("created_at", { ascending: true });
    setTodos(data ?? []);
    setLoading(false);
  }, [coupleId, supabase, today]);

  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    supabase
      .from("todo_items")
      .select("*")
      .eq("couple_id", coupleId)
      .lt("date", today)
      .eq("is_completed", false)
      .order("date", { ascending: false })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setTodos(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId, supabase, today]);

  useEffect(() => {
    if (!coupleId) return;
    const isPastIncomplete = (t: Todo) =>
      t.date !== null && t.date < today && !t.is_completed;

    const channel = subscribeCoupleTable<Todo>({
      channelName: `todo_items:couple=${coupleId}:past-incomplete`,
      table: "todo_items",
      coupleId,
      onChange: ({ type, new: newRow, old: oldRow }) => {
        if (type === "INSERT" && newRow && isPastIncomplete(newRow)) {
          setTodos((cur) =>
            cur.some((t) => t.id === newRow.id) ? cur : [...cur, newRow]
          );
        } else if (type === "UPDATE" && newRow) {
          if (isPastIncomplete(newRow)) {
            setTodos((cur) => {
              const has = cur.some((t) => t.id === newRow.id);
              return has
                ? cur.map((t) => (t.id === newRow.id ? newRow : t))
                : [...cur, newRow];
            });
          } else {
            // 날짜가 오늘 이후로 이동됐거나 완료됨 → 목록에서 제거
            setTodos((cur) => cur.filter((t) => t.id !== newRow.id));
          }
        } else if (type === "DELETE" && oldRow) {
          setTodos((cur) => cur.filter((t) => t.id !== oldRow.id));
        }
      },
      onStatus: (status) => {
        if (status === "SUBSCRIBED") void refetch();
      },
    });
    return () => {
      unsubscribeCouple(channel);
    };
  }, [coupleId, today, refetch]);

  const moveTodos = useCallback(
    async (ids: string[], targetDate: string) => {
      if (!coupleId || ids.length === 0) return;
      setTodos((prev) => prev.filter((t) => !ids.includes(t.id)));
      const { error } = await supabase
        .from("todo_items")
        .update({ date: targetDate })
        .in("id", ids)
        .eq("couple_id", coupleId);
      if (error) {
        await refetch();
        throw error;
      }
    },
    [coupleId, supabase, refetch]
  );

  return { todos, count: todos.length, loading, moveTodos };
}
