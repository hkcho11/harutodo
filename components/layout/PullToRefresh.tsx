"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  REFRESH_THRESHOLD,
  calculatePullDistanceFromTop,
  shouldTriggerRefresh,
} from "@/lib/utils/pullToRefresh";

type RefreshHandler = () => void | Promise<void>;
type RegisterRefreshHandler = (handler: RefreshHandler) => () => void;

const RefreshContext = createContext<RegisterRefreshHandler | null>(null);

const REFRESH_HOLD_DISTANCE = 52;

export function useAppRefresh(handler: RefreshHandler) {
  const register = useContext(RefreshContext);
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!register) return;
    return register(() => handlerRef.current());
  }, [register]);
}

export default function PullToRefresh({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const scrollRef = useRef<HTMLElement>(null);
  const handlersRef = useRef(new Set<RefreshHandler>());
  const startRef = useRef({ x: 0, y: 0 });
  const startScrollTopRef = useRef(0);
  const trackingRef = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const [distance, setDistance] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const updateDistance = useCallback((next: number) => {
    distanceRef.current = next;
    setDistance(next);
  }, []);

  const register = useCallback<RegisterRefreshHandler>((handler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    updateDistance(REFRESH_HOLD_DISTANCE);

    try {
      const minimumIndicatorTime = new Promise<void>((resolve) => {
        window.setTimeout(resolve, 450);
      });
      const handlers = Array.from(handlersRef.current);
      await Promise.allSettled([
        ...handlers.map((handler) => Promise.resolve().then(handler)),
        minimumIndicatorTime,
      ]);
      router.refresh();
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      updateDistance(0);
    }
  }, [router, updateDistance]);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const getScrollTop = () =>
      Math.max(
        scrollElement.scrollTop,
        document.scrollingElement?.scrollTop ?? 0
      );

    const handleTouchStart = (event: TouchEvent) => {
      if (
        event.touches.length !== 1 ||
        refreshingRef.current ||
        getScrollTop() > 0
      ) {
        trackingRef.current = false;
        return;
      }

      const touch = event.touches[0];
      startRef.current = { x: touch.clientX, y: touch.clientY };
      startScrollTopRef.current = getScrollTop();
      trackingRef.current = true;
      setDragging(false);
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!trackingRef.current || event.touches.length !== 1) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - startRef.current.x;
      const deltaY = touch.clientY - startRef.current.y;
      const pullDistance = calculatePullDistanceFromTop({
        startScrollTop: startScrollTopRef.current,
        currentScrollTop: getScrollTop(),
        deltaX,
        deltaY,
      });

      if (pullDistance === null) {
        trackingRef.current = false;
        setDragging(false);
        updateDistance(0);
        return;
      }

      setDragging(true);
      if (event.cancelable) event.preventDefault();
      updateDistance(pullDistance);
    };

    const handleTouchEnd = () => {
      if (!trackingRef.current) return;
      trackingRef.current = false;
      setDragging(false);

      if (shouldTriggerRefresh(distanceRef.current)) {
        void refresh();
      } else {
        updateDistance(0);
      }
    };

    const handleTouchCancel = () => {
      trackingRef.current = false;
      setDragging(false);
      updateDistance(0);
    };

    scrollElement.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    scrollElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    scrollElement.addEventListener("touchend", handleTouchEnd);
    scrollElement.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      scrollElement.removeEventListener("touchstart", handleTouchStart);
      scrollElement.removeEventListener("touchmove", handleTouchMove);
      scrollElement.removeEventListener("touchend", handleTouchEnd);
      scrollElement.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [refresh, updateDistance]);

  const readyToRefresh = distance >= REFRESH_THRESHOLD;
  const indicatorLabel = refreshing
    ? "새로고침 중..."
    : readyToRefresh
      ? "놓아서 새로고침"
      : "당겨서 새로고침";

  return (
    <RefreshContext.Provider value={register}>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
          style={{
            opacity: Math.min(1, distance / 24),
            transform: `translateY(calc(-100% + ${distance}px))`,
            transition: dragging ? "none" : "opacity 180ms, transform 180ms",
          }}
          role="status"
          aria-live="polite"
          aria-hidden={distance === 0 && !refreshing}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-haru-surface text-haru-text shadow-card">
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
              style={
                refreshing
                  ? undefined
                  : {
                      transform: `rotate(${Math.min(
                        180,
                        (distance / REFRESH_THRESHOLD) * 180
                      )}deg)`,
                    }
              }
              aria-hidden="true"
            />
          </div>
          <span className="sr-only">{indicatorLabel}</span>
        </div>

        <main
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-y-contain pb-[calc(56px+env(safe-area-inset-bottom,0px))]"
          style={{
            transform: distance > 0 ? `translateY(${distance}px)` : undefined,
            transition: dragging ? "none" : "transform 180ms ease-out",
            willChange: distance > 0 ? "transform" : "auto",
          }}
        >
          {children}
        </main>
      </div>
    </RefreshContext.Provider>
  );
}
