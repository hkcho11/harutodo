"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// document.body 바로 아래에 portal로 렌더 — 레이아웃 어떤 자식의
// stacking context에도 갇히지 않게 보장 (하단탭에 가려지는 이슈 회피).
// open은 항상 false로 시작하므로 첫 렌더에는 portal을 호출하지 않아 SSR 안전.
//
// 모바일 키보드 대응:
// - max-h-[90dvh]: 키보드 팝업 시 dvh가 자동 재계산되어 시트가 가려지지 않음
// - 헤더(핸들/제목) shrink-0 + 본문 flex-1 overflow-y-auto: 콘텐츠 내부 스크롤
// - 호출 측은 본문 마지막에 `sticky bottom-0` 액션 영역을 두어 저장 버튼이 항상 노출되게 한다
export default function BottomSheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: 100 }}
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
      <div className="relative flex max-h-[90dvh] flex-col rounded-t-3xl bg-haru-surface shadow-card">
        <div className="shrink-0 px-5 pt-5">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-haru-border" />
          {title && (
            <h2 className="mb-2 text-lg font-bold text-haru-text">{title}</h2>
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
