import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyCronRequest } from "../_shared/verifyCronRequest.ts";

Deno.serve(async (request) => {
  const denied = verifyCronRequest(request);
  if (denied) return denied;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: rows, error } = await client.rpc(
    "claim_feedback_attachment_cleanup",
  );
  if (error)
    return new Response(JSON.stringify({ error: "cleanup_lookup_failed" }), {
      status: 500,
    });
  let removed = 0;
  for (const row of rows ?? []) {
    const { error: storageError } = await client.storage
      .from("feedback-images")
      .remove([row.storage_path]);
    if (storageError) continue;
    const { error: rowError } = await client
      .from("feedback_attachments")
      .delete()
      .eq("id", row.id)
      .eq("cleanup_ready", true)
      .is("feedback_id", null);
    if (!rowError) removed++;
  }
  return new Response(JSON.stringify({ removed }), {
    headers: { "Content-Type": "application/json" },
  });
});
