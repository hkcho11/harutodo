"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setServerError("이메일 또는 비밀번호를 확인해주세요");
      return;
    }

    router.push("/");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-haru-primary-soft text-3xl shadow-card">
            🗓️
          </div>
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
          <Link href="/signup" className="font-semibold text-haru-primary">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
