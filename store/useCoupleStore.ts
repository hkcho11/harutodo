import { create } from "zustand";
import type { Profile } from "@/types/couple";

// (main)/layout.tsx 서버 컴포넌트에서 한 번 조회 후 CoupleProvider가 hydrate.
// 이후 클라이언트 컴포넌트는 매 요청마다 다시 조회하지 않고 이 스토어에서 읽는다.

interface CoupleState {
  coupleId: string | null;
  me: Profile | null;
  partner: Profile | null;
  hydrate: (data: { coupleId: string; me: Profile; partner: Profile }) => void;
  updateMe: (updates: Partial<Profile>) => void;
  reset: () => void;
}

export const useCoupleStore = create<CoupleState>((set) => ({
  coupleId: null,
  me: null,
  partner: null,
  hydrate: ({ coupleId, me, partner }) => set({ coupleId, me, partner }),
  updateMe: (updates) =>
    set((state) => ({ me: state.me ? { ...state.me, ...updates } : null })),
  reset: () => set({ coupleId: null, me: null, partner: null }),
}));
