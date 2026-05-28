import TodoItem from "./TodoItem";
import type { Todo } from "@/types/todo";

type SectionGroup = "together" | "individual" | "other";

const GROUP_LABEL: Record<SectionGroup, string> = {
  together: "함께",
  individual: "사람별",
  other: "그 외",
};

interface Props {
  group: SectionGroup;
  todos: Todo[];
  onToggle: (id: string, isCompleted: boolean) => void;
  onItemClick: (todo: Todo) => void;
}

export default function TodoSection({
  group,
  todos,
  onToggle,
  onItemClick,
}: Props) {
  if (todos.length === 0) return null;
  return (
    <section className="mb-5">
      <h2 className="mb-2 flex items-baseline gap-2 px-1">
        <span className="text-sm font-semibold text-haru-text">
          {GROUP_LABEL[group]}
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
