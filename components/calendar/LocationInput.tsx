"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import type { SelectedLocation } from "@/types/event";

interface KakaoDoc {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string; // longitude
  y: string; // latitude
  place_url: string;
}

interface SearchResponse {
  documents: KakaoDoc[];
  error?: string;
}

interface Props {
  value: SelectedLocation | null;
  onChange: (loc: SelectedLocation | null) => void;
}

export default function LocationInput({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => {},
      { timeout: 5000 }
    );
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setHasError(null);
      return;
    }

    // 이전 요청 취소
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setHasError(null);
    setResults([]);
    setOpen(true);

    try {
      const params = new URLSearchParams({ query: q.trim() });
      if (coordsRef.current) {
        params.set("x", String(coordsRef.current.lng));
        params.set("y", String(coordsRef.current.lat));
      }

      const res = await fetch(`/api/locations/search?${params}`, {
        signal: abortRef.current.signal,
      });

      const data = (await res.json()) as SearchResponse;

      if (!res.ok || data.error) {
        setHasError(data.error ?? "unknown");
        setResults([]);
      } else {
        setHasError(null);
        setResults(data.documents ?? []);
      }
      setOpen(true);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setHasError("network");
      setResults([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (!q.trim()) {
      setOpen(false);
      setResults([]);
      setHasError(null);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(q), 300);
  };

  const handleSelect = (doc: KakaoDoc) => {
    onChange({
      name: doc.place_name,
      address: doc.road_address_name || doc.address_name,
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
      provider: "kakao",
      providerId: doc.id,
      url: doc.place_url,
    });
    setQuery("");
    setResults([]);
    setOpen(false);
    setHasError(null);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setResults([]);
    setOpen(false);
    setHasError(null);
  };

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-haru-primary bg-haru-primary-soft px-3 py-2.5">
        <MapPin className="h-4 w-4 shrink-0 text-haru-text" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-haru-text">{value.name}</p>
          <p className="truncate text-xs text-haru-muted">{value.address}</p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 p-1 text-haru-muted active:text-haru-text"
          aria-label="장소 삭제"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 h-4 w-4 text-haru-muted" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="장소 검색"
          style={{ fontSize: 16 }}
          className="min-h-[44px] w-full rounded-2xl border border-haru-border bg-haru-surface pl-9 pr-3 text-haru-text placeholder:text-haru-muted focus:border-haru-primary focus:outline-none"
        />
      </div>

      {open && (
        <div className="mt-1 overflow-hidden rounded-2xl border border-haru-border bg-haru-surface shadow-card">
          {hasError ? (
            <p className="px-3 py-3 text-sm text-haru-danger">
              {hasError === "kakao_403"
                ? "카카오맵 API 권한 오류예요. 카카오 개발자 콘솔에서 카카오맵 제품을 활성화해주세요."
                : "검색 중 오류가 발생했어요. 잠시 후 다시 시도해주세요."}
            </p>
          ) : loading ? (
            <div className="flex items-center gap-2 px-3 py-3">
              <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-haru-border border-t-haru-primary" />
              <p className="text-sm text-haru-muted">검색 중...</p>
            </div>
          ) : results.length > 0 ? (
            <ul>
              {results.map((doc, i) => (
                <li
                  key={doc.id}
                  className={i < results.length - 1 ? "border-b border-haru-border" : ""}
                >
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(doc)}
                    className="flex w-full flex-col gap-0.5 px-3 py-3 text-left active:bg-haru-primary-soft"
                  >
                    <span className="text-sm font-medium text-haru-text">{doc.place_name}</span>
                    <span className="text-xs text-haru-muted">
                      {doc.road_address_name || doc.address_name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-haru-muted">검색 결과가 없어요</p>
          )}
        </div>
      )}
    </div>
  );
}
