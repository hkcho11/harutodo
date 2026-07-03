"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import {
  subscribeCoupleTable,
  unsubscribeCouple,
} from "@/lib/services/realtimeService";
import type { PersonalCycle, CycleFormValues, CycleRange, ShareLevel } from "@/types/cycle";

const pad = (n: number) => String(n).padStart(2, "0");

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
      .eq("user_id", me.id)
      .lte("start_date", last)
      .or(`end_date.gte.${first},end_date.is.null`)
      .order("start_date", { ascending: true });
    setCycles(data ?? []);
    setLoading(false);
  }, [coupleId, me, supabase, first, last]);

  // 초기 로드
  useEffect(() => {
    if (!coupleId || !me) return;
    let cancelled = false;
    supabase
      .from("personal_cycles")
      .select("*")
      .eq("couple_id", coupleId)
      .eq("user_id", me.id)
      .lte("start_date", last)
      .or(`end_date.gte.${first},end_date.is.null`)
      .order("start_date", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setCycles(data ?? []);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId, me?.id, year, month, supabase, first, last]);

  // Realtime
  useEffect(() => {
    if (!coupleId) return;
    const channel = subscribeCoupleTable<PersonalCycle>({
      channelName: `personal_cycles:couple=${coupleId}:${year}-${month}`,
      table: "personal_cycles",
      coupleId,
      onChange: () => { void refetch(); },
      onStatus: (status) => { if (status === "SUBSCRIBED") void refetch(); },
    });
    return () => { unsubscribeCouple(channel); };
  }, [coupleId, year, month, refetch]);

  // MonthCalendar 전달용 경량 데이터
  const cycleRanges: CycleRange[] = useMemo(
    () =>
      cycles.map((c) => ({
        id: c.id,
        start_date: c.start_date,
        end_date: c.end_date,
        share_level: c.share_level as ShareLevel,
      })),
    [cycles]
  );

  const addCycle = useCallback(
    async (values: CycleFormValues) => {
      if (!coupleId || !me) return;
      const { error } = await supabase.from("personal_cycles").insert({
        couple_id: coupleId,
        user_id: me.id,
        start_date: values.start_date,
        end_date: values.end_date,
        symptom_tags: values.symptom_tags,
        note: values.note || null,
        share_level: values.share_level,
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
          symptom_tags: values.symptom_tags,
          note: values.note || null,
          share_level: values.share_level,
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
        cycles.find(
          (c) =>
            c.start_date <= iso &&
            (c.end_date === null || c.end_date >= iso)
        ) ?? null
      );
    },
    [cycles]
  );

  return {
    cycles,
    cycleRanges,
    loading,
    refetch,
    addCycle,
    updateCycle,
    deleteCycle,
    getCycleForDate,
  };
}
