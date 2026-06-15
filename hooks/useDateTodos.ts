"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import {
  subscribeCoupleTable,
  unsubscribeCouple,
} from "@/lib/services/realtimeService";
import { notifyPartner } from "@/lib/services/pushService";
import type { Todo } from "@/types/todo";

// useTodayTodos와 타입을 공유 — TodoSheet 등 기존 import를 유지한다.
export type { TodoFormValues, TodoFormGroup } from "@/hooks/useTodayTodos";
import type { TodoFormValues } from "@/hooks/useTodayTodos";

// useTodayTodos의 날짜 파라미터 버전.
// date가 바뀌면 즉시 refetch + Realtime 채널을 재구독한다.
export function useDateTodos(date: string) {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from("todo_items")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("date", date)
      .order("created_at", { ascending: true });
    setTodos(data ?? []);
    setFetchLoading(false);
  }, [coupleId, date, supabase]);

  // 날짜 변경 시 기존 목록 초기화 후 재조회
  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTodos([]);
    setFetchLoading(true);
    supabase
      .from("todo_items")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("date", date)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setTodos(data ?? []);
        setFetchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId, date, supabase]);

  // 날짜별 Realtime 채널 구독
  useEffect(() => {
    if (!coupleId) return;
    const channel = subscribeCoupleTable<Todo>({
      channelName: `todo_items:couple=${coupleId}:date=${date}`,
      table: "todo_items",
      coupleId,
      onChange: ({ type, new: newRow, old: oldRow }) => {
        if (type === "INSERT" && newRow && newRow.date === date) {
          setTodos((cur) =>
            cur.some((t) => t.id === newRow.id) ? cur : [...cur, newRow]
          );
        } else if (type === "UPDATE" && newRow) {
          setTodos((cur) => {
            const has = cur.some((t) => t.id === newRow.id);
            if (newRow.date === date) {
              return has
                ? cur.map((t) => (t.id === newRow.id ? newRow : t))
                : [...cur, newRow];
            }
            return has ? cur.filter((t) => t.id !== newRow.id) : cur;
          });
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
  }, [coupleId, date, refetch]);

  const loading = coupleId !== null && fetchLoading;

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
        custom_group_id: input.custom_group_id,
        title: input.title,
        date: input.date,
        group: input.group,
        is_completed: false,
        created_at: now,
        updated_at: now,
      };
      if (input.date === date) {
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
          custom_group_id: input.custom_group_id,
        })
        .select()
        .single();

      if (error || !data) {
        await refetch();
        throw error ?? new Error("insert_failed");
      }
      if (input.date === date) {
        setTodos((prev) => {
          const withoutTemp = prev.filter((t) => t.id !== tempId);
          return withoutTemp.some((t) => t.id === data.id)
            ? withoutTemp
            : [...withoutTemp, data];
        });
      }
      if (partner && me) {
        notifyPartner({
          partnerId: partner.id,
          actorName: me.display_name,
          action: "add",
          entityType: "todo",
          entityTitle: input.title,
        }).catch((e) => console.error("[notify]", e));
      }
    },
    [coupleId, me, partner, supabase, date, refetch]
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
      if (input.date && input.date !== date) {
        setTodos((cur) => cur.filter((t) => t.id !== id));
      }
      if (partner && me && input.is_completed === undefined) {
        notifyPartner({
          partnerId: partner.id,
          actorName: me.display_name,
          action: "update",
          entityType: "todo",
          entityTitle: typeof input.title === "string" ? input.title : undefined,
        }).catch((e) => console.error("[notify]", e));
      }
    },
    [coupleId, me, partner, supabase, date, refetch]
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
      if (partner && me) {
        notifyPartner({
          partnerId: partner.id,
          actorName: me.display_name,
          action: "delete",
          entityType: "todo",
        }).catch((e) => console.error("[notify]", e));
      }
    },
    [coupleId, me, partner, supabase, refetch]
  );

  return { todos, loading, refetch, add, update, toggle, remove };
}
