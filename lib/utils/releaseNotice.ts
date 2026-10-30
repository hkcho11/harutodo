type NoticeStorage = Pick<Storage, "getItem" | "setItem">;
const key = (version: string) => `harutodo:release-ack:${version}`;

export function shouldShowRelease(storage: NoticeStorage, version: string): boolean {
  try { return storage.getItem(key(version)) !== "1"; } catch { return true; }
}

export function acknowledgeRelease(storage: NoticeStorage, version: string): boolean {
  try { storage.setItem(key(version), "1"); return true; } catch { return false; }
}
