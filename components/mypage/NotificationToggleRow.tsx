"use client";

import { cn } from "@/lib/utils/cn";

export default function NotificationToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-haru-text">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-haru-muted">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={cn(
          "relative h-11 w-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40",
          "bg-transparent before:absolute before:inset-x-0 before:top-2.5 before:h-6 before:rounded-full",
          checked ? "before:bg-haru-primary" : "before:bg-haru-border"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-3 h-5 w-5 rounded-full bg-haru-surface shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}
