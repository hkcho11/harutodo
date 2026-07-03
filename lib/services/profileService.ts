import { createClient } from "@/lib/supabase/client";

export async function updateProfile(
  userId: string,
  data: { display_name?: string; avatar_color?: string; cycle_enabled?: boolean }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);
  if (error) throw error;
}
