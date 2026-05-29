import type { TodoGroup } from "@/types/todo";

// 할 일 그룹별 색상 매핑 (홈 등에서 사용).
// 사용자 정의 팔레트: 함께=살구 / 사람별=연두 / 그 외=스카이.
// 컴포넌트 작성 시 항상 이 매핑을 통해 호출 — 임의 색상 하드코딩 금지.
export const GROUP_COLOR_CLASS: Record<TodoGroup, string> = {
  together: "bg-haru-secondary text-haru-text",
  individual: "bg-haru-primary text-haru-text",
  other: "bg-haru-accent text-haru-text",
  custom: "bg-haru-accent text-haru-text",
};

export const GROUP_LABEL: Record<TodoGroup, string> = {
  together: "함께",
  individual: "사람별",
  other: "그 외",
  custom: "그 외",
};
