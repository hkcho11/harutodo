"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, User } from "lucide-react";

const tabs = [
  { href: "/", label: "홈", icon: Home },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/mypage", label: "마이페이지", icon: User },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex h-14">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors min-h-[44px] ${
                isActive ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
