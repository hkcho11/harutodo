"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getFeedbackAttachmentUrl } from "@/lib/services/feedbackAttachmentService";
import type { FeedbackAttachment } from "@/types/domain/feedback";

export default function FeedbackImage({
  attachment,
}: {
  attachment: FeedbackAttachment;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let active = true;
    getFeedbackAttachmentUrl(attachment.id)
      .then((value) => {
        if (active) {
          setUrl(value);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [attachment.id, attempt]);
  return (
    <div className="min-w-0">
      {error ? (
        <button
          type="button"
          className="min-h-11 rounded-xl border border-haru-border p-3 text-sm"
          onClick={() => setAttempt((x) => x + 1)}
        >
          이미지 다시 불러오기
        </button>
      ) : url ? (
        <button
          type="button"
          className="block w-full rounded-xl focus-visible:outline-haru-primary"
          onClick={() => dialog.current?.showModal()}
          aria-label={`${attachment.originalName} 크게 보기`}
        >
          <Image
            src={url}
            alt={attachment.originalName}
            width={320}
            height={200}
            unoptimized
            className="max-h-48 w-full rounded-xl object-contain"
            onError={() => setError(true)}
          />
        </button>
      ) : (
        <p className="text-xs text-haru-muted">이미지 불러오는 중…</p>
      )}
      <dialog
        ref={dialog}
        className="m-auto max-h-dvh w-full max-w-lg rounded-2xl bg-haru-surface p-4 text-haru-text backdrop:bg-black/40"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
        aria-label="첨부 이미지 확대"
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="min-h-11 rounded-xl px-4"
            onClick={() => dialog.current?.close()}
          >
            닫기
          </button>
        </div>
        {url && (
          <Image
            src={url}
            alt={attachment.originalName}
            width={1000}
            height={1000}
            unoptimized
            className="h-auto max-h-dvh w-full object-contain"
          />
        )}
      </dialog>
    </div>
  );
}
