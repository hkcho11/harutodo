import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type RealtimeTable = "todo_items" | "events" | "custom_groups";

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

// Supabase Realtime의 채널 상태.
// - SUBSCRIBED: 구독 성공 → 호출 측에서 refetch로 fetch~subscribe 사이 유실 보완
// - CHANNEL_ERROR / TIMED_OUT / CLOSED: 비정상 — console.warn + onStatus 통지
export type RealtimeStatus =
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "TIMED_OUT"
  | "CLOSED";

export interface RealtimeChange<TRow> {
  type: RealtimeEventType;
  // INSERT/UPDATE: 전체 row.
  // DELETE: 마이그레이션 20260529000001에서 REPLICA IDENTITY를 FULL로 변경했으므로
  //   `old`에도 전체 row가 노출된다(RLS 평가에 필수). 호출 측은 id만 사용해 멱등
  //   처리하면 충분하지만, 필요 시 다른 필드도 안전하게 참조 가능.
  new: TRow | null;
  old: TRow | null;
}

interface SubscribeArgs<TRow> {
  channelName: string;
  table: RealtimeTable;
  coupleId: string;
  onChange: (event: RealtimeChange<TRow>) => void;
  /**
   * 채널 상태 콜백.
   * - "SUBSCRIBED" 직후 호출 측이 refetch를 한 번 더 수행해야 fetch~subscribe
   *   사이의 변경 유실을 막을 수 있다.
   * - 에러 상태(CHANNEL_ERROR/TIMED_OUT/CLOSED)는 service에서 console.warn을
   *   자동으로 남기며, 호출 측은 필요 시 fallback(예: refetch 재시도, UI 표시)을
   *   추가로 수행한다.
   */
  onStatus?: (status: RealtimeStatus) => void;
}

/**
 * 커플 범위 테이블의 INSERT/UPDATE/DELETE를 구독한다.
 *
 * - 채널은 호출 측이 cleanup에서 `unsubscribeCouple`로 정리해야 한다.
 * - 본인의 mutation으로 같은 row가 다시 들어와도 onChange는 호출된다 — 호출 측에서
 *   id 기반 멱등 처리(중복 무시 / 매칭 merge / id로 filter)를 해야 한다.
 * - 동일 데이터를 보는 hook이 여러 컴포넌트에 동시 마운트되어도(예: HomePage +
 *   TodoSheet이 둘 다 `useCustomGroups`를 호출) 채널 인스턴스가 충돌하지 않도록
 *   `channelName`에 unique suffix를 자동으로 붙여 supabase 내부 채널을 분리한다.
 */
export function subscribeCoupleTable<TRow>(
  args: SubscribeArgs<TRow>
): RealtimeChannel {
  const supabase = createClient();
  const uniqueChannelName = `${args.channelName}:${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const channel = supabase
    .channel(uniqueChannelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: args.table,
        filter: `couple_id=eq.${args.coupleId}`,
      },
      (payload) => {
        args.onChange({
          type: payload.eventType as RealtimeEventType,
          new: (payload.new ?? null) as TRow | null,
          old: (payload.old ?? null) as TRow | null,
        });
      }
    )
    .subscribe((status, err) => {
      const typed = status as RealtimeStatus;
      if (
        typed === "CHANNEL_ERROR" ||
        typed === "TIMED_OUT" ||
        typed === "CLOSED"
      ) {
        console.warn(
          `[realtime] channel ${args.channelName} status=${typed}`,
          err
        );
      }
      args.onStatus?.(typed);
    });
  return channel;
}

export function unsubscribeCouple(channel: RealtimeChannel): void {
  const supabase = createClient();
  supabase.removeChannel(channel);
}
