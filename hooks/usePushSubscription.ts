"use client";

import { useEffect, useState } from "react";
import { useCoupleStore } from "@/store/useCoupleStore";
import { subscribePush } from "@/lib/services/pushService";

const DISMISSED_KEY = "harutodo_push_dismissed";

export type PushState = "idle" | "prompt" | "granted" | "denied";

export function usePushSubscription() {
  const me = useCoupleStore((s) => s.me);
  const [state, setState] = useState<PushState>("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setState("denied");
      return;
    }
    const perm = Notification.permission;
    if (perm === "granted") {
      setState("granted");
      if (me) void subscribePush(me.id);
      return;
    }
    if (perm === "denied") {
      setState("denied");
      return;
    }
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (!dismissed) setState("prompt");
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
