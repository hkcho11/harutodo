import FeedbackHeader from "@/components/feedback/FeedbackHeader";
import FeedbackNotificationSettings from "@/components/feedback/FeedbackNotificationSettings";
export default function FeedbackSettingsPage() {
  return (
    <>
      <FeedbackHeader title="의견함 알림 설정" />
      <main className="space-y-4 px-5 py-6">
        <FeedbackNotificationSettings />
        <p className="text-sm text-haru-muted">
          알림을 꺼도 의견함에서 답변을 확인할 수 있어요.
        </p>
      </main>
    </>
  );
}
