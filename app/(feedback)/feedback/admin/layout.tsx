import { requireFeedbackAccess } from "@/lib/server/feedbackAccess";
import FeedbackSessionBoundary from "@/components/feedback/FeedbackSessionBoundary";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireFeedbackAccess(true);
  return <FeedbackSessionBoundary admin>{children}</FeedbackSessionBoundary>;
}
