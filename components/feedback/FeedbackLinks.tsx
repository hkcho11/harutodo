"use client";
import Link from "next/link";
import { ChevronRight, Inbox, MessageCircle } from "lucide-react";
import { useFeedbackIndicators } from "./FeedbackIndicatorsProvider";

export default function FeedbackLinks() {
  const { state } = useFeedbackIndicators();
  return (
    <section
      className="space-y-1 rounded-2xl bg-haru-surface p-2 shadow-card"
      aria-label="의견함"
    >
      <Link
        href="/feedback"
        className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 text-haru-text transition-colors active:bg-haru-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-haru-primary-soft" aria-hidden="true">
          <MessageCircle className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">개발자에게 의견 남기기</span>
            {state.unreadReplies > 0 && <span className="rounded-full bg-haru-accent-soft px-2 py-1 text-xs font-medium">! 새 답변</span>}
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-haru-muted">작은 의견도, 따뜻한 응원도 좋아요</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-haru-muted" aria-hidden="true" />
      </Link>
      {state.isAdmin && (
        <Link
          href="/feedback/admin"
          className="flex min-h-14 items-center gap-3 rounded-xl bg-haru-accent-soft/60 px-3 py-3 text-haru-text transition-colors active:bg-haru-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-haru-surface" aria-hidden="true">
            <Inbox className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">사용자 의견 관리</span>
              <span className="rounded-full bg-haru-surface px-2 py-1 text-xs font-medium">답변 대기 {state.pendingFeedback}건</span>
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-haru-muted">
              {state.pendingFeedback > 0 ? "기다리는 이야기에 답변을 남겨주세요" : "도착한 이야기를 확인하고 답변해요"}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-haru-muted" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
