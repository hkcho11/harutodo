import { createClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Dev 모드에서 SW가 비활성화된 경우 navigator.serviceWorker.ready가 영원히 pending 상태가 됨
async function getReadySW(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
  ]);
}

export async function subscribePush(userId: string): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await getReadySW();
  if (!reg) return false;

  const existing = await reg.pushManager.getSubscription();
  const sub = existing ?? await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
  });

  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { user_id: userId, subscription: sub.toJSON() as unknown as import("@/types/supabase").Json },
    { onConflict: "user_id,subscription", ignoreDuplicates: true }
  );
  return !error;
}

export async function unsubscribePush(userId: string): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await getReadySW();
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await sub.unsubscribe();
    const supabase = createClient();
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .eq("subscription", sub.toJSON() as any);
  }
}

export type NotifyAction = "add" | "update" | "delete";
export type NotifyEntityType = "todo" | "event";

export async function notifyPartner(params: {
  partnerId: string;
  actorName: string;
  action: NotifyAction;
  entityType: NotifyEntityType;
  entityTitle?: string;
}): Promise<void> {
  const supabase = createClient();
  await supabase.functions.invoke("notify-partner", {
    body: {
      partner_id: params.partnerId,
      actor_name: params.actorName,
      action: params.action,
      entity_type: params.entityType,
      entity_title: params.entityTitle,
    },
  });
}
