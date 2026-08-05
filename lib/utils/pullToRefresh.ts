export const REFRESH_THRESHOLD = 64;
export const MAX_PULL_DISTANCE = 92;
export const PULL_RESISTANCE = 0.45;

export function calculatePullDistance(args: {
  deltaX: number;
  deltaY: number;
}): number | null {
  if (args.deltaY <= 0 || Math.abs(args.deltaX) > Math.abs(args.deltaY)) {
    return null;
  }

  return Math.min(MAX_PULL_DISTANCE, args.deltaY * PULL_RESISTANCE);
}

export function shouldTriggerRefresh(distance: number): boolean {
  return distance >= REFRESH_THRESHOLD;
}
