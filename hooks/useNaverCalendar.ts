"use client";

import { useState, useEffect } from "react";
import type { NaverCalendarEvent } from "@/types/naver";

export function useNaverCalendar(year: number, month: number) {
  const [events, setEvents] = useState<NaverCalendarEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/naver/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: { events?: NaverCalendarEvent[]; connected?: boolean }) => {
        if (cancelled) return;
        setEvents(data.events ?? []);
        setConnected(data.connected ?? false);
      })
      .catch(() => {
        if (!cancelled) {
          setEvents([]);
          setConnected(false);
        }
      });

    return () => { cancelled = true; };
  }, [year, month]);

  return { events, connected };
}
