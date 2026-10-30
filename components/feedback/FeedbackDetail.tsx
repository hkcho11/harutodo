"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteFeedback,
  getFeedback,
  markFeedbackReplyRead,
  saveFeedbackReply,
} from "@/lib/services/feedbackService";
import type { Feedback } from "@/types/domain/feedback";
import FeedbackHeader from "./FeedbackHeader";
import FeedbackForm from "./FeedbackForm";
import FeedbackImage from "./FeedbackImage";
import { useFeedbackIndicators } from "./FeedbackIndicatorsProvider";

export default function FeedbackDetail({
  id,
  admin = false,
}: {
  id: string;
  admin?: boolean;
}) {
  const router = useRouter();
  const { refresh } = useFeedbackIndicators();
  const [item, setItem] = useState<Feedback | null>(null);
  const [error, setError] = useState("");
  const [reply, setReply] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [readError, setReadError] = useState(false);
  const load = useCallback(async () => {
    setError("");
    try {
      const value = await getFeedback(id);
      setItem(value);
      setReply((current) =>
        admin && current.trim() ? current : (value.reply?.content ?? ""),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "의견을 불러오지 못했어요.");
    }
  }, [id, admin]);
  useEffect(() => {
    let active = true;
    getFeedback(id)
      .then((value) => {
        if (active) {
          setItem(value);
          setReply(value.reply?.content ?? "");
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "의견을 불러오지 못했어요.",
          );
      });
    return () => {
      active = false;
    };
  }, [id]);
  const markRead = useCallback(async () => {
    if (!admin && item?.reply) {
      try {
        await markFeedbackReplyRead(item.id, item.reply.revision);
        setReadError(false);
        await refresh();
      } catch {
        setReadError(true);
      }
    }
  }, [admin, item, refresh]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && item?.reply && document.visibilityState === "visible")
        void markRead();
    });
    const visible = () => {
      if (document.visibilityState === "visible") void markRead();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", visible);
    };
  }, [item, markRead]);
  const act = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const back = admin ? "/feedback/admin" : "/feedback";
  if (editing && item)
    return (
      <>
        <FeedbackHeader title="의견 수정" back={back} />
        <FeedbackForm
          initial={item}
          onSaved={(value) => {
            setItem(value);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </>
    );
  return (
    <>
      <FeedbackHeader
        title={admin ? "의견 확인 · 답변" : "내가 남긴 의견"}
        back={back}
      />
      <main className="flex flex-col gap-5 px-5 py-6">
        {error && (
          <div
            role="alert"
            className="space-y-2 rounded-xl bg-haru-surface p-4"
          >
            <p className="text-sm">{error}</p>
            <button
              className="min-h-11 px-3 underline"
              onClick={() => void load()}
            >
              최신 내용 다시 확인
            </button>
          </div>
        )}
        {!item && !error && <p role="status">이야기를 불러오고 있어요…</p>}
        {item && (
          <>
            <span className="self-start rounded-lg bg-haru-primary-soft px-2 py-1 text-xs">
              {item.reply ? "답변 도착" : "답변 기다리는 중"}
            </span>
            <article className="space-y-3 rounded-2xl bg-haru-surface p-5 shadow-card">
              <h2 className="break-words text-lg font-bold">{item.title}</h2>
              <p className="text-xs text-haru-muted">
                {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                {admin ? ` · ${item.authorName}` : ""}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {item.content}
              </p>
              {item.attachments.map((a) => (
                <FeedbackImage key={a.id} attachment={a} />
              ))}
            </article>
            {admin ? (
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void act(async () => {
                    await saveFeedbackReply(item.id, {
                      expectedRevision: item.revision,
                      expectedReplyRevision: item.replyRevision,
                      content: reply,
                    });
                    await refresh();
                    router.push("/feedback/admin");
                  });
                }}
              >
                <label
                  className="block text-sm font-semibold"
                  htmlFor="feedback-reply"
                >
                  개발자 답변
                </label>
                <textarea
                  id="feedback-reply"
                  required
                  maxLength={5000}
                  rows={7}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-xl border border-haru-border bg-haru-surface p-3 text-base focus-visible:outline-haru-primary"
                />
                <p className="text-xs text-haru-muted">
                  {reply.length}/5,000 ·{" "}
                  {item.reply
                    ? "수정하면 새 답변 표시와 알림이 다시 전달돼요."
                    : "답변은 의견을 남긴 분에게만 보여요."}
                </p>
                <button
                  disabled={
                    busy ||
                    !reply.trim() ||
                    reply.trim() === item.reply?.content
                  }
                  className="min-h-12 w-full rounded-2xl bg-haru-primary font-bold disabled:opacity-50"
                >
                  {busy
                    ? "저장 중…"
                    : item.reply
                      ? "답변 수정하기"
                      : "답변 보내기"}
                </button>
              </form>
            ) : item.reply ? (
              <section className="space-y-3 rounded-2xl bg-haru-primary-soft p-5">
                <h3 className="font-semibold">개발자의 답변</h3>
                <p className="text-xs text-haru-muted">
                  {new Date(item.reply.updatedAt).toLocaleDateString("ko-KR")}
                  {item.reply.revision > 1 ? " · 수정됨" : ""}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {item.reply.content}
                </p>
                {readError && (
                  <button
                    className="min-h-11 underline"
                    onClick={() => void markRead()}
                  >
                    읽음 표시 다시 저장
                  </button>
                )}
              </section>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-haru-muted">
                  소중히 읽어보고 답변드릴게요.
                  <br />
                  조금만 여유롭게 기다려주세요.
                </p>
                <div className="flex gap-3">
                  <button
                    disabled={busy}
                    className="min-h-11 flex-1 rounded-xl bg-haru-surface"
                    onClick={() => setEditing(true)}
                  >
                    수정하기
                  </button>
                  <button
                    disabled={busy}
                    className="min-h-11 flex-1 rounded-xl border border-haru-border"
                    onClick={() => {
                      if (
                        window.confirm(
                          "이 의견을 삭제할까요? 삭제한 의견은 되돌릴 수 없어요.",
                        )
                      )
                        void act(async () => {
                          await deleteFeedback(item.id, item.revision);
                          await refresh();
                          router.push(back);
                        });
                    }}
                  >
                    삭제하기
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
