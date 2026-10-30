"use client";
import { Fragment } from "react";
import Link from "next/link";
import { useFeedbackIndicators } from "./FeedbackIndicatorsProvider";

// A new account must never inherit mounted private detail, draft or list state.
export default function FeedbackSessionBoundary({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { state } = useFeedbackIndicators();
  if (!state.userId)
    return (
      <div role="status" className="space-y-4 px-5 py-8 text-sm text-haru-text">
        <p>계정을 안전하게 확인하고 있어요.</p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-xl bg-haru-primary px-4"
        >
          로그인 화면으로
        </Link>
      </div>
    );
  if (admin && !state.isAdmin) return <div className="space-y-4 px-5 py-8 text-sm"><p>사용자 의견 관리 권한을 확인할 수 없어요.</p><Link href="/feedback" className="inline-flex min-h-11 items-center rounded-xl bg-haru-primary px-4">내 의견함으로</Link></div>;
  return <Fragment key={state.userId}>{children}</Fragment>;
}
