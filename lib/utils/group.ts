import type { TodoGroup } from "@/types/todo";

// 캘린더 셀 등에서 그룹별로 색상을 구분할 때 사용.
// 컴포넌트 작성 시 항상 이 매핑을 통해 호출 — 임의 색상 하드코딩 금지.
export const GROUP_COLOR_CLASS: Record<TodoGroup, string> = {
  together: "bg-haru-primary text-white",
  individual: "bg-haru-secondary text-haru-text",
  other: "bg-haru-accent text-haru-text",
  custom: "bg-haru-accent text-haru-text",
};

export const GROUP_LABEL: Record<TodoGroup, string> = {
  together: "함께",
  individual: "사람별",
  other: "그 외",
  custom: "그 외",
};
