import { create } from "zustand";
import type { Couple } from "@/types/couple";

interface CoupleState {
  couple: Couple | null;
  setCouple: (couple: Couple | null) => void;
}

export const useCoupleStore = create<CoupleState>((set) => ({
  couple: null,
  setCouple: (couple) => set({ couple }),
}));
