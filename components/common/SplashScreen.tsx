"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";

export default function SplashScreen() {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1400);
    const hideTimer = setTimeout(() => setHidden(true), 1900);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex flex-col items-center justify-center bg-haru-bg transition-opacity duration-500",
        fading ? "opacity-0" : "opacity-100"
      )}
      style={{ backgroundColor: "#FAFCF5" }}
    >
      <Image
        src="/icons/icon-logo.png"
        alt="하루투두"
        width={88}
        height={88}
        priority
        className="mb-5 drop-shadow-sm"
      />
      <h1 className="text-2xl font-bold tracking-tight text-haru-text">
        하루투두
      </h1>
      <p className="mt-1.5 text-sm text-haru-muted">커플의 하루를 함께</p>
    </div>
  );
}
