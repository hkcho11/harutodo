"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { ExternalLink, MapPin } from "lucide-react";
import type { SelectedLocation } from "@/types/event";

interface Props {
  location: SelectedLocation;
}

export default function LocationMapPreview({ location }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [sdkLoaded, setSdkLoaded] = useState(
    () => typeof window !== "undefined" && "kakao" in (window as object)
  );
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (!sdkLoaded || !mapRef.current) return;
    const container = mapRef.current;
    let mounted = true;

    // 5초 내 지도 초기화 안 되면 실패로 처리 (도메인 미등록 등)
    const failTimer = setTimeout(() => {
      if (mounted && !mapReady) setMapFailed(true);
    }, 5000);

    kakao.maps.load(() => {
      if (!mounted || !mapRef.current) return;
      clearTimeout(failTimer);
      const center = new kakao.maps.LatLng(location.latitude, location.longitude);
      const map = new kakao.maps.Map(container, { center, level: 3 });
      new kakao.maps.Marker({ position: center, map });
      setMapReady(true);
    });

    return () => {
      mounted = false;
      clearTimeout(failTimer);
    };
  }, [sdkLoaded, location.latitude, location.longitude, mapReady]);

  return (
    <div className="overflow-hidden rounded-2xl border border-haru-border">
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => setSdkLoaded(true)}
      />

      {mapFailed ? (
        <div className="flex items-center justify-center bg-haru-surface px-4 py-6 text-center" style={{ height: 180 }}>
          <div>
            <MapPin className="mx-auto mb-2 h-6 w-6 text-haru-muted" />
            <p className="text-xs text-haru-muted">
              지도를 불러올 수 없어요
            </p>
            <p className="mt-0.5 text-xs text-haru-muted">
              카카오 개발자 콘솔에서 Web 플랫폼에
              <br />
              <span className="font-medium">http://localhost:3000</span> 을 추가해주세요
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={mapRef}
          className="w-full bg-haru-surface"
          style={{ height: 180 }}
        />
      )}

      <div className="flex items-center gap-1.5 bg-haru-surface px-3 py-2">
        <span className="flex-1 truncate text-xs text-haru-text">{location.name}</span>
        <a
          href={location.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1 text-xs text-haru-muted active:text-haru-text"
        >
          카카오맵
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
