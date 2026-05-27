"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

type InviteCode = {
  code: string;
  expires_at: string;
};

type UseInviteResult = {
  success: boolean;
  error?: string;
  couple_id?: string;
};

const CONNECT_ERROR_MAP: Record<string, string> = {
  invalid_code: "유효하지 않거나 만료된 코드입니다",
  already_connected: "이미 커플과 연결되어 있습니다",
};

export default function CoupleConnectPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [partnerCode, setPartnerCode] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const [isCheckingCouple, setIsCheckingCouple] = useState(false);

  useEffect(() => {
    const checkCouple = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("couples")
        .select("id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .maybeSingle();
      if (data) router.replace("/");
    };
    checkCouple();
  }, [supabase, router]);

  const generateCode = async () => {
    setIsGenerating(true);
    const { data, error } = await supabase.rpc("create_invite_code");
    setIsGenerating(false);
    if (error || !data) return;
    setInviteCode(data as unknown as InviteCode);
  };

  const copyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitCode = async () => {
    const trimmed = partnerCode.trim().toUpperCase();
    if (trimmed.length < 8) return;
    setIsConnecting(true);
    setConnectError("");
    const { data, error } = await supabase.rpc("use_invite_code", {
      p_code: trimmed,
    });
    setIsConnecting(false);

    if (error || !data) {
      setConnectError("연결에 실패했습니다. 다시 시도해주세요");
      return;
    }

    const result = data as unknown as UseInviteResult;
    if (result.success) {
      router.push("/");
    } else {
      setConnectError(
        CONNECT_ERROR_MAP[result.error ?? ""] ?? "연결에 실패했습니다"
      );
    }
  };

  const checkCoupleStatus = async () => {
    setIsCheckingCouple(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsCheckingCouple(false);
      return;
    }
    const { data } = await supabase
      .from("couples")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .maybeSingle();
    setIsCheckingCouple(false);
    if (data) router.push("/");
  };

  const expiresLabel = inviteCode
    ? new Date(inviteCode.expires_at).toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex min-h-dvh flex-col px-4 py-8">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-haru-secondary-soft text-2xl">
          💑
        </div>
        <h1 className="text-xl font-bold text-haru-text">커플 연결</h1>
        <p className="mt-1 text-sm text-haru-muted">코드를 교환해서 연결해요</p>
      </div>

      {/* 내 초대 코드 */}
      <section className="mb-5">
        <h2 className="mb-3 text-sm font-semibold text-haru-muted uppercase tracking-wide">
          내 초대 코드
        </h2>
        {inviteCode ? (
          <div className="rounded-3xl bg-haru-surface p-5 shadow-card">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl font-bold tracking-[0.2em] text-haru-text">
                {inviteCode.code}
              </span>
              <button
                onClick={copyCode}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-haru-primary-soft px-3 py-2 text-sm font-semibold text-haru-primary active:scale-95 transition-transform"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-haru-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
            <p className="mb-4 text-xs text-haru-muted">만료: {expiresLabel}</p>
            <Button
              variant="ghost"
              onClick={checkCoupleStatus}
              isLoading={isCheckingCouple}
            >
              연결 확인
            </Button>
          </div>
        ) : (
          <Button onClick={generateCode} isLoading={isGenerating}>
            코드 생성
          </Button>
        )}
      </section>

      {/* 구분선 */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-haru-border" />
        <span className="text-sm text-haru-muted">또는</span>
        <div className="h-px flex-1 bg-haru-border" />
      </div>

      {/* 상대 코드 입력 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-haru-muted uppercase tracking-wide">
          상대방 코드 입력
        </h2>
        <div className="rounded-3xl bg-haru-surface p-5 shadow-card">
          <div className="flex flex-col gap-3">
            <Input
              placeholder="8자리 초대 코드"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="uppercase tracking-widest text-center font-bold text-lg"
              error={connectError}
            />
            <Button
              onClick={submitCode}
              isLoading={isConnecting}
              disabled={partnerCode.trim().length < 8}
            >
              연결하기
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
