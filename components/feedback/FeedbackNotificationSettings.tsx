"use client";
import { useEffect, useState } from "react";
import {
  enableFeedbackNotifications,
  getFeedbackPreferences,
  updateFeedbackPreferences,
} from "@/lib/services/feedbackPreferencesService";
import type { FeedbackPreferences } from "@/types/domain/feedback";
import NotificationToggleRow from "@/components/mypage/NotificationToggleRow";
export default function FeedbackNotificationSettings() {
  const [value, setValue] = useState<FeedbackPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    getFeedbackPreferences()
      .then((v) => {
        if (active) setValue(v);
      })
      .catch(() => {
        if (active)
          setMessage("설정을 불러오지 못했어요. 잠시 후 다시 열어주세요.");
      });
    return () => {
      active = false;
    };
  }, []);
  const change = async (enabled: boolean) => {
    setBusy(true);
    setMessage("");
    try {
      if (enabled) {
        const result = await enableFeedbackNotifications();
        if (result !== "enabled") {
          setMessage(
            result === "denied"
              ? "브라우저에서 알림을 허용한 뒤 다시 켜주세요."
              : result === "unsupported"
                ? "이 환경에서는 푸시 알림을 지원하지 않아요."
                : "알림을 켜지 못했어요. 다시 시도해주세요.",
          );
          return;
        }
      }
      setValue(await updateFeedbackPreferences({ enabled, promptSeen: true }));
    } catch {
      setMessage("알림 설정을 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-2xl bg-haru-surface p-5 shadow-card">
      {value ? (
        <NotificationToggleRow
          label="의견함 알림"
          description="남겨주신 이야기에 답변이 오거나 수정되면 알려드려요"
          checked={value.enabled}
          disabled={busy}
          onChange={(v) => void change(v)}
        />
      ) : (
        !message && (
          <p role="status" className="text-sm">
            설정을 불러오고 있어요…
          </p>
        )
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
