import { NextResponse, type NextRequest } from "next/server";
import {
  createFeedbackServerClient,
  createFeedbackAdminClient,
} from "@/lib/supabase/feedbackServer";
import { isFeedbackImageSignature } from "@/lib/utils/feedback";
import { z } from "zod";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0" };
type Context = { params: Promise<{ id: string }> };
async function findAttachment(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const client = await createFeedbackServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const { data } = await client
    .from("feedback_attachments")
    .select("*")
    .eq("id", id)
    .eq("cleanup_ready", false)
    .maybeSingle();
  return data ? { user, client, attachment: data } : null;
}
export async function GET(_request: NextRequest, context: Context) {
  const found = await findAttachment((await context.params).id);
  if (!found || !found.attachment.verified)
    return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  // RLS has authorized the metadata; Storage SELECT policy independently authorizes the URL.
  const { data, error } = await found.client.storage
    .from("feedback-images")
    .createSignedUrl(found.attachment.storage_path, 60);
  if (error || !data)
    return NextResponse.json(
      { error: "image_unavailable" },
      { status: 503, headers },
    );
  return NextResponse.json({ url: data.signedUrl }, { headers });
}
export async function POST(request: NextRequest, context: Context) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  const found = await findAttachment((await context.params).id);
  if (
    !found ||
    found.attachment.owner_id !== found.user.id ||
    found.attachment.feedback_id
  )
    return NextResponse.json({ error: "not_found" }, { status: 404, headers });
  try {
    const admin = createFeedbackAdminClient();
    const { data: file, error } = await admin.storage
      .from("feedback-images")
      .download(found.attachment.storage_path);
    if (
      error ||
      !file ||
      file.size !== found.attachment.byte_size ||
      file.type !== found.attachment.media_type ||
      !isFeedbackImageSignature(
        new Uint8Array(await file.slice(0, 16).arrayBuffer()),
        found.attachment.media_type,
      )
    ) {
      return NextResponse.json(
        { error: "invalid_image" },
        { status: 422, headers },
      );
    }
    const { data: verified, error: updateError } = await admin
      .from("feedback_attachments")
      .update({ verified: true })
      .eq("id", found.attachment.id)
      .eq("cleanup_ready", false)
      .is("feedback_id", null)
      .select("id")
      .maybeSingle();
    if (updateError || !verified)
      return NextResponse.json({ error: "conflict" }, { status: 409, headers });
    return NextResponse.json({ verified: true }, { headers });
  } catch {
    return NextResponse.json(
      { error: "verification_unavailable" },
      { status: 503, headers },
    );
  }
}
