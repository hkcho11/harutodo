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
  display_name: z.string().min(1, "닉네임을 입력해주세요"),
  email: z.string().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
});

type FormValues = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { display_name: values.display_name } },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setServerError("이미 가입된 이메일입니다");
      } else {
        setServerError("회원가입에 실패했습니다. 다시 시도해주세요");
      }
      return;
    }

    if (data.session) {
      router.push("/couple/connect");
    } else {
      setEmailSent(true);
    }
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
            가입하신 이메일로 인증 링크를 보냈습니다.
            <br />
            인증 후 로그인해주세요.
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
        {/* 헤더 */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-haru-text">회원가입</h1>
          <p className="mt-1 text-sm text-haru-muted">하루투두와 함께 시작해요</p>
        </div>

        {/* 카드 */}
        <div className="rounded-3xl bg-haru-surface p-6 shadow-card">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="닉네임"
              id="display_name"
              placeholder="상대방에게 보일 이름"
              autoComplete="nickname"
              {...register("display_name")}
              error={errors.display_name?.message}
            />
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
              placeholder="6자 이상"
              autoComplete="new-password"
              {...register("password")}
              error={errors.password?.message}
            />
            {serverError && (
              <p className="text-sm text-haru-danger">{serverError}</p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="mt-1">
              회원가입
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-haru-muted">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-semibold text-haru-text underline underline-offset-2 decoration-haru-primary-active">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
