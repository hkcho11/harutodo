"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { ExternalLink } from "lucide-react";
import type { SelectedLocation } from "@/types/event";

interface Props {
  location: SelectedLocation;
}

export default function LocationMapPreview({ location }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // Initialize to true if SDK was already loaded by a previous mount of this component
  const [sdkLoaded, setSdkLoaded] = useState(
    () => typeof window !== "undefined" && "kakao" in (window as object)
  );

  useEffect(() => {
    if (!sdkLoaded || !mapRef.current) return;
    const container = mapRef.current;
    kakao.maps.load(() => {
      const center = new kakao.maps.LatLng(location.latitude, location.longitude);
      const map = new kakao.maps.Map(container, { center, level: 3 });
      new kakao.maps.Marker({ position: center, map });
    });
  }, [sdkLoaded, location.latitude, location.longitude]);

  return (
    <div className="overflow-hidden rounded-2xl border border-haru-border">
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_KEY}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => setSdkLoaded(true)}
      />
      <div ref={mapRef} className="w-full" style={{ height: 180 }} />
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
