export async function getNaverCalendarStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/naver-calendar/status");
    if (!res.ok) return false;
    const data = (await res.json()) as { connected: boolean };
    return data.connected;
  } catch {
    return false;
  }
}

export function connectNaverCalendar() {
  window.location.href = "/api/naver-calendar/connect";
}

export async function disconnectNaverCalendar(): Promise<void> {
  const res = await fetch("/api/naver-calendar/disconnect", { method: "DELETE" });
  if (!res.ok) throw new Error("disconnect_failed");
}

interface SyncEventParams {
  title: string;
  startDate: string;   // "YYYY-MM-DD"
  endDate: string;     // "YYYY-MM-DD"
  startTime?: string;  // "HH:MM" | undefined (all-day)
  endTime?: string;
  location?: string;
}

export async function syncEventToNaver(params: SyncEventParams): Promise<void> {
  const res = await fetch("/api/naver-calendar/create-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error ?? "sync_failed");
  }
}
