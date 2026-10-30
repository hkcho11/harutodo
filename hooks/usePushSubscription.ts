"use client";

import { useEffect, useState } from "react";
import { useCoupleStore } from "@/store/useCoupleStore";
import { subscribePush } from "@/lib/services/pushService";

const DISMISSED_KEY = "harutodo_push_dismissed";

export type PushState = "idle" | "prompt" | "granted" | "denied";

function getBrowserPushState(): PushState {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "denied";
  const perm = Notification.permission;
  if (perm === "granted") return "granted";
  if (perm === "denied") return "denied";
  return localStorage.getItem(DISMISSED_KEY) ? "idle" : "prompt";
}

export function usePushSubscription() {
  const me = useCoupleStore((s) => s.me);
  // 서버와 브라우저의 첫 렌더를 동일하게 유지해 hydration mismatch를 방지한다.
  const [state, setState] = useState<PushState>("idle");

  useEffect(() => {
    // 브라우저 전용 API는 hydration이 끝난 뒤에만 읽는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(getBrowserPushState());
  }, []);

  // 이미 권한이 있는 경우 me 로드 시 구독 등록
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (Notification.permission === "granted" && me) {
      void subscribePush(me.id);
    }
  }, [me]);

  const requestPermission = async () => {
    if (!me) return;
    const ok = await subscribePush(me.id);
    setState(ok ? "granted" : "denied");
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setState("idle");
  };

  return { state, requestPermission, dismiss };
}
