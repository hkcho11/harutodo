import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";
export default function FeedbackHeader({
  title,
  back = "/feedback",
}: {
  title: string;
  back?: string;
}) {
  return (
    <header className="flex items-center gap-2 bg-haru-surface px-3 py-3">
      <Link
        href={back}
        aria-label="뒤로"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-haru-primary"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <h1 className="flex-1 text-base font-bold">{title}</h1>
      <Link
        href="/feedback/settings"
        aria-label="의견함 알림 설정"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-haru-primary"
      >
        <Bell className="h-5 w-5" />
      </Link>
    </header>
  );
}
