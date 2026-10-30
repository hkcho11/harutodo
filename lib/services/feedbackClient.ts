import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/feedback-database";

// Generated against the development project after the feedback migration.
// The shared client retains its existing schema types to preserve unrelated pending changes.
export function feedbackClient(): SupabaseClient<Database> {
  return createClient() as unknown as SupabaseClient<Database>;
}
export function feedbackError(error: {
  code?: string;
  message: string;
}): Error {
  if (error.code === "40001")
    return new Error(
      "내용이 변경됐어요. 새 내용을 확인한 뒤 다시 저장해주세요",
    );
  if (error.code === "42501")
    return new Error("이 의견을 확인하거나 변경할 수 없어요");
  return new Error(
    "잠시 연결이 어려워요. 입력한 내용은 그대로 두고 다시 시도해주세요",
  );
}
