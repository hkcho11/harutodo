"use client";

import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resetPassword } from "@/lib/services/authService";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const schema = z
  .object({
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않아요",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
      className="flex h-8 w-8 items-center justify-center rounded-full text-haru-muted transition-colors active:bg-haru-primary-soft active:text-haru-text"
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

type PageState = "loading" | "ready" | "error";

function Spinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-haru-primary border-t-transparent" />
    </div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPageState("error");
      return;
    }
    const supabase = createClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setPageState("error");
        } else {
          setPageState("ready");
        }
      })
      .catch(() => setPageState("error"));
  }, [searchParams]);

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    try {
      await resetPassword(values.password);
      router.push("/login");
    } catch {
      setServerError("비밀번호 변경에 실패했어요. 다시 시도해주세요");
    }
  };

  if (pageState === "loading") {
    return <Spinner />;
  }

  if (pageState === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-haru-surface p-8 shadow-card text-center">
          <div className="mb-4 text-4xl">🔗</div>
          <h1 className="mb-2 text-xl font-bold text-haru-text">
            링크를 사용할 수 없어요
          </h1>
          <p className="text-sm text-haru-muted">
            링크가 만료됐거나 이미 사용된 링크예요.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block text-sm font-semibold text-haru-text underline underline-offset-2 decoration-haru-primary-active"
          >
            다시 요청하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-haru-text">새 비밀번호 설정</h1>
          <p className="mt-1 text-sm text-haru-muted">
            새로 사용할 비밀번호를 입력해주세요
          </p>
        </div>

        <div className="rounded-3xl bg-haru-surface p-6 shadow-card">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="새 비밀번호"
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="6자 이상"
              autoComplete="new-password"
              suffix={
                <EyeToggle
                  show={showPassword}
                  onToggle={() => setShowPassword((v) => !v)}
                />
              }
              {...register("password")}
              error={errors.password?.message}
            />
            <Input
              label="비밀번호 확인"
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="비밀번호 재입력"
              autoComplete="new-password"
              suffix={
                <EyeToggle
                  show={showConfirm}
                  onToggle={() => setShowConfirm((v) => !v)}
                />
              }
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
            />
            {serverError && (
              <p className="text-sm text-haru-danger">{serverError}</p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="mt-1">
              비밀번호 변경
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
