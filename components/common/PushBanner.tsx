"use client";

import { Bell, X } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function PushBanner() {
  const { state, requestPermission, dismiss } = usePushSubscription();

  if (state !== "prompt") return null;

  return (
    <div className="mx-4 mt-4 flex items-center gap-3 rounded-2xl bg-haru-surface px-4 py-3 shadow-card">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-haru-primary-soft">
        <Bell className="h-4 w-4 text-haru-text" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-haru-text">파트너 알림 받기</p>
        <p className="text-xs text-haru-muted">파트너가 할 일·일정을 바꾸면 알려드려요</p>
      </div>
      <button
        type="button"
        onClick={requestPermission}
        className="shrink-0 rounded-xl bg-haru-primary px-3 py-1.5 text-xs font-semibold text-haru-text active:bg-haru-primary-active"
      >
        허용
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="닫기"
        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-haru-muted active:bg-haru-primary-soft"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
