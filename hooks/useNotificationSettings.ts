"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
  type NotificationSettingsUpdate,
} from "@/lib/services/notificationSettingsService";

interface UseNotificationSettingsResult {
  settings: NotificationSettings | null;
  loading: boolean;
  updating: boolean;
  refetch: () => Promise<void>;
  update: (patch: Partial<NotificationSettingsUpdate>) => Promise<void>;
}

export function useNotificationSettings(
  userId: string | undefined
): UseNotificationSettingsResult {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  // fetchedForUserId: 마지막으로 fetch 완료된 userId — loading을 동기 setState 없이 도출
  const [fetchedForUserId, setFetchedForUserId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const loading = !!userId && fetchedForUserId !== userId;

  const refetch = useCallback(async () => {
    if (!userId) return;
    try {
      setSettings(await getNotificationSettings(userId));
    } catch (error) {
      console.error(error);
    } finally {
      setFetchedForUserId(userId);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    getNotificationSettings(userId)
      .then(setSettings)
      .catch(console.error)
      .finally(() => setFetchedForUserId(userId));
  }, [userId]);

  const update = useCallback(
    async (patch: Partial<NotificationSettingsUpdate>) => {
      if (!userId) return;
      setUpdating(true);
      try {
        const updated = await updateNotificationSettings(userId, patch);
        setSettings(updated);
      } finally {
        setUpdating(false);
      }
    },
    [userId]
  );

  return { settings, loading, updating, refetch, update };
}
