"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import {
  subscribeCoupleTable,
  unsubscribeCouple,
} from "@/lib/services/realtimeService";
import { addDays } from "@/lib/utils/date";
import type { PersonalCycle, CycleFormValues, CyclePrediction, CycleRange, ShareLevel } from "@/types/cycle";

const pad = (n: number) => String(n).padStart(2, "0");

function daysBetween(startIso: string, endIso: string): number {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);
  return Math.round((end - start) / 86_400_000);
}

function estimateCycleLength(cycles: PersonalCycle[]): {
  cycleLengthDays: number;
  sampleCount: number;
  isFallback: boolean;
} {
  const starts = [...cycles]
    .map((cycle) => cycle.start_date)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const gaps: number[] = [];
  for (let i = 1; i < starts.length; i += 1) {
    const gap = daysBetween(starts[i - 1], starts[i]);
    if (gap >= 20 && gap <= 45) gaps.push(gap);
  }
  if (gaps.length === 0) {
    return { cycleLengthDays: 28, sampleCount: 0, isFallback: true };
  }

  const recentGaps = gaps.slice(-6);
  const weighted = recentGaps.reduce(
    (acc, gap, idx) => {
      const weight = idx + 1;
      return {
        total: acc.total + gap * weight,
        weight: acc.weight + weight,
      };
    },
    { total: 0, weight: 0 }
  );

  return {
    cycleLengthDays: Math.round(weighted.total / weighted.weight),
    sampleCount: recentGaps.length,
    isFallback: false,
  };
}

export function usePersonalCycles(year: number, month: number) {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const me = useCoupleStore((s) => s.me);

  const m = month + 1;
  const first = `${year}-${pad(m)}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const last = `${year}-${pad(m)}-${pad(lastDay)}`;

  const [cycles, setCycles] = useState<PersonalCycle[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!coupleId || !me) return;
    const { data } = await supabase
      .from("personal_cycles")
      .select("*")
      .eq("couple_id", coupleId)
      .lte("start_date", last)
      .order("start_date", { ascending: true });
    setCycles(data ?? []);
    setLoading(false);
  }, [coupleId, me, supabase, last]);

  // 초기 로드
  useEffect(() => {
    if (!coupleId || !me) return;
    let cancelled = false;
    supabase
      .from("personal_cycles")
      .select("*")
      .eq("couple_id", coupleId)
      .lte("start_date", last)
      .order("start_date", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setCycles(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId, me, year, month, supabase, last]);

  // Realtime
  useEffect(() => {
    if (!coupleId) return;
    const channel = subscribeCoupleTable<PersonalCycle>({
      channelName: `personal_cycles:couple=${coupleId}`,
      table: "personal_cycles",
      coupleId,
      onChange: () => { void refetch(); },
      onStatus: (status) => { if (status === "SUBSCRIBED") void refetch(); },
    });
    return () => { unsubscribeCouple(channel); };
  }, [coupleId, refetch]);

  // MonthCalendar 전달용 경량 데이터
  const cycleRanges: CycleRange[] = useMemo(
    () =>
      cycles.map((c) => ({
        id: c.id,
        start_date: c.start_date,
        end_date: c.end_date,
        share_level: c.share_level as ShareLevel,
        user_id: c.user_id,
      })),
    [cycles]
  );

  const myCycles = useMemo(
    () => cycles.filter((cycle) => cycle.user_id === me?.id),
    [cycles, me?.id]
  );

  const cyclePredictions: CyclePrediction[] = useMemo(() => {
    const cyclesByUser = new Map<string, PersonalCycle[]>();
    for (const cycle of cycles) {
      const userCycles = cyclesByUser.get(cycle.user_id) ?? [];
      userCycles.push(cycle);
      cyclesByUser.set(cycle.user_id, userCycles);
    }

    const predictions: CyclePrediction[] = [];
    for (const [userId, userCycles] of cyclesByUser) {
      if (userCycles.length === 0) continue;
      const sorted = [...userCycles].sort((a, b) =>
        a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0
      );
      const latest = sorted[sorted.length - 1];
      const { cycleLengthDays, sampleCount, isFallback } = estimateCycleLength(sorted);
      let expectedStartDate = addDays(latest.start_date, cycleLengthDays);
      while (expectedStartDate < first) {
        expectedStartDate = addDays(expectedStartDate, cycleLengthDays);
      }
      predictions.push({
        userId,
        expectedStartDate,
        ovulationDate: addDays(expectedStartDate, -14),
        cycleLengthDays,
        sampleCount,
        isFallback,
      });
    }
    return predictions;
  }, [cycles, first]);

  const cyclePrediction = useMemo(
    () => cyclePredictions.find((prediction) => prediction.userId === me?.id) ?? null,
    [cyclePredictions, me?.id]
  );

  const addCycle = useCallback(
    async (values: CycleFormValues) => {
      if (!coupleId || !me) return;
      const { error } = await supabase.from("personal_cycles").insert({
        couple_id: coupleId,
        user_id: me.id,
        start_date: values.start_date,
        end_date: values.end_date,
        symptom_tags: [],
        note: null,
        share_level: "period_only",
      });
      if (error) throw error;
    },
    [coupleId, me, supabase]
  );

  const updateCycle = useCallback(
    async (id: string, values: CycleFormValues) => {
      if (!coupleId) return;
      const { error } = await supabase
        .from("personal_cycles")
        .update({
          start_date: values.start_date,
          end_date: values.end_date,
          symptom_tags: [],
          note: null,
          share_level: "period_only",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("couple_id", coupleId);
      if (error) throw error;
    },
    [coupleId, supabase]
  );

  const deleteCycle = useCallback(
    async (id: string) => {
      if (!coupleId) return;
      const { error } = await supabase
        .from("personal_cycles")
        .delete()
        .eq("id", id)
        .eq("couple_id", coupleId);
      if (error) throw error;
    },
    [coupleId, supabase]
  );

  // 특정 날짜에 해당하는 본인 주기 반환 (CycleSheet 편집용)
  const getCycleForDate = useCallback(
    (iso: string): PersonalCycle | null => {
      return (
        myCycles.find(
          (c) =>
            c.start_date <= iso &&
            (c.end_date === null || c.end_date >= iso)
        ) ?? null
      );
    },
    [myCycles]
  );

  return {
    cycles,
    myCycles,
    cycleRanges,
    cyclePredictions,
    cyclePrediction,
    loading,
    refetch,
    addCycle,
    updateCycle,
    deleteCycle,
    getCycleForDate,
  };
}
