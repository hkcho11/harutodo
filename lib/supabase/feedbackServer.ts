import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/feedback-database";

export async function createFeedbackServerClient(): Promise<
  SupabaseClient<Database>
> {
  return (await createClient()) as unknown as SupabaseClient<Database>;
}
export function createFeedbackAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Feedback server configuration unavailable");
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
