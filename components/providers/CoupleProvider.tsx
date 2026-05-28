"use client";

import { useEffect, useRef } from "react";
import { useCoupleStore } from "@/store/useCoupleStore";
import type { Profile } from "@/types/couple";

interface Props {
  coupleId: string;
  me: Profile;
  partner: Profile;
  children: React.ReactNode;
}

// 서버 컴포넌트가 받아온 커플/프로필 정보를 첫 렌더 전에 zustand 스토어에 주입.
// React 19 권장 패턴: useRef의 null 체크로 정확히 한 번만 실행 (lint 룰 권고).
// 이렇게 하면 자식이 마운트되는 첫 렌더부터 store가 채워져 있어 hydration flicker가 없다.
// prop이 바뀌면(예: 새로 연결된 경우) effect에서 다시 동기화.
export default function CoupleProvider({
  coupleId,
  me,
  partner,
  children,
}: Props) {
  const initRef = useRef<true | null>(null);
  if (initRef.current === null) {
    useCoupleStore.setState({ coupleId, me, partner });
    initRef.current = true;
  }

  useEffect(() => {
    useCoupleStore.setState({ coupleId, me, partner });
  }, [coupleId, me, partner]);

  return <>{children}</>;
}
