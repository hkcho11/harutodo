"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitFeedback, updateFeedback } from "@/lib/services/feedbackService";
import {
  removePendingFeedbackAttachment,
  uploadFeedbackAttachment,
} from "@/lib/services/feedbackAttachmentService";
import { feedbackInputSchema } from "@/lib/utils/feedback";
import type { Feedback, FeedbackAttachment } from "@/types/domain/feedback";
import { useFeedbackIndicators } from "./FeedbackIndicatorsProvider";
import FeedbackImage from "./FeedbackImage";
import FeedbackReceipt from "./FeedbackReceipt";
import { useFeedbackDraftBackGuard } from "@/hooks/useFeedbackDraftBackGuard";

export default function FeedbackForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Feedback;
  onSaved?: (item: Feedback) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const { refresh } = useFeedbackIndicators();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>(
    initial?.attachments ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const requestId = useRef<string>("");
  const lock = useRef(false);
  const field =
    "w-full rounded-xl border border-haru-border bg-haru-surface p-3 text-base text-haru-text focus-visible:outline-haru-primary disabled:opacity-50";
  const dirty =
    title !== (initial?.title ?? "") ||
    content !== (initial?.content ?? "") ||
    attachments.map((x) => x.id).join() !==
      (initial?.attachments ?? []).map((x) => x.id).join();
  useFeedbackDraftBackGuard(dirty && !sent);
  useEffect(() => {
    if ((!dirty && !uploading) || sent) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (!link || link.getAttribute("target") === "_blank") return;
      if (
        busy ||
        uploading ||
        !window.confirm("작성 중인 이야기를 두고 나갈까요?")
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, busy, uploading, sent]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    if (!navigator.onLine) {
      setError(
        "지금은 인터넷 연결이 없어요. 작성한 내용은 그대로 두고 연결 후 다시 보내주세요.",
      );
      return;
    }
    const value = feedbackInputSchema.safeParse({
      title,
      content,
      attachmentIds: attachments.map((x) => x.id),
    });
    if (!value.success) {
      setError(
        "제목과 내용을 확인해주세요. 제목은 100자, 내용은 5,000자까지 적을 수 있어요.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    requestId.current ||= crypto.randomUUID();
    try {
      const item = initial
        ? await updateFeedback(initial.id, {
            ...value.data,
            expectedRevision: initial.revision,
          })
        : await submitFeedback({ ...value.data, requestId: requestId.current });
      await refresh();
      if (onSaved) onSaved(item);
      else setSent(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "의견을 보내지 못했어요. 다시 시도해주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function addFiles(files: FileList | null) {
    if (!files) return;
    if (files.length + attachments.length > 3) {
      setError("이미지는 최대 3장까지 첨부할 수 있어요.");
      return;
    }
    setUploading(true);
    setError("");
    for (const file of Array.from(files)) {
      try {
        const item = await uploadFeedbackAttachment(file);
        setAttachments((previous) => [...previous, item]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "이미지를 올리지 못했어요.");
        break;
      }
    }
    setUploading(false);
  }
  if (sent) return <FeedbackReceipt />;
  return (
    <form
      onSubmit={(event) => void send(event)}
      className="space-y-5 px-5 py-6"
    >
      <h2 className="text-lg font-bold">
        {initial ? "이야기 다듬기" : "이야기를 들려주세요"}
      </h2>
      <label className="block space-y-2">
        <span className="text-sm font-semibold">
          제목{" "}
          <span className="font-normal text-haru-muted">
            {title.length}/100
          </span>
        </span>
        <input
          required
          maxLength={100}
          disabled={busy}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="어떤 이야기를 들려주실 건가요?"
          className={field}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm font-semibold">
          내용{" "}
          <span className="font-normal text-haru-muted">
            {content.length}/5,000
          </span>
        </span>
        <textarea
          required
          maxLength={5000}
          rows={7}
          disabled={busy}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="쓰다가 아쉬웠던 점이나 있으면 좋을 기능, 따뜻한 응원도 좋아요. 편하게 남겨주세요."
          className={field}
        />
      </label>
      <div className="space-y-3">
        <label
          htmlFor="feedback-images"
          className="block text-sm font-semibold"
        >
          이미지{" "}
          <span className="font-normal text-haru-muted">
            선택 · {attachments.length}/3장
          </span>
        </label>
        <p className="text-sm text-haru-muted">
          사진이 있으면 더 쉽게 이해할 수 있어요.
          <br />
          JPG · PNG · WebP, 한 장당 최대 10MB
        </p>
        <input
          id="feedback-images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || uploading || attachments.length >= 3}
          className="w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded-xl file:border-0 file:bg-haru-primary-soft file:px-3 file:text-haru-text"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {attachments.map((item) => (
          <div key={item.id} className="rounded-xl bg-haru-surface p-3">
            <FeedbackImage attachment={item} />
            <div className="mt-2 flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-xs text-haru-muted">
                {item.originalName}
              </p>
              <button
                type="button"
                disabled={busy || uploading}
                aria-label={`${item.originalName} 첨부에서 빼기`}
                onClick={() => {
                  setAttachments((previous) =>
                    previous.filter((x) => x.id !== item.id),
                  );
                  if (!initial?.attachments.some((x) => x.id === item.id))
                    void removePendingFeedbackAttachment(item.id).catch(
                      () => {},
                    );
                }}
                className="min-h-11 shrink-0 rounded-xl px-3 text-sm"
              >
                빼기
              </button>
            </div>
          </div>
        ))}
        {uploading && (
          <p role="status" className="text-sm">
            이미지를 올리고 있어요…
          </p>
        )}
      </div>
      {!initial && (
        <p className="rounded-2xl bg-haru-primary-soft p-4 text-sm leading-relaxed">
          남겨주신 이야기는 하나씩 소중히 읽고 있어요. 답변까지 시간이 조금 걸릴
          수 있으니, 여유롭게 기다려주시면 고맙겠어요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-haru-text">
          {error}
        </p>
      )}
      <div className="sticky bottom-[calc(var(--feedback-bottom-offset,0px)+env(safe-area-inset-bottom,0px))] space-y-2 bg-haru-bg pb-3 pt-2">
        <button
          disabled={busy || uploading}
          type="submit"
          className="min-h-12 w-full rounded-2xl bg-haru-primary font-bold disabled:opacity-50"
        >
          {busy
            ? "저장하고 있어요…"
            : initial
              ? "수정 내용 저장"
              : "의견 보내기"}
        </button>
        <button
          type="button"
          disabled={busy || uploading}
          className="min-h-11 w-full rounded-xl text-sm"
          onClick={() => {
            if (!dirty || window.confirm("작성 중인 이야기를 두고 나갈까요?")) {
              if (onCancel) onCancel();
              else router.push("/feedback");
            }
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
}
