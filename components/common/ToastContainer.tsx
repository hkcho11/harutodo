"use client";

import { useToastStore } from "@/store/useToastStore";
import { cn } from "@/lib/utils/cn";

// 하단 탭 위쪽에 떠 있는 토스트. 클릭으로 즉시 dismiss 가능.
export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[120] flex flex-col items-center gap-2 px-4"
      style={{
        bottom: "calc(56px + 1rem + env(safe-area-inset-bottom, 0px))",
      }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          role="status"
          className={cn(
            "pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-sm shadow-card animate-haru-fade-up",
            t.type === "error"
              ? "bg-haru-danger text-white"
              : "bg-haru-primary text-haru-text"
          )}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
