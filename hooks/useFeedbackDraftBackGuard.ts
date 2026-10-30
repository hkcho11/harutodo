"use client";
import { useEffect } from "react";

// Keep the first browser Back inside the composer until discard is confirmed.
// Preserve Next's history state so an accepted second Back still uses its router.
export function useFeedbackDraftBackGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const marker = crypto.randomUUID();
    const state: Record<string, unknown> = window.history.state ?? {};
    window.history.pushState(
      { ...state, haruFeedbackDraft: marker },
      "",
      window.location.href,
    );
    let leaving = false;
    const back = (event: PopStateEvent) => {
      if (leaving) return;
      event.stopImmediatePropagation();
      if (window.confirm("작성 중인 이야기를 두고 나갈까요?")) {
        leaving = true;
        window.history.back();
      } else {
        window.history.pushState(
          { ...(window.history.state ?? {}), haruFeedbackDraft: marker },
          "",
          window.location.href,
        );
      }
    };
    window.addEventListener("popstate", back, true);
    return () => {
      window.removeEventListener("popstate", back, true);
      if (window.history.state?.haruFeedbackDraft === marker) {
        const next = { ...window.history.state };
        delete next.haruFeedbackDraft;
        window.history.replaceState(next, "", window.location.href);
      }
    };
  }, [active]);
}
