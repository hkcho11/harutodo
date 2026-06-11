"use client";

import { Check } from "lucide-react";
import { useCoupleStore } from "@/store/useCoupleStore";
import { cn } from "@/lib/utils/cn";
import type { Todo } from "@/types/todo";

interface Props {
  todo: Todo;
  onToggle: () => void;
  onClick: () => void;
  showAssignee?: boolean;
}

export default function TodoItem({
  todo,
  onToggle,
  onClick,
  showAssignee = true,
}: Props) {
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);

  const assignee =
    !showAssignee
      ? null
      : todo.assignee_id === me?.id
      ? me
      : todo.assignee_id === partner?.id
      ? partner
      : null;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-haru-surface px-4 py-3 shadow-card min-h-[56px] animate-haru-fade-up">
      <button
        type="button"
        onClick={onToggle}
        aria-label={todo.is_completed ? "완료 해제" : "완료 처리"}
        aria-pressed={todo.is_completed}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200",
          todo.is_completed
            ? "bg-haru-primary border-haru-primary text-haru-text"
            : "border-haru-border bg-transparent"
        )}
      >
        {todo.is_completed && (
          <Check
            className="h-3.5 w-3.5 animate-haru-pop"
            strokeWidth={3}
          />
        )}
      </button>
      <button
        type="button"
        onClick={onClick}
        className="flex-1 min-w-0 text-left"
        aria-label={`${todo.title} 편집`}
      >
        <p
          className={cn(
            "truncate text-sm transition-colors duration-200",
            todo.is_completed
              ? "text-haru-muted line-through"
              : "text-haru-text"
          )}
        >
          {todo.title}
        </p>
      </button>
      {assignee && (
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium text-haru-text",
            assignee.id === me?.id ? "bg-haru-primary-soft" : "bg-haru-accent-soft"
          )}
        >
          {assignee.display_name}
        </span>
      )}
    </div>
  );
}
