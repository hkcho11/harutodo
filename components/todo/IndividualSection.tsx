"use client";

import { useCoupleStore } from "@/store/useCoupleStore";
import TodoItem from "./TodoItem";
import { getAvatarColor, AVATAR_COLOR_CLASSES } from "@/lib/utils/avatarColor";
import type { Todo } from "@/types/todo";
import type { Profile } from "@/types/couple";

interface Props {
  todos: Todo[];
  onToggle: (id: string, isCompleted: boolean) => void;
  onItemClick: (todo: Todo) => void;
}

// "사람별" 그룹 — 본인/파트너 컬럼으로 좌우 분할.
// 각 컬럼은 톤 다른 soft 배경으로 즉시 인지. 미지정은 컬럼 아래 풀너비.
export default function IndividualSection({
  todos,
  onToggle,
  onItemClick,
}: Props) {
  const me = useCoupleStore((s) => s.me);
  const partner = useCoupleStore((s) => s.partner);

  if (todos.length === 0) return null;

  const myTodos = todos.filter((t) => t.assignee_id === me?.id);
  const partnerTodos = todos.filter((t) => t.assignee_id === partner?.id);
  const unassigned = todos.filter(
    (t) => t.assignee_id !== me?.id && t.assignee_id !== partner?.id
  );

  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-baseline gap-2 px-1">
        <span className="text-sm font-semibold text-haru-text">사람별</span>
        <span className="text-xs text-haru-muted">{todos.length}</span>
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <Column
          variant="me"
          person={me}
          fallbackLabel="내 할 일"
          todos={myTodos}
          onToggle={onToggle}
          onItemClick={onItemClick}
          columnBg={AVATAR_COLOR_CLASSES[getAvatarColor(me?.avatar_color)].columnBg}
        />
        <Column
          variant="partner"
          person={partner}
          fallbackLabel="파트너 할 일"
          todos={partnerTodos}
          onToggle={onToggle}
          onItemClick={onItemClick}
          columnBg={AVATAR_COLOR_CLASSES[getAvatarColor(partner?.avatar_color)].columnBg}
        />
      </div>

      {unassigned.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1.5 flex items-baseline gap-2 px-1">
            <span className="text-xs font-medium text-haru-muted">미지정</span>
            <span className="text-xs text-haru-muted">{unassigned.length}</span>
          </h3>
          <div className="flex flex-col gap-2">
            {unassigned.map((t) => (
              <TodoItem
                key={t.id}
                todo={t}
                onToggle={() => onToggle(t.id, !t.is_completed)}
                onClick={() => onItemClick(t)}
                showAssignee={false}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

interface ColumnProps {
  variant: "me" | "partner";
  person: Profile | null;
  fallbackLabel: string;
  todos: Todo[];
  onToggle: (id: string, isCompleted: boolean) => void;
  onItemClick: (todo: Todo) => void;
  columnBg: string;
}

function Column({
  variant,
  person,
  fallbackLabel,
  todos,
  onToggle,
  onItemClick,
  columnBg,
}: ColumnProps) {
  const wrapperClass = columnBg;

  const label = variant === "me" ? "내 할 일" : person?.display_name ?? fallbackLabel;

  return (
    <div className={`rounded-2xl ${wrapperClass} p-3`}>
      <h3 className="mb-2 flex items-baseline justify-between px-1">
        <span className="truncate text-xs font-semibold text-haru-text">
          {label}
        </span>
        <span className="ml-2 shrink-0 text-xs text-haru-muted">
          {todos.length}
        </span>
      </h3>

      {todos.length === 0 ? (
        <p className="px-1 py-3 text-center text-xs text-haru-muted">
          아직 없어요
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {todos.map((t) => (
            <TodoItem
              key={t.id}
              todo={t}
              onToggle={() => onToggle(t.id, !t.is_completed)}
              onClick={() => onItemClick(t)}
              showAssignee={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
