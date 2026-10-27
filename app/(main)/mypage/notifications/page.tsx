import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NotificationSettingsPanel from "@/components/mypage/NotificationSettingsPanel";

export default function NotificationSettingsPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <header className="flex items-center gap-2">
        <Link
          href="/mypage"
          aria-label="마이페이지로 돌아가기"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-haru-text active:bg-haru-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-haru-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-haru-text">알림 설정</h1>
      </header>
      <NotificationSettingsPanel />
    </div>
  );
}
