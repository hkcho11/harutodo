import { requireFeedbackAccess } from "@/lib/server/feedbackAccess";
import BottomTabBar from "@/components/layout/BottomTabBar";
import FeedbackSessionBoundary from "@/components/feedback/FeedbackSessionBoundary";
export const dynamic = "force-dynamic";
export default async function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { coupled } = await requireFeedbackAccess();
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-haru-bg text-haru-text">
      <div
        className={
          coupled
            ? "pb-28 [--feedback-bottom-offset:calc(var(--spacing)*14)]"
            : "pb-8 [--feedback-bottom-offset:0px]"
        }
      >
        <FeedbackSessionBoundary>{children}</FeedbackSessionBoundary>
      </div>
      {coupled && <BottomTabBar />}
    </div>
  );
}
