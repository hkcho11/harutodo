import { describe, expect, it } from "vitest";
import { acknowledgeRelease, shouldShowRelease } from "@/lib/utils/releaseNotice";

function deviceStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

describe("기기별 업데이트 확인", () => {
  it("처음 진입과 확인하지 않은 재진입에는 안내한다", () => {
    const storage = deviceStorage();
    expect(shouldShowRelease(storage, "1.1.0")).toBe(true);
    expect(shouldShowRelease(storage, "1.1.0")).toBe(true);
  });
  it("확인한 버전만 숨기고 다음 버전은 다시 안내한다", () => {
    const storage = deviceStorage();
    expect(acknowledgeRelease(storage, "1.1.0")).toBe(true);
    expect(shouldShowRelease(storage, "1.1.0")).toBe(false);
    expect(shouldShowRelease(storage, "1.2.0")).toBe(true);
  });
  it("다른 기기의 확인 상태에 영향을 주지 않는다", () => {
    const first = deviceStorage();
    const second = deviceStorage();
    acknowledgeRelease(first, "1.1.0");
    expect(shouldShowRelease(second, "1.1.0")).toBe(true);
  });
  it("이전 버전으로 복구해도 확인한 기록을 잃지 않는다", () => {
    const storage = deviceStorage();
    acknowledgeRelease(storage, "1.1.0");
    acknowledgeRelease(storage, "1.2.0");
    expect(shouldShowRelease(storage, "1.1.0")).toBe(false);
  });
  it("저장소가 차단돼도 앱을 중단시키지 않는다", () => {
    const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(shouldShowRelease(blocked, "1.1.0")).toBe(true);
    expect(acknowledgeRelease(blocked, "1.1.0")).toBe(false);
  });
});
