import { create } from "zustand";

export type ToastType = "error" | "success";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

// 라이브러리 없이 운영하는 최소 토스트 큐.
// 자동 dismiss 3s. 동시에 여러 개 노출 가능하지만 보통 1개씩 쌓인다.
export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = "error") => {
    const id = Date.now() + Math.random();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
