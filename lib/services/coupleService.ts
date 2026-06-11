import { createClient } from "@/lib/supabase/client";

export async function disconnectCouple(coupleId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("couples")
    .delete()
    .eq("id", coupleId);
  if (error) throw error;
}
