"use client";

import { Check } from "lucide-react";
import BottomSheet from "@/components/common/BottomSheet";
import { cn } from "@/lib/utils/cn";

export interface SheetOption<T extends string | number> {
  label: string;
  description?: string;
  value: T;
}

interface Props<T extends string | number> {
  open: boolean;
  title: string;
  options: SheetOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}

export default function OptionSheet<T extends string | number>({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: Props<T>) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <ul className="flex flex-col pb-2">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors active:bg-haru-primary-soft",
                  selected && "bg-haru-primary-soft"
                )}
              >
                <div>
                  <p className={cn("text-base font-medium", selected ? "text-haru-text" : "text-haru-text")}>
                    {opt.label}
                  </p>
                  {opt.description && (
                    <p className="mt-0.5 text-xs text-haru-muted">{opt.description}</p>
                  )}
                </div>
                {selected && <Check className="h-5 w-5 shrink-0 text-haru-primary-active" />}
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}
