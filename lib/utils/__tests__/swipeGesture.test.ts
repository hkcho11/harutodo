import { describe, expect, it } from "vitest";
import {
  MIN_HORIZONTAL_SWIPE_DISTANCE,
  getHorizontalSwipeDirection,
} from "@/lib/utils/swipeGesture";

describe("getHorizontalSwipeDirection", () => {
  it("최소 거리보다 짧은 가로 움직임은 무시한다", () => {
    expect(
      getHorizontalSwipeDirection({
        deltaX: MIN_HORIZONTAL_SWIPE_DISTANCE - 1,
        deltaY: 0,
      })
    ).toBeNull();
  });

  it("세로 이동이 큰 제스처는 무시한다", () => {
    expect(
      getHorizontalSwipeDirection({ deltaX: 100, deltaY: 80 })
    ).toBeNull();
    expect(
      getHorizontalSwipeDirection({ deltaX: 70, deltaY: 100 })
    ).toBeNull();
  });

  it("의도가 분명한 좌우 스와이프만 판별한다", () => {
    expect(
      getHorizontalSwipeDirection({ deltaX: -120, deltaY: 40 })
    ).toBe("left");
    expect(
      getHorizontalSwipeDirection({ deltaX: 120, deltaY: 40 })
    ).toBe("right");
  });
});
