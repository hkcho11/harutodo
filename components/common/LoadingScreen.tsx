"use client";

import Image from "next/image";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-haru-bg">
      <Image
        src="/icons/icon-logo.png"
        alt="Harutodo"
        width={64}
        height={64}
        className="mb-5"
        priority
      />
      <div className="h-6 w-6 animate-spin rounded-full border-[3px] border-haru-primary/30 border-t-haru-primary" />
    </div>
  );
}
