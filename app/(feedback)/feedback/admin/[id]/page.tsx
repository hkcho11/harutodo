import FeedbackDetail from "@/components/feedback/FeedbackDetail";
export default async function AdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <FeedbackDetail id={(await params).id} admin />;
}
