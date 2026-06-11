"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingScreen from "@/components/common/LoadingScreen";

const REMEMBER_KEY = "harutodo_saved_email";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setValue("email", saved);
      setRememberEmail(true);
    }
  }, [setValue]);

  const onSubmit = async (values: FormValues) => {
    setServerError("");

    if (rememberEmail) {
      localStorage.setItem(REMEMBER_KEY, values.email);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError("이메일 또는 비밀번호를 확인해주세요");
      return;
    }

    setIsNavigating(true);
    router.push("/");
  };

  if (isSubmitting || isNavigating) return <LoadingScreen />;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <Image
            src="/icons/icon-logo.png"
            alt="하루투두"
            width={80}
            height={80}
            className="mb-3 mx-auto"
            priority
          />
          <h1 className="text-2xl font-bold text-haru-text">하루투두</h1>
          <p className="mt-1 text-sm text-haru-muted">커플의 하루를 함께</p>
        </div>

        {/* 카드 */}
        <div className="rounded-3xl bg-haru-surface p-6 shadow-card">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="이메일"
              id="email"
              type="email"
              placeholder="이메일 주소"
              autoComplete="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="비밀번호"
              id="password"
              type="password"
              placeholder="비밀번호"
              autoComplete="current-password"
              {...register("password")}
              error={errors.password?.message}
            />

            {/* 이메일 기억하기 */}
            <label className="flex cursor-pointer items-center gap-2.5 self-start">
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
                  rememberEmail
                    ? "border-haru-primary-active bg-haru-primary-active"
                    : "border-haru-border bg-transparent"
                )}
              >
                {rememberEmail && (
                  <Check className="h-3 w-3 stroke-[3] text-white" />
                )}
              </div>
              <input
                type="checkbox"
                checked={rememberEmail}
                onChange={(e) => setRememberEmail(e.target.checked)}
                className="sr-only"
              />
              <span className="text-sm text-haru-muted">이메일 기억하기</span>
            </label>

            {serverError && (
              <p className="text-sm text-haru-danger">{serverError}</p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="mt-1">
              로그인
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-haru-muted">
          계정이 없나요?{" "}
          <Link href="/signup" className="font-semibold text-haru-text underline underline-offset-2 decoration-haru-primary-active">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
