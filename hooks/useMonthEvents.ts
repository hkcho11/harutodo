"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import { monthRangeISO } from "@/lib/utils/calendar";
import {
  subscribeCoupleTable,
  unsubscribeCouple,
} from "@/lib/services/realtimeService";
import type { Event, EventFormValues } from "@/types/event";

// 정렬 — date asc, 같은 날짜 안에서는 start_time asc (null이 먼저 = 종일).
// Realtime INSERT/UPDATE 반영 후에도 일관된 순서를 유지하기 위한 helper.
function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.start_time === b.start_time) return 0;
    if (a.start_time === null) return -1;
    if (b.start_time === null) return 1;
    return a.start_time < b.start_time ? -1 : 1;
  });
}

// 월 단위 일정 fetch + CRUD. useMonthTodos와 같은 낙관적 패턴.
export function useMonthEvents(year: number, month: number) {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const me = useCoupleStore((s) => s.me);
  const { first, last } = monthRangeISO(year, month);

  const [events, setEvents] = useState<Event[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  // 수동 재조회 — 변이 실패 복구 + Realtime SUBSCRIBED 후 유실 보완용.
  // 두 useEffect 모두 deps에 사용하므로 그 위에 정의.
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

  // Realtime — 같은 커플의 events 변경 구독. 보고 있는 월 범위만 반영.
  // SUBSCRIBED 직후 refetch로 fetch~subscribe 사이 유실 보완.
  useEffect(() => {
    if (!coupleId) return;
    const inRange = (date: string) => date >= first && date <= last;
    const channel = subscribeCoupleTable<Event>({
      channelName: `events:couple=${coupleId}:${first}~${last}`,
      table: "events",
      coupleId,
      onChange: ({ type, new: newRow, old: oldRow }) => {
        if (type === "INSERT" && newRow && inRange(newRow.date)) {
          setEvents((cur) =>
            cur.some((e) => e.id === newRow.id)
              ? cur
              : sortEvents([...cur, newRow])
          );
        } else if (type === "UPDATE" && newRow) {
          setEvents((cur) => {
            const has = cur.some((e) => e.id === newRow.id);
            if (inRange(newRow.date)) {
              const merged = has
                ? cur.map((e) => (e.id === newRow.id ? newRow : e))
                : [...cur, newRow];
              return sortEvents(merged);
            }
            return has ? cur.filter((e) => e.id !== newRow.id) : cur;
          });
        } else if (type === "DELETE" && oldRow) {
          setEvents((cur) => cur.filter((e) => e.id !== oldRow.id));
        }
      },
      onStatus: (status) => {
        if (status === "SUBSCRIBED") {
          void refetch();
        }
      },
    });
    return () => {
      unsubscribeCouple(channel);
    };
  }, [coupleId, first, last, refetch]);

  const loading = coupleId !== null && fetchLoading;

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
        // Realtime INSERT가 먼저 도착해 real id가 이미 있는 경우 temp만 제거.
        setEvents((prev) => {
          const withoutTemp = prev.filter((e) => e.id !== tempId);
          const next = withoutTemp.some((e) => e.id === data.id)
            ? withoutTemp
            : [...withoutTemp, data];
          return sortEvents(next);
        });
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
