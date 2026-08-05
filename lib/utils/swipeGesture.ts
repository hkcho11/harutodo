export const MIN_HORIZONTAL_SWIPE_DISTANCE = 80;
export const HORIZONTAL_SWIPE_DIRECTION_RATIO = 1.5;

export type HorizontalSwipeDirection = "left" | "right";

export function getHorizontalSwipeDirection(args: {
  deltaX: number;
  deltaY: number;
}): HorizontalSwipeDirection | null {
  const horizontalDistance = Math.abs(args.deltaX);
  const verticalDistance = Math.abs(args.deltaY);

  if (
    horizontalDistance < MIN_HORIZONTAL_SWIPE_DISTANCE ||
    horizontalDistance < verticalDistance * HORIZONTAL_SWIPE_DIRECTION_RATIO
  ) {
    return null;
  }

  return args.deltaX < 0 ? "left" : "right";
}
