"use client";

import { Check, X } from "lucide-react";
import BottomSheet from "@/components/common/BottomSheet";
import { AVATAR_COLOR_KEYS, AVATAR_COLOR_CLASSES, type AvatarColor } from "@/lib/utils/avatarColor";
import { cn } from "@/lib/utils/cn";

interface Props {
  open: boolean;
  currentColor: AvatarColor;
  partnerColor: AvatarColor;
  isSaving: boolean;
  onSelect: (color: AvatarColor) => void;
  onClose: () => void;
}

export default function AvatarColorSheet({
  open,
  currentColor,
  partnerColor,
  isSaving,
  onSelect,
  onClose,
}: Props) {
  return (
    <BottomSheet open={open} onClose={onClose} title="프로필 색상">
      <div className="px-5 pb-6 pt-2">
        <p className="mb-5 text-sm text-haru-muted">
          선택한 색상이 투두와 캘린더에 반영돼요
        </p>
        <div className="flex items-center justify-between gap-3">
          {AVATAR_COLOR_KEYS.map((key) => {
            const tokens = AVATAR_COLOR_CLASSES[key];
            const isSelected = key === currentColor;
            const isPartner = key === partnerColor;
            const isDisabled = isSaving || isPartner;
            return (
              <button
                key={key}
                type="button"
                onClick={() => !isDisabled && onSelect(key)}
                aria-label={isPartner ? `${tokens.label} (파트너 사용 중)` : tokens.label}
                aria-pressed={isSelected}
                disabled={isDisabled}
                className="flex flex-col items-center gap-2"
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full transition-transform",
                    tokens.avatarBg,
                    isSelected && "ring-2 ring-offset-2 ring-haru-primary-active",
                    isPartner && "opacity-35",
                    !isDisabled && "active:scale-95"
                  )}
                >
                  {isSelected && (
                    <Check className="h-5 w-5 text-haru-text" strokeWidth={2.5} />
                  )}
                  {isPartner && (
                    <X className="h-4 w-4 text-haru-muted" strokeWidth={2} />
                  )}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    isSelected ? "font-semibold text-haru-text" : "text-haru-muted",
                    isPartner && "opacity-35"
                  )}
                >
                  {isPartner ? "사용 중" : tokens.label}
                </span>
              </button>
            );
          })}
        </div>
        {isSaving && (
          <p className="mt-4 text-center text-xs text-haru-muted">저장 중...</p>
        )}
      </div>
    </BottomSheet>
  );
}
