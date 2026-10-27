"use client";

import { useEffect, useState } from "react";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { subscribePush } from "@/lib/services/pushService";
import { useCoupleStore } from "@/store/useCoupleStore";
import { useToastStore } from "@/store/useToastStore";

export function useNotificationPreferences() {
  const me = useCoupleStore((s) => s.me);
  const showToast = useToastStore((s) => s.show);
  const {
    settings: notifSettings,
    loading: settingsLoading,
    updating: notifUpdating,
    refetch: notifRefetch,
    update: notifUpdate,
  } = useNotificationSettings(me?.id);

  const notifLoading = !me || settingsLoading;

  const [timePickerTarget, setTimePickerTarget] = useState<"morning" | "evening" | null>(null);
  const [leadMinPickerOpen, setLeadMinPickerOpen] = useState(false);

  // M1: Push 권한 상태 — SSR과 초기 클라이언트 렌더 일치를 위해 "unavailable"로 초기화
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unavailable">("unavailable");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPushPermission(Notification.permission);
  }, []);

  const handleRequestPush = async () => {
    if (!me?.id) return;
    const ok = await subscribePush(me.id);
    setPushPermission(typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unavailable");
    if (ok) showToast("이 기기에서 알림이 허용됐어요");
    else showToast("알림 허용이 필요해요");
  };

  // M2: 설정 저장 실패 toast
  const saveNotif = (patch: Parameters<typeof notifUpdate>[0]) => {
    notifUpdate(patch).catch(() => showToast("알림 설정 저장에 실패했어요. 다시 시도해주세요"));
  };

  const LEAD_MIN_OPTIONS: { label: string; value: number }[] = [
    { label: "15분 전", value: 15 },
    { label: "30분 전", value: 30 },
    { label: "1시간 전", value: 60 },
  ];

  return { notifSettings, notifLoading, notifUpdating, notifRefetch, timePickerTarget,
    setTimePickerTarget, leadMinPickerOpen, setLeadMinPickerOpen, pushPermission,
    handleRequestPush, saveNotif, LEAD_MIN_OPTIONS };
}
