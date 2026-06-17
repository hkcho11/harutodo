"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCoupleStore } from "@/store/useCoupleStore";
import { monthRangeISO, gridFirstISO, gridLastISO } from "@/lib/utils/calendar";
import {
  subscribeCoupleTable,
  unsubscribeCouple,
} from "@/lib/services/realtimeService";
import { notifyPartner } from "@/lib/services/pushService";
import type { Event, EventFormValues } from "@/types/event";

// end_date 컬럼 미존재 감지:
// - 42703: PostgreSQL undefined_column (DB 직접 접근 시)
// - PGRST204: PostgREST 스키마 캐시 미존재 컬럼 (대부분의 Supabase 클라이언트 경우)
function isEndDateMissing(err: { code?: string } | null): boolean {
  return err?.code === "42703" || err?.code === "PGRST204";
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.start_time === b.start_time) return 0;
    if (a.start_time === null) return -1;
    if (b.start_time === null) return 1;
    return a.start_time < b.start_time ? -1 : 1;
  });
}

export function useMonthEvents(year: number, month: number) {
  const supabase = useMemo(() => createClient(), []);
  const coupleId = useCoupleStore((s) => s.coupleId);
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);
  const { first, last } = monthRangeISO(year, month);
  // 캘린더 그리드 실제 표시 범위 (이전 달 leading + 다음 달 trailing 포함)
  const gridFirst = useMemo(() => gridFirstISO(year, month), [year, month]);
  const gridLast = useMemo(() => gridLastISO(year, month), [year, month]);

  const [events, setEvents] = useState<Event[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  // end_date 컬럼이 있으면 월과 겹치는 이벤트(다일 포함)를 조회.
  // 컬럼이 없으면(마이그레이션 미적용) 단순 범위 쿼리로 폴백.
  const fetchEvents = useCallback(async (): Promise<Event[]> => {
    if (!coupleId) return [];

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("couple_id", coupleId)
      .lte("date", gridLast)
      .or(`end_date.gte.${gridFirst},and(end_date.is.null,date.gte.${gridFirst})`)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true });

    if (isEndDateMissing(error)) {
      const { data: fallback } = await supabase
        .from("events")
        .select("*")
        .eq("couple_id", coupleId)
        .gte("date", gridFirst)
        .lte("date", gridLast)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: true });
      return fallback ?? [];
    }

    return data ?? [];
  }, [coupleId, gridFirst, gridLast, supabase]);

  const refetch = useCallback(async () => {
    if (!coupleId) return;
    const data = await fetchEvents();
    setEvents(data);
    setFetchLoading(false);
  }, [coupleId, fetchEvents]);

  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    fetchEvents().then((data) => {
      if (cancelled) return;
      setEvents(data);
      setFetchLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [coupleId, fetchEvents]);

  // Realtime 구독. SUBSCRIBED 직후 refetch로 유실 보완.
  useEffect(() => {
    if (!coupleId) return;
    const overlapsRange = (e: Event) => {
      const end = e.end_date ?? e.date;
      return e.date <= gridLast && end >= gridFirst;
    };
    const channel = subscribeCoupleTable<Event>({
      channelName: `events:couple=${coupleId}:${gridFirst}~${gridLast}`,
      table: "events",
      coupleId,
      onChange: ({ type, new: newRow, old: oldRow }) => {
        if (type === "INSERT" && newRow && overlapsRange(newRow)) {
          setEvents((cur) =>
            cur.some((e) => e.id === newRow.id)
              ? cur
              : sortEvents([...cur, newRow])
          );
        } else if (type === "UPDATE" && newRow) {
          setEvents((cur) => {
            const has = cur.some((e) => e.id === newRow.id);
            if (overlapsRange(newRow)) {
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
  }, [coupleId, gridFirst, gridLast, refetch]);

  const loading = coupleId !== null && fetchLoading;

  const add = useCallback(
    async (input: EventFormValues) => {
      if (!coupleId || !me) throw new Error("no_couple");
      const endForRange = input.end_date ?? input.date;
      const overlaps = input.date <= last && endForRange >= first;
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const optimistic: Event = {
        id: tempId,
        couple_id: coupleId,
        created_by: me.id,
        assignee_id: input.assignee_id,
        title: input.title,
        date: input.date,
        end_date: input.end_date ?? null,
        start_time: input.start_time,
        end_time: input.end_time,
        location_name: input.location_name ?? null,
        location_address: input.location_address ?? null,
        location_latitude: input.location_latitude ?? null,
        location_longitude: input.location_longitude ?? null,
        location_provider: input.location_provider ?? null,
        location_provider_id: input.location_provider_id ?? null,
        location_url: input.location_url ?? null,
        created_at: now,
        updated_at: now,
      };
      if (overlaps) setEvents((prev) => [...prev, optimistic]);

      // location 컬럼은 마이그레이션 적용 전 환경을 위해 값이 있을 때만 포함
      const insertPayload = {
        couple_id: coupleId,
        created_by: me.id,
        assignee_id: input.assignee_id,
        title: input.title,
        date: input.date,
        end_date: input.end_date ?? null,
        start_time: input.start_time,
        end_time: input.end_time,
        ...(input.location_name != null && {
          location_name: input.location_name,
          location_address: input.location_address ?? null,
          location_latitude: input.location_latitude ?? null,
          location_longitude: input.location_longitude ?? null,
          location_provider: input.location_provider ?? null,
          location_provider_id: input.location_provider_id ?? null,
          location_url: input.location_url ?? null,
        }),
      };

      let { data, error } = await supabase
        .from("events")
        .insert(insertPayload)
        .select()
        .single();

      // end_date 컬럼 미존재 시 해당 필드 제거 후 재시도
      if (isEndDateMissing(error)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { end_date: _, ...payloadWithoutEndDate } = insertPayload;
        ({ data, error } = await supabase
          .from("events")
          .insert(payloadWithoutEndDate)
          .select()
          .single());
      }

      // location 컬럼 미존재 시 (마이그레이션 미적용) 해당 필드 제거 후 재시도
      if ((error?.code === "PGRST204" || error?.code === "42703") && "location_name" in insertPayload) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { location_name: _ln, location_address: _la, location_latitude: _lat,
                location_longitude: _lng, location_provider: _lp, location_provider_id: _lpi,
                location_url: _lu, ...payloadWithoutLocation } = insertPayload;
        ({ data, error } = await supabase
          .from("events")
          .insert(payloadWithoutLocation)
          .select()
          .single());
      }

      if (error || !data) {
        await refetch();
        throw error ?? new Error("insert_failed");
      }
      if (overlaps) {
        setEvents((prev) => {
          const withoutTemp = prev.filter((e) => e.id !== tempId);
          const next = withoutTemp.some((e) => e.id === data!.id)
            ? withoutTemp
            : [...withoutTemp, data!];
          return sortEvents(next);
        });
      }
      if (partner && me) {
        notifyPartner({
          partnerId: partner.id,
          actorName: me.display_name,
          action: "add",
          entityType: "event",
          entityTitle: input.title,
          entityDate: input.date,
          entityTime: input.start_time ?? undefined,
        }).catch((e) => console.error("[notify]", e));
      }
    },
    [coupleId, me, partner, supabase, first, last, refetch]
  );

  const update = useCallback(
    async (id: string, input: Partial<EventFormValues>) => {
      if (!coupleId) throw new Error("no_couple");
      setEvents((cur) =>
        cur.map((e) => (e.id === id ? { ...e, ...input } : e))
      );

      // location 컬럼은 마이그레이션 적용 전 환경을 위해 값이 있을 때만 포함
      const {
        location_name, location_address, location_latitude, location_longitude,
        location_provider, location_provider_id, location_url,
        ...baseInput
      } = input;
      const updatePayload = {
        ...baseInput,
        ...(location_name != null && {
          location_name,
          location_address: location_address ?? null,
          location_latitude: location_latitude ?? null,
          location_longitude: location_longitude ?? null,
          location_provider: location_provider ?? null,
          location_provider_id: location_provider_id ?? null,
          location_url: location_url ?? null,
        }),
      };

      let { error } = await supabase
        .from("events")
        .update(updatePayload)
        .eq("id", id)
        .eq("couple_id", coupleId);

      // end_date 컬럼 미존재 시 해당 필드 제거 후 재시도
      if (isEndDateMissing(error)) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { end_date: _, ...inputWithoutEndDate } = updatePayload;
        ({ error } = await supabase
          .from("events")
          .update(inputWithoutEndDate)
          .eq("id", id)
          .eq("couple_id", coupleId));
      }

      // location 컬럼 미존재 시 (마이그레이션 미적용) 해당 필드 제거 후 재시도
      if ((error?.code === "PGRST204" || error?.code === "42703") && "location_name" in updatePayload) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { location_name: _ln, location_address: _la, location_latitude: _lat,
                location_longitude: _lng, location_provider: _lp, location_provider_id: _lpi,
                location_url: _lu, ...updateWithoutLocation } = updatePayload;
        ({ error } = await supabase
          .from("events")
          .update(updateWithoutLocation)
          .eq("id", id)
          .eq("couple_id", coupleId));
      }

      if (error) {
        await refetch();
        throw error;
      }
      if (input.date) {
        const endForRange = input.end_date ?? input.date;
        if (input.date > last || endForRange < first) {
          setEvents((cur) => cur.filter((e) => e.id !== id));
        }
      }
      if (partner && me) {
        notifyPartner({
          partnerId: partner.id,
          actorName: me.display_name,
          action: "update",
          entityType: "event",
          entityTitle: typeof input.title === "string" ? input.title : undefined,
          entityDate: input.date,
          entityTime: input.start_time ?? undefined,
        }).catch((e) => console.error("[notify]", e));
      }
    },
    [coupleId, me, partner, supabase, first, last, refetch]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!coupleId) throw new Error("no_couple");
      let removed: { title: string; date: string; start_time: string | null } | undefined;
      setEvents((cur) => {
        const found = cur.find((e) => e.id === id);
        if (found) removed = { title: found.title, date: found.date, start_time: found.start_time };
        return cur.filter((e) => e.id !== id);
      });
      const { error } = await supabase
        .from("events")
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
          entityType: "event",
          entityTitle: removed?.title,
          entityDate: removed?.date,
          entityTime: removed?.start_time ?? undefined,
        }).catch((e) => console.error("[notify]", e));
      }
    },
    [coupleId, me, partner, supabase, refetch]
  );

  // 날짜별 그룹핑 — 다일 일정은 해당 월 범위 내 모든 날짜에 확장
  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const e of events) {
      if (!e.end_date) {
        if (!map[e.date]) map[e.date] = [];
        map[e.date].push(e);
      } else {
        const rangeStart = e.date > gridFirst ? e.date : gridFirst;
        const rangeEnd = e.end_date < gridLast ? e.end_date : gridLast;
        let cur = rangeStart;
        while (cur <= rangeEnd) {
          if (!map[cur]) map[cur] = [];
          map[cur].push(e);
          const d = new Date(`${cur}T00:00:00`);
          d.setDate(d.getDate() + 1);
          cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }
      }
    }
    return map;
  }, [events, gridFirst, gridLast]);

  return { events, eventsByDate, loading, refetch, add, update, remove };
}
