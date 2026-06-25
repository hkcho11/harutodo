"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
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

function EyeToggle({
  show,
  onToggle,
}: {
  show: boolean;
  onToggle: () => void;
}) {
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setServerError("");
    try {
      await resetPassword(values.password);
      router.push("/login");
    } catch {
      setServerError("비밀번호 변경에 실패했어요. 다시 시도해주세요");
    }
  };

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
