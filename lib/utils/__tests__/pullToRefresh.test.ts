import { describe, expect, it } from "vitest";
import {
  MAX_PULL_DISTANCE,
  calculatePullDistance,
  shouldTriggerRefresh,
} from "@/lib/utils/pullToRefresh";

describe("calculatePullDistance", () => {
  it("아래로 당기는 세로 제스처에 저항을 적용한다", () => {
    expect(calculatePullDistance({ deltaX: 4, deltaY: 100 })).toBe(45);
  });

  it("가로 스와이프와 위쪽 이동은 Pull-to-Refresh로 처리하지 않는다", () => {
    expect(calculatePullDistance({ deltaX: 80, deltaY: 30 })).toBeNull();
    expect(calculatePullDistance({ deltaX: 0, deltaY: -40 })).toBeNull();
  });

  it("과도하게 당겨도 표시 거리를 제한한다", () => {
    expect(calculatePullDistance({ deltaX: 0, deltaY: 500 })).toBe(
      MAX_PULL_DISTANCE
    );
  });
});

describe("shouldTriggerRefresh", () => {
  it("임계 거리 이상에서만 새로고침한다", () => {
    expect(shouldTriggerRefresh(63)).toBe(false);
    expect(shouldTriggerRefresh(64)).toBe(true);
  });
});
