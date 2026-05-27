"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";

export default function MyPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex flex-col px-4 py-6">
      <h1 className="mb-6 text-xl font-bold text-haru-text">마이페이지</h1>
      <div className="rounded-3xl bg-haru-surface p-5 shadow-card">
        <Button variant="ghost" onClick={handleLogout} isLoading={isLoading}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}
