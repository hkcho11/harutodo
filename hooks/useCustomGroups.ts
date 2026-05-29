"use client";

import { useCallback, useEffect, useState } from "react";
import { useCoupleStore } from "@/store/useCoupleStore";
import {
  listCustomGroups,
  insertCustomGroup,
  removeCustomGroup,
} from "@/lib/services/customGroupService";
import {
  subscribeCoupleTable,
  unsubscribeCouple,
} from "@/lib/services/realtimeService";
import type { CustomGroup } from "@/types/todo";

// 현재 커플의 커스텀 그룹 fetch + CRUD. service 계층을 호출하는 얇은 adapter.
// 실패 시 error 상태를 노출 — 호출 측에서 빈 목록과 구분해 표시한다.
export function useCustomGroups() {
  const coupleId = useCoupleStore((s) => s.coupleId);
  const me = useCoupleStore((s) => s.me);

  const [groups, setGroups] = useState<CustomGroup[]>([]);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 수동 재조회 — 변이 실패 복구 + Realtime SUBSCRIBED 후 유실 보완용.
  const refetch = useCallback(async () => {
    if (!coupleId) return;
    try {
      const data = await listCustomGroups(coupleId);
      setGroups(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message ?? "load_failed");
    } finally {
      setFetchLoading(false);
    }
  }, [coupleId]);

  useEffect(() => {
    if (!coupleId) return;
    let cancelled = false;
    listCustomGroups(coupleId)
      .then((data) => {
        if (cancelled) return;
        setGroups(data);
        setError(null);
        setFetchLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError((e as Error).message ?? "load_failed");
        setFetchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coupleId]);

  // Realtime — 같은 커플의 custom_groups 변경 구독.
  // SUBSCRIBED 직후 refetch로 fetch~subscribe 사이 유실 보완.
  useEffect(() => {
    if (!coupleId) return;
    const channel = subscribeCoupleTable<CustomGroup>({
      channelName: `custom_groups:couple=${coupleId}`,
      table: "custom_groups",
      coupleId,
      onChange: ({ type, new: newRow, old: oldRow }) => {
        if (type === "INSERT" && newRow) {
          setGroups((cur) =>
            cur.some((g) => g.id === newRow.id) ? cur : [...cur, newRow]
          );
        } else if (type === "UPDATE" && newRow) {
          setGroups((cur) =>
            cur.map((g) => (g.id === newRow.id ? newRow : g))
          );
        } else if (type === "DELETE" && oldRow) {
          setGroups((cur) => cur.filter((g) => g.id !== oldRow.id));
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
  }, [coupleId, refetch]);

  const loading = coupleId !== null && fetchLoading;

  const add = useCallback(
    async (name: string): Promise<CustomGroup> => {
      if (!coupleId || !me) throw new Error("no_couple");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("empty_name");

      const created = await insertCustomGroup({
        coupleId,
        createdBy: me.id,
        name: trimmed,
      });
      // Realtime INSERT가 먼저 도착해 이미 있는 경우 중복 append 방지.
      setGroups((prev) =>
        prev.some((g) => g.id === created.id) ? prev : [...prev, created]
      );
      return created;
    },
    [coupleId, me]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!coupleId) throw new Error("no_couple");
      setGroups((cur) => cur.filter((g) => g.id !== id));
      try {
        await removeCustomGroup({ id, coupleId });
      } catch (e) {
        await refetch();
        throw e;
      }
    },
    [coupleId, refetch]
  );

  return { groups, loading, error, refetch, add, remove };
}
