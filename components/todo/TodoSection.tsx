import TodoItem from "./TodoItem";
import type { Todo } from "@/types/todo";

type SectionGroup = "together" | "other";

const GROUP_LABEL: Record<SectionGroup, string> = {
  together: "함께",
  other: "그 외",
};

interface Props {
  // 기본 그룹은 group prop으로, 커스텀 그룹은 label prop으로 라벨 지정
  group?: SectionGroup;
  label?: string;
  todos: Todo[];
  onToggle: (id: string, isCompleted: boolean) => void;
  onItemClick: (todo: Todo) => void;
}

export default function TodoSection({
  group,
  label,
  todos,
  onToggle,
  onItemClick,
}: Props) {
  if (todos.length === 0) return null;
  const headerLabel = label ?? (group ? GROUP_LABEL[group] : "");
  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-baseline gap-2 px-1">
        <span className="text-sm font-semibold text-haru-text">
          {headerLabel}
        </span>
        <span className="text-xs text-haru-muted">{todos.length}</span>
      </h2>
      <div className="flex flex-col gap-2">
        {todos.map((t) => (
          <TodoItem
            key={t.id}
            todo={t}
            onToggle={() => onToggle(t.id, !t.is_completed)}
            onClick={() => onItemClick(t)}
          />
        ))}
      </div>
    </section>
  );
}
