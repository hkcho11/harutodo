"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import { monthRangeISO } from "@/lib/utils/calendar";
import type { Event, EventFormValues } from "@/types/event";

// 월 단위 일정 fetch + CRUD. useMonthTodos와 같은 낙관적 패턴.
export function useMonthEvents(year: number, month: number) {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const me = useCoupleStore((s) => s.me);
  const { first, last } = monthRangeISO(year, month);

  const [events, setEvents] = useState<Event[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    supabase
      .from("events")
      .select("*")
      .eq("couple_id", coupleId)
      .gte("date", first)
      .lte("date", last)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true })
      .then(({ data }) => {
        if (cancelled) return;
        setEvents(data ?? []);
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
      .from("events")
      .select("*")
      .eq("couple_id", coupleId)
      .gte("date", first)
      .lte("date", last)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true });
    setEvents(data ?? []);
    setFetchLoading(false);
  }, [coupleId, first, last, supabase]);

  const add = useCallback(
    async (input: EventFormValues) => {
      if (!coupleId || !me) throw new Error("no_couple");
      const inRange = input.date >= first && input.date <= last;
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic: Event = {
        id: tempId,
        couple_id: coupleId,
        created_by: me.id,
        assignee_id: input.assignee_id,
        title: input.title,
        date: input.date,
        start_time: input.start_time,
        end_time: input.end_time,
        created_at: now,
        updated_at: now,
      };
      if (inRange) {
        setEvents((prev) => [...prev, optimistic]);
      }

      const { data, error } = await supabase
        .from("events")
        .insert({
          couple_id: coupleId,
          created_by: me.id,
          assignee_id: input.assignee_id,
          title: input.title,
          date: input.date,
          start_time: input.start_time,
          end_time: input.end_time,
        })
        .select()
        .single();

      if (error || !data) {
        await refetch();
        throw error ?? new Error("insert_failed");
      }
      if (inRange) {
        setEvents((prev) => prev.map((e) => (e.id === tempId ? data : e)));
      }
    },
    [coupleId, me, supabase, first, last, refetch]
  );

  const update = useCallback(
    async (id: string, input: Partial<EventFormValues>) => {
      if (!coupleId) throw new Error("no_couple");
      setEvents((cur) =>
        cur.map((e) => (e.id === id ? { ...e, ...input } : e))
      );
      const { error } = await supabase
        .from("events")
        .update(input)
        .eq("id", id)
        .eq("couple_id", coupleId);
      if (error) {
        await refetch();
        throw error;
      }
      if (input.date && (input.date < first || input.date > last)) {
        setEvents((cur) => cur.filter((e) => e.id !== id));
      }
    },
    [coupleId, supabase, first, last, refetch]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!coupleId) throw new Error("no_couple");
      setEvents((cur) => cur.filter((e) => e.id !== id));
      const { error } = await supabase
        .from("events")
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

  // 날짜별 그룹핑 (정렬은 fetch 단계에서 이미 처리)
  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const e of events) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [events]);

  return { events, eventsByDate, loading, refetch, add, update, remove };
}
