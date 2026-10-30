"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  enableFeedbackNotifications,
  getFeedbackPreferences,
  updateFeedbackPreferences,
} from "@/lib/services/feedbackPreferencesService";
import type { FeedbackPreferences } from "@/types/domain/feedback";

export default function FeedbackReceipt() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<FeedbackPreferences | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    getFeedbackPreferences()
      .then((value) => {
        if (active) setPreferences(value);
      })
      .catch(() => {
        if (active)
          setMessage("알림 설정은 의견함에서 언제든 확인할 수 있어요.");
      });
    return () => {
      active = false;
    };
  }, []);
  const accept = async () => {
    setBusy(true);
    const result = await enableFeedbackNotifications();
    if (result === "enabled") {
      setPreferences({ enabled: true, promptSeen: true });
      setMessage("이 기기에서 답변 알림을 받을 준비가 됐어요.");
    } else {
      await updateFeedbackPreferences({ promptSeen: true }).catch(() => {});
      setPreferences({ enabled: false, promptSeen: true });
      setMessage(
        result === "denied"
          ? "기기에서 알림이 차단되어 있어요. 브라우저 설정에서 허용한 뒤 의견함 알림 설정에서 켜주세요."
          : result === "unsupported"
            ? "이 환경에서는 푸시를 지원하지 않아요. 의견함에서 답변을 확인해주세요."
            : "알림을 켜지 못했어요. 의견은 잘 접수됐으니 나중에 설정에서 다시 시도해주세요.",
      );
    }
    setBusy(false);
  };
  const defer = async () => {
    setBusy(true);
    try {
      const value = await updateFeedbackPreferences({ promptSeen: true });
      setPreferences(value);
      router.push("/feedback");
    } catch {
      setMessage("알림 선택을 저장하지 못했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-5 px-5 py-8">
      <span className="rounded-lg bg-haru-primary-soft px-3 py-2 text-sm">
        접수 완료
      </span>
      <h2 className="pt-3 text-xl font-bold">이야기 남겨주셔서 고마워요.</h2>
      <p className="text-sm leading-relaxed text-haru-muted">
        답변이 오면 이곳에서 확인하실 수 있어요.
      </p>
      {preferences && !preferences.enabled && !preferences.promptSeen && (
        <div className="space-y-3 rounded-2xl bg-haru-accent-soft p-5">
          <h3 className="font-semibold">답변이 오면 바로 알려드릴까요?</h3>
          <p className="text-sm text-haru-muted">
            알림을 켜두면 개발자의 답변을 놓치지 않고 받아보실 수 있어요.
          </p>
          <button
            disabled={busy}
            onClick={() => void accept()}
            className="min-h-12 w-full rounded-xl bg-haru-primary font-semibold disabled:opacity-50"
          >
            네, 알려주세요
          </button>
          <button
            disabled={busy}
            onClick={() => void defer()}
            className="min-h-11 w-full rounded-xl"
          >
            나중에 할게요
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="text-sm leading-relaxed">
          {message}
        </p>
      )}
      {preferences?.enabled && !message && (
        <p className="text-sm text-haru-muted">
          의견함 알림이 켜져 있어요. 알림을 허용한 기기로 알려드릴게요.
        </p>
      )}
      {preferences?.promptSeen && !preferences.enabled && !message && (
        <p className="text-sm text-haru-muted">
          알림은 의견함 알림 설정에서 언제든 켤 수 있어요.
        </p>
      )}
      <Link
        href="/feedback"
        className="flex min-h-12 items-center justify-center rounded-xl bg-haru-primary font-semibold"
      >
        내가 남긴 의견 보기
      </Link>
    </section>
  );
}
