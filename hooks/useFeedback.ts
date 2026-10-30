"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  listMyFeedback,
  listAdminFeedback,
} from "@/lib/services/feedbackService";
import { observeFeedback } from "@/lib/services/feedbackRealtimeService";
import type { FeedbackPage } from "@/types/domain/feedback";

export function useFeedbackList(status: "mine" | "pending" | "answered") {
  const [page, setPage] = useState<FeedbackPage>({
    items: [],
    nextCursor: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const load = useCallback(
    async (cursor?: string) => {
      const run = ++sequence.current;
      setLoading(true);
      setError("");
      try {
        const result =
          status === "mine"
            ? await listMyFeedback(cursor)
            : await listAdminFeedback(status, cursor);
        if (run === sequence.current)
          setPage((previous) => ({
            items: cursor
              ? [
                  ...previous.items,
                  ...result.items.filter(
                    (x) => !previous.items.some((y) => y.id === x.id),
                  ),
                ]
              : result.items,
            nextCursor: result.nextCursor,
          }));
      } catch (e) {
        if (run === sequence.current)
          setError(e instanceof Error ? e.message : "의견을 불러오지 못했어요");
      } finally {
        if (run === sequence.current) setLoading(false);
      }
    },
    [status],
  );
  useEffect(() => {
    const update = () => {
      void load();
    };
    const visible = () => {
      if (document.visibilityState === "visible") update();
    };
    update();
    const cleanup = observeFeedback(update, update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", visible);
    const invalidate = () => { ++sequence.current; };
    return () => {
      invalidate();
      cleanup();
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [load]);
  return {
    ...page,
    loading,
    error,
    refetch: () => load(),
    loadMore: () => load(page.nextCursor ?? undefined),
  };
}
