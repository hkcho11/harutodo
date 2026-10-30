"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getFeedbackContext } from "@/lib/services/feedbackService";
import {
  getFeedbackSessionUserId,
  observeFeedback,
} from "@/lib/services/feedbackRealtimeService";
import type {
  FeedbackCapabilities,
  FeedbackCounts,
} from "@/types/domain/feedback";
import { shouldResetFeedbackAccount } from "@/lib/utils/feedback";

const empty = {
  userId: "",
  isAdmin: false,
  unreadReplies: 0,
  pendingFeedback: 0,
  answeredFeedback: 0,
};
type State = FeedbackCapabilities & FeedbackCounts;
const Context = createContext<{ state: State; refresh: () => Promise<void> }>({
  state: empty,
  refresh: async () => {},
});
export const useFeedbackIndicators = () => useContext(Context);
export default function FeedbackIndicatorsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>(empty);
  const sequence = useRef(0);
  const accountId = useRef<string | null | undefined>(undefined);
  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    let userId = "";
    try {
      userId = (await getFeedbackSessionUserId()) ?? "";
      const next = userId ? await getFeedbackContext() : empty;
      if (id === sequence.current) {
        accountId.current = userId || null;
        setState(next);
      }
    } catch {
      if (id === sequence.current) setState({ ...empty, userId });
    }
  }, []);
  useEffect(() => {
    let active = true;
    const update = () => {
      if (active) void refresh();
    };
    const account = (userId: string | null) => {
      if (active && shouldResetFeedbackAccount(accountId.current, userId)) {
        accountId.current = userId;
        ++sequence.current;
        setState(empty);
        void refresh();
      }
    };
    const cleanup = observeFeedback(update, account);
    update();
    const visibility = () => {
      if (document.visibilityState === "visible") update();
    };
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", visibility);
    const invalidate = () => {
      ++sequence.current;
    };
    return () => {
      active = false;
      invalidate();
      cleanup();
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [refresh]);
  return (
    <Context.Provider value={{ state, refresh }}>{children}</Context.Provider>
  );
}
