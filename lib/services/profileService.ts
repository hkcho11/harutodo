import { createClient } from "@/lib/supabase/client";

export async function updateProfile(
  userId: string,
  data: { display_name: string }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", userId);
  if (error) throw error;
}
