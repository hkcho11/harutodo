"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

interface Props {
  missing: "me" | "partner";
  userId: string;
}

// (main) 진입 시 본인/파트너 profiles row가 누락된 데이터 오류 화면.
// 이 화면은 redirect 하지 않는다 — /couple/connect ↔ / 리다이렉트 루프 방지.
export default function ProfileErrorScreen({ missing, userId }: Props) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-haru-surface p-6 shadow-card">
        <div className="mb-3 text-3xl">⚠️</div>
        <h1 className="mb-2 text-lg font-bold text-haru-text">
          프로필을 불러올 수 없습니다
        </h1>
        <p className="mb-1 text-sm text-haru-muted">
          {missing === "me"
            ? "본인 프로필을 조회할 수 없습니다."
            : "파트너 프로필을 조회할 수 없습니다."}
        </p>
        <p className="mb-1 text-xs text-haru-muted">
          데이터가 누락됐거나 접근 권한 문제일 수 있습니다.
        </p>
        <p className="mb-5 text-xs text-haru-muted break-all">
          user.id: {userId}
        </p>
        <Button variant="ghost" onClick={handleLogout} isLoading={loading}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}
