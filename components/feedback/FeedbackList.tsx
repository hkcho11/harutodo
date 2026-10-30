"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useFeedbackList } from "@/hooks/useFeedback";
import { useFeedbackIndicators } from "./FeedbackIndicatorsProvider";
import FeedbackHeader from "./FeedbackHeader";
import { hasUnreadFeedbackReply } from "@/lib/utils/feedback";

export default function FeedbackList({ admin = false }: { admin?: boolean }) {
  const [tab, setTab] = useState<"pending" | "answered">("pending");
  const { items, nextCursor, loading, error, refetch, loadMore } =
    useFeedbackList(admin ? tab : "mine");
  const { state } = useFeedbackIndicators();
  useEffect(() => {
    if (!admin || loading) return;
    const saved = sessionStorage.getItem(`feedback-scroll-${tab}`);
    if (saved) {
      window.scrollTo(0, Number(saved));
      sessionStorage.removeItem(`feedback-scroll-${tab}`);
    }
  }, [admin, tab, loading]);
  const date = (value: string) =>
    new Date(value).toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
    });
  return (
    <>
      <FeedbackHeader
        title={admin ? "사용자 의견 관리" : "개발자에게 의견 남기기"}
        back="/mypage"
      />
      <main className="space-y-5 px-5 py-6">
        <div>
          <h2 className="text-lg font-bold">
            {admin ? "남겨주신 이야기" : "함께 만드는 하루투두"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-haru-muted">
            {admin
              ? "먼저 기다린 분부터 답변해주세요."
              : "두 분의 하루에 더 잘 맞는 하루투두가 되도록, 이야기를 들려주세요."}
          </p>
        </div>
        {admin ? (
          <>
            <div className="flex gap-2" role="tablist" aria-label="답변 상태">
              {(["pending", "answered"] as const).map((value) => (
                <button
                  key={value}
                  id={`feedback-${value}-tab`}
                  role="tab"
                  aria-controls="feedback-list-panel"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={`min-h-11 flex-1 rounded-xl px-3 text-sm ${tab === value ? "bg-haru-primary font-bold" : "bg-haru-surface"}`}
                >
                  {value === "pending"
                    ? `답변 대기 ${state.pendingFeedback}건`
                    : `답변 완료 ${state.answeredFeedback}건`}
                </button>
              ))}
            </div>
            <p className="text-xs text-haru-muted">
              {tab === "pending" ? "접수 오래된 순" : "최근 답변 순"}
            </p>
          </>
        ) : (
          <Link
            href="/feedback/new"
            className="flex min-h-12 items-center justify-center rounded-2xl bg-haru-primary px-4 text-sm font-bold focus-visible:outline-haru-text"
          >
            ＋ 의견 남기기
          </Link>
        )}
        {!admin && <h2 className="text-sm font-semibold">내가 남긴 의견</h2>}
        {error && (
          <div role="alert" className="rounded-2xl bg-haru-surface p-4">
            <p className="text-sm">{error}</p>
            <button
              className="mt-2 min-h-11 px-3 text-sm underline"
              onClick={() => void refetch()}
            >
              다시 시도
            </button>
          </div>
        )}
        <div
          id="feedback-list-panel"
          role={admin ? "tabpanel" : undefined}
          aria-labelledby={admin ? `feedback-${tab}-tab` : undefined}
          className="space-y-3"
        >
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/feedback/${admin ? "admin/" : ""}${item.id}`}
              onClick={() => {
                if (admin)
                  sessionStorage.setItem(
                    `feedback-scroll-${tab}`,
                    String(window.scrollY),
                  );
              }}
              className="block rounded-2xl bg-haru-surface p-5 shadow-card focus-visible:outline-haru-primary"
            >
              <span
                className={`rounded-lg px-2 py-1 text-xs ${hasUnreadFeedbackReply(item) && !admin ? "bg-haru-accent-soft" : "bg-haru-primary-soft"}`}
              >
                {admin
                  ? item.reply
                    ? "답변 완료"
                    : "답변 대기"
                  : hasUnreadFeedbackReply(item)
                    ? "! 새 답변"
                    : item.reply
                      ? "답변 도착"
                      : "답변 기다리는 중"}
              </span>
              <h3 className="mt-3 break-words text-sm font-semibold">
                {item.title}
              </h3>
              <p className="mt-2 text-xs text-haru-muted">
                {date(
                  admin && tab === "answered" && item.reply
                    ? item.reply.updatedAt
                    : item.createdAt,
                )}
                {admin ? ` · ${item.authorName}` : ""}
                {admin && item.replyRevision > 1 ? " · 답변 수정됨" : ""}
                {item.attachments.length
                  ? ` · 이미지 ${item.attachments.length}장`
                  : ""}
              </p>
            </Link>
          ))}
        </div>
        {loading && (
          <p role="status" className="py-4 text-center text-sm text-haru-muted">
            이야기를 불러오고 있어요…
          </p>
        )}
        {!loading && !error && !items.length && (
          <p className="py-8 text-center text-sm text-haru-muted">
            {admin
              ? "이 탭에는 아직 의견이 없어요."
              : "아직 남겨주신 이야기가 없어요. 작은 의견도 반가워요."}
          </p>
        )}
        {nextCursor && (
          <button
            className="min-h-11 w-full rounded-xl border border-haru-border"
            disabled={loading}
            onClick={() => void loadMore()}
          >
            더 보기
          </button>
        )}
      </main>
    </>
  );
}
