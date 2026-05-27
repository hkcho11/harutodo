import { create } from "zustand";
import type { TodoGroup } from "@/types/todo";

// 서버 데이터(투두 목록, 커스텀 그룹)는 Supabase Realtime 훅에서 직접 관리한다.
// 이 스토어는 투두 화면의 UI 상태만 담당한다.

interface TodoUIState {
  activeFilter: TodoGroup | "all";
  isAddSheetOpen: boolean;
  editingTodoId: string | null;
  setActiveFilter: (filter: TodoGroup | "all") => void;
  openAddSheet: () => void;
  closeAddSheet: () => void;
  setEditingTodoId: (id: string | null) => void;
}

export const useTodoStore = create<TodoUIState>((set) => ({
  activeFilter: "all",
  isAddSheetOpen: false,
  editingTodoId: null,
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  openAddSheet: () => set({ isAddSheetOpen: true }),
  closeAddSheet: () => set({ isAddSheetOpen: false, editingTodoId: null }),
  setEditingTodoId: (editingTodoId) =>
    set({ editingTodoId, isAddSheetOpen: editingTodoId !== null }),
}));
