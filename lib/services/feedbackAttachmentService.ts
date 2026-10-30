import { feedbackClient, feedbackError } from "./feedbackClient";
import { toFeedbackAttachment } from "./mappers/feedbackMapper";
import { validateFeedbackImage } from "@/lib/utils/feedback";

export async function uploadFeedbackAttachment(file: File) {
  const message = validateFeedbackImage(file);
  if (message) throw new Error(message);
  const { data, error } = await feedbackClient().rpc(
    "prepare_feedback_attachment",
    { p_name: file.name, p_type: file.type, p_size: file.size },
  );
  if (error) throw feedbackError(error);
  const attachment = toFeedbackAttachment(data);
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof data.storagePath !== "string"
  )
    throw new Error("이미지 업로드를 준비하지 못했어요");
  const { error: uploadError } = await feedbackClient()
    .storage.from("feedback-images")
    .upload(data.storagePath, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "0",
    });
  if (uploadError) {
    await removePendingFeedbackAttachment(attachment.id).catch(() => {});
    throw new Error("이미지를 올리지 못했어요. 다시 시도해주세요");
  }
  const response = await fetch(`/api/feedback/attachments/${attachment.id}`, {
    method: "POST",
  });
  if (!response.ok) {
    await removePendingFeedbackAttachment(attachment.id).catch(() => {});
    throw new Error(
      "이미지를 확인하지 못했어요. JPG, PNG, WebP 파일인지 확인해주세요",
    );
  }
  return attachment;
}
export async function getFeedbackAttachmentUrl(
  attachmentId: string,
): Promise<string> {
  const response = await fetch(`/api/feedback/attachments/${attachmentId}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("이미지를 불러오지 못했어요");
  const result: unknown = await response.json();
  if (
    !result ||
    typeof result !== "object" ||
    !("url" in result) ||
    typeof result.url !== "string"
  )
    throw new Error("이미지를 불러오지 못했어요");
  return result.url;
}
export async function removePendingFeedbackAttachment(id: string) {
  const { error } = await feedbackClient().rpc("discard_feedback_attachment", {
    p_id: id,
  });
  if (error) throw feedbackError(error);
}
