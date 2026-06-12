export function initiateNaverAuth(): void {
  window.location.href = "/api/auth/naver";
}

export async function getNaverConnectionStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/naver/status");
    const data = (await res.json()) as { connected: boolean };
    return data.connected;
  } catch {
    return false;
  }
}

export async function disconnectNaver(): Promise<void> {
  const res = await fetch("/api/naver/disconnect", { method: "DELETE" });
  if (!res.ok) throw new Error("disconnect_failed");
}
