"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, User } from "lucide-react";
import { useFeedbackIndicators } from "@/components/feedback/FeedbackIndicatorsProvider";

const tabs = [
  { href: "/", label: "홈", icon: Home },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/mypage", label: "마이페이지", icon: User },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();
  const { state } = useFeedbackIndicators();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-haru-surface border-t border-haru-border"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 40,
      }}
    >
      <div className="flex h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors min-h-[44px] ${
                isActive ? "text-haru-text" : "text-haru-muted"
              }`}
            >
              <span className="relative"><Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />{href==="/mypage"&&(state.unreadReplies>0||state.pendingFeedback>0)&&<span className="absolute -right-2 -top-1 rounded-full bg-haru-accent-soft px-1 text-xs font-bold" aria-label="의견함에 확인할 항목이 있어요">!</span>}</span>
              <span className={`${isActive ? "font-bold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
