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
  update: (patch: Partial<NotificationSettingsUpdate>) => Promise<void>;
}

export function useNotificationSettings(
  userId: string | undefined
): UseNotificationSettingsResult {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getNotificationSettings(userId)
      .then(setSettings)
      .catch(console.error)
      .finally(() => setLoading(false));
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

  return { settings, loading, updating, update };
}
