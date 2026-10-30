import { feedbackClient } from "./feedbackClient";

export function observeFeedback(
  onChange: () => void,
  onAccountChange: (userId: string | null) => void,
) {
  const client = feedbackClient();
  const channel = client
    .channel(`feedback:${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "feedback" },
      onChange,
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") onChange();
    });
  const { data } = client.auth.onAuthStateChange((_event, session) =>
    queueMicrotask(() => onAccountChange(session?.user.id ?? null)),
  );
  return () => {
    void client.removeChannel(channel);
    data.subscription.unsubscribe();
  };
}
export async function getFeedbackSessionUserId() {
  const {
    data: { user },
  } = await feedbackClient().auth.getUser();
  return user?.id ?? null;
}
