"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

// 중앙 confirm 다이얼로그. portal로 document.body 직속 렌더.
// BottomSheet(z-100)보다 위에 떠야 하므로 z-110.
// 모바일 실수 방지: 파괴적 액션(삭제 등)에 사용한다.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "취소",
  variant = "primary",
  isLoading,
  onConfirm,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ zIndex: 110 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative w-full max-w-sm rounded-3xl bg-haru-surface p-6 shadow-card animate-haru-fade-up">
        <h2 className="mb-1 text-base font-bold text-haru-text">{title}</h2>
        {description && (
          <p className="mb-5 text-sm text-haru-muted">{description}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-12 flex-1 rounded-2xl border border-haru-border bg-haru-surface text-base font-semibold text-haru-text transition-colors active:bg-haru-primary-soft disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "h-12 flex-1 rounded-2xl text-base font-semibold text-white transition-colors disabled:opacity-40",
              variant === "danger"
                ? "bg-haru-danger active:opacity-90"
                : "bg-haru-primary hover:bg-haru-primary-hover active:bg-haru-primary-active"
            )}
          >
            {isLoading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
