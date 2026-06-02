"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";

// 해당 월에 투두가 하나라도 있는 날짜 집합(ISO string)을 반환.
// month: 0-based
export function useMonthTodoDates(year: number, month: number): Set<string> {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const [dates, setDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!coupleId) return;
    const m = month + 1;
    const pad = (n: number) => String(n).padStart(2, "0");
    const first = `${year}-${pad(m)}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const last = `${year}-${pad(m)}-${pad(lastDay)}`;

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
  }, [coupleId, year, month, supabase]);

  return dates;
}
