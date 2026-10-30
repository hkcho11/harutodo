import "server-only";
import { redirect } from "next/navigation";
import { createFeedbackServerClient } from "@/lib/supabase/feedbackServer";
import { createClient } from "@/lib/supabase/server";

export async function requireFeedbackAccess(
  admin = false,
): Promise<{ coupled: boolean }> {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");
  if (admin) {
    const { data, error } = await (
      await createFeedbackServerClient()
    ).rpc("is_feedback_admin");
    if (error || !data) redirect("/feedback");
  }
  const { data } = await client
    .from("couples")
    .select("id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .maybeSingle();
  return { coupled: !!data };
}
