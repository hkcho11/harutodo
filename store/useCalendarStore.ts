import { create } from "zustand";

interface CalendarState {
  selectedDate: string;
  currentMonth: string;
  setSelectedDate: (date: string) => void;
  setCurrentMonth: (month: string) => void;
}

const today = new Date().toISOString().split("T")[0];
const currentMonth = today.substring(0, 7);

export const useCalendarStore = create<CalendarState>((set) => ({
  selectedDate: today,
  currentMonth,
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setCurrentMonth: (currentMonth) => set({ currentMonth }),
}));
