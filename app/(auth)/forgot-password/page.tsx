"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { sendPasswordResetEmail } from "@/lib/services/authService";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const schema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    try {
      await sendPasswordResetEmail(values.email);
    } catch {
      // rate limit 등 실패 시에만 에러 노출, 이메일 미존재는 성공으로 처리
      setServerError("잠시 후 다시 시도해주세요");
      return;
    }
    setEmailSent(true);
  };

  if (emailSent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-3xl bg-haru-surface p-8 shadow-card text-center">
          <div className="mb-4 text-4xl">📬</div>
          <h1 className="mb-2 text-xl font-bold text-haru-text">
            메일함을 확인해주세요
          </h1>
          <p className="text-sm text-haru-muted">
            재설정 링크를 보냈습니다.
            <br />
            링크는 1시간 후 만료됩니다.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-semibold text-haru-text underline underline-offset-2 decoration-haru-primary-active"
          >
            로그인으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-haru-text">비밀번호 찾기</h1>
          <p className="mt-1 text-sm text-haru-muted">
            가입하신 이메일로 재설정 링크를 보내드려요
          </p>
        </div>

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
            {serverError && (
              <p className="text-sm text-haru-danger">{serverError}</p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="mt-1">
              재설정 링크 보내기
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-haru-muted">
          <Link
            href="/login"
            className="font-semibold text-haru-text underline underline-offset-2 decoration-haru-primary-active"
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
