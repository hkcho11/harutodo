"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchKoreanHolidays } from "@/lib/services/holidayService";
import type { KoreanHoliday } from "@/types/domain/holiday";

const LOCAL_CACHE_PREFIX = "harutodo-korean-holidays-v2";

interface StoredHoliday {
  date: string;
  name: string;
  isSubstitute: boolean;
}

function cacheKey(year: number): string {
  return `${LOCAL_CACHE_PREFIX}:${year}`;
}

function readLocalCache(years: number[]): Map<string, KoreanHoliday> {
  const map = new Map<string, KoreanHoliday>();
  if (typeof window === "undefined") return map;

  for (const year of years) {
    try {
      const raw = window.localStorage.getItem(cacheKey(year));
      if (!raw) continue;
      const stored = JSON.parse(raw) as StoredHoliday[];
      for (const holiday of stored) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(holiday.date)) continue;
        map.set(holiday.date, {
          name: holiday.name,
          isSubstitute: holiday.isSubstitute,
        });
      }
    } catch {
      window.localStorage.removeItem(cacheKey(year));
    }
  }
  return map;
}

function writeLocalCache(
  holidays: ReadonlyMap<string, KoreanHoliday>,
  years: number[]
): void {
  if (typeof window === "undefined") return;

  for (const year of years) {
    const prefix = `${year}-`;
    const stored: StoredHoliday[] = [];
    for (const [date, holiday] of holidays) {
      if (!date.startsWith(prefix)) continue;
      stored.push({ date, name: holiday.name, isSubstitute: holiday.isSubstitute });
    }
    if (stored.length > 0) {
      window.localStorage.setItem(cacheKey(year), JSON.stringify(stored));
    }
  }
}

export function useKoreanHolidays(years: number[]): ReadonlyMap<string, KoreanHoliday> {
  const yearsKey = [...new Set(years)].sort((left, right) => left - right).join(",");
  const normalizedYears = useMemo(
    () => yearsKey.split(",").map(Number).filter(Number.isInteger),
    [yearsKey]
  );
  const [holidays, setHolidays] = useState<ReadonlyMap<string, KoreanHoliday>>(
    () => new Map()
  );

  useEffect(() => {
    let active = true;
    const local = readLocalCache(normalizedYears);
    // 연도 전환 즉시 마지막 공식 API 캐시를 보여준 뒤 최신 DB 캐시로 교체한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHolidays(local);

    const firstYear = normalizedYears[0];
    const lastYear = normalizedYears[normalizedYears.length - 1];
    if (firstYear === undefined || lastYear === undefined) return;

    void fetchKoreanHolidays(`${firstYear}-01-01`, `${lastYear}-12-31`)
      .then((official) => {
        if (!active || official.size === 0) return;
        writeLocalCache(official, normalizedYears);
        setHolidays(official);
      })
      .catch(() => {
        // DB/네트워크 장애 시 마지막 공식 API 로컬 캐시를 유지한다.
      });

    return () => {
      active = false;
    };
  }, [normalizedYears]);

  return holidays;
}
