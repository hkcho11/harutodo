"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import {
  subscribeCoupleTable,
  unsubscribeCouple,
} from "@/lib/services/realtimeService";
import type { Todo } from "@/types/todo";

const pad = (n: number) => String(n).padStart(2, "0");

// 해당 월에 투두가 하나라도 있는 날짜 집합(ISO string)을 반환.
// month: 0-based
export function useMonthTodoDates(year: number, month: number): Set<string> {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const [dates, setDates] = useState<Set<string>>(new Set());

  const m = month + 1;
  const first = `${year}-${pad(m)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const last = `${year}-${pad(m)}-${pad(lastDay)}`;

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const { data } = await supabase
      .from("todo_items")
      .select("date")
      .eq("couple_id", coupleId)
      .gte("date", first)
      .lte("date", last);
    const set = new Set<string>();
    data?.forEach(({ date }) => {
      if (date) set.add(date);
    });
    setDates(set);
  }, [coupleId, supabase, first, last]);

  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    supabase
      .from("todo_items")
      .select("date")
      .eq("couple_id", coupleId)
      .gte("date", first)
      .lte("date", last)
      .then(({ data }) => {
        if (cancelled) return;
        const set = new Set<string>();
        data?.forEach(({ date }) => {
          if (date) set.add(date);
        });
        setDates(set);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId, year, month, supabase, first, last]);

  // 해당 월 범위 내 투두 변경 시 즉시 refetch — 삭제/이동/추가 모두 대응
  useEffect(() => {
    if (!coupleId) return;
    const channel = subscribeCoupleTable<Todo>({
      channelName: `todo_items:couple=${coupleId}:month-dates:${year}-${month}`,
      table: "todo_items",
      coupleId,
      onChange: ({ type, new: newRow, old: oldRow }) => {
        if (type === "DELETE") {
          // oldRow fields unreliable without REPLICA IDENTITY FULL — always refetch
          const knownDate = oldRow?.date;
          if (!knownDate || (knownDate >= first && knownDate <= last)) {
            void refetch();
          }
          return;
        }
        const affectedDate = newRow?.date;
        if (affectedDate && affectedDate >= first && affectedDate <= last) {
          void refetch();
        }
      },
      onStatus: (status) => {
        if (status === "SUBSCRIBED") void refetch();
      },
    });
    return () => {
      unsubscribeCouple(channel);
    };
  }, [coupleId, year, month, refetch, first, last]);

  return dates;
}
