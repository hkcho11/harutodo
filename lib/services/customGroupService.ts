import { createClient } from "@/lib/supabase/client";
import type { CustomGroup } from "@/types/todo";

// 도메인 타입은 점진적으로 `types/domain/`으로 이관 예정.
// 현재는 schema row를 그대로 alias로 사용(`CustomGroup = Tables<"custom_groups">`).

// 커플당 커스텀 그룹 최대 개수.
// UI는 미리 차단하지만, race condition(양쪽 멤버 동시 추가) 방어를 위해
// service에서도 insert 직전에 count로 재검증한다.
export const MAX_CUSTOM_GROUPS_PER_COUPLE = 5;

// 에러 코드 — UI에서 한글 매핑.
export const ERR_GROUP_LIMIT_EXCEEDED = "group_limit_exceeded";

export async function listCustomGroups(
  coupleId: string
): Promise<CustomGroup[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("custom_groups")
    .select("*")
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function insertCustomGroup(args: {
  coupleId: string;
  createdBy: string;
  name: string;
}): Promise<CustomGroup> {
  const supabase = createClient();

  // 개수 한도 재검증 (UI 차단과 별개로 race condition 방어)
  const { count, error: countError } = await supabase
    .from("custom_groups")
    .select("*", { count: "exact", head: true })
    .eq("couple_id", args.coupleId);
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_CUSTOM_GROUPS_PER_COUPLE) {
    throw new Error(ERR_GROUP_LIMIT_EXCEEDED);
  }

  const { data, error } = await supabase
    .from("custom_groups")
    .insert({
      couple_id: args.coupleId,
      created_by: args.createdBy,
      name: args.name,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error("insert_failed");
  return data;
}

/**
 * 커스텀 그룹을 삭제하기 전에, 그룹에 속한 todo_items를 'other'로 정리한다.
 *
 * FK의 `ON DELETE SET NULL`만으로는 `group='custom'`이 남아 TodoSheet 편집
 * 검증과 충돌할 수 있다. (zod schema가 group='custom'이면 custom_group_id를 요구)
 *
 * 트랜잭션 RPC는 아니지만, RLS가 같은 커플 범위로 묶여 있어 두 작업이 모두
 * 같은 사용자 컨텍스트에서 수행된다.
 */
export async function removeCustomGroup(args: {
  id: string;
  coupleId: string;
}): Promise<void> {
  const supabase = createClient();

  // 1) 해당 그룹의 todo_items를 '그 외'로 정리
  const { error: updateError } = await supabase
    .from("todo_items")
    .update({ group: "other", custom_group_id: null })
    .eq("custom_group_id", args.id)
    .eq("couple_id", args.coupleId);
  if (updateError) throw updateError;

  // 2) 그룹 자체 삭제
  const { error: deleteError } = await supabase
    .from("custom_groups")
    .delete()
    .eq("id", args.id)
    .eq("couple_id", args.coupleId);
  if (deleteError) throw deleteError;
}
