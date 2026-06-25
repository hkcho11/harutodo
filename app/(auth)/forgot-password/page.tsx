"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import {
  sendPasswordResetEmail,
  verifyPasswordResetOtp,
  resetPassword,
} from "@/lib/services/authService";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Step = "email" | "code" | "password";

const emailSchema = z.object({
  email: z.string().email("올바른 이메일을 입력해주세요"),
});

const codeSchema = z.object({
  code: z
    .string()
    .min(1, "코드를 입력해주세요")
    .regex(/^\d+$/, "숫자를 입력해주세요"),
});

const passwordSchema = z
  .object({
    password: z.string().min(6, "비밀번호는 6자 이상이어야 합니다"),
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않아요",
    path: ["confirmPassword"],
  });

type EmailValues = z.infer<typeof emailSchema>;
type CodeValues = z.infer<typeof codeSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

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

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
  });
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmitEmail = async (values: EmailValues) => {
    setServerError("");
    try {
      await sendPasswordResetEmail(values.email);
      setEmail(values.email);
      setStep("code");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("rate limit") || message.includes("429")) {
        setServerError("요청이 너무 많아요. 잠시 후 다시 시도해주세요");
      } else {
        setServerError("잠시 후 다시 시도해주세요");
      }
    }
  };

  const onSubmitCode = async (values: CodeValues) => {
    setServerError("");
    try {
      await verifyPasswordResetOtp(email, values.code);
      setStep("password");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("expired") || message.includes("invalid")) {
        setServerError("코드가 만료됐거나 올바르지 않아요. 이메일을 다시 요청해주세요");
      } else {
        setServerError("코드 확인에 실패했어요. 다시 시도해주세요");
      }
    }
  };

  const onSubmitPassword = async (values: PasswordValues) => {
    setServerError("");
    try {
      await resetPassword(values.password);
      router.push("/login");
    } catch {
      setServerError("비밀번호 변경에 실패했어요. 다시 시도해주세요");
    }
  };

  const goBackToEmail = () => {
    setStep("email");
    setServerError("");
    codeForm.reset();
  };

  const headers: Record<Step, { title: string; desc: string }> = {
    email: {
      title: "비밀번호 찾기",
      desc: "가입하신 이메일로 재설정 코드를 보내드려요",
    },
    code: {
      title: "코드 입력",
      desc: `${email}로 보낸 재설정 코드를 입력해주세요`,
    },
    password: {
      title: "새 비밀번호 설정",
      desc: "새로 사용할 비밀번호를 입력해주세요",
    },
  };

  const { title, desc } = headers[step];

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-haru-text">{title}</h1>
          <p className="mt-1 text-sm text-haru-muted">{desc}</p>
        </div>

        <div className="rounded-3xl bg-haru-surface p-6 shadow-card">
          {step === "email" && (
            <form
              onSubmit={emailForm.handleSubmit(onSubmitEmail)}
              className="flex flex-col gap-4"
            >
              <Input
                label="이메일"
                id="email"
                type="email"
                placeholder="이메일 주소"
                autoComplete="email"
                {...emailForm.register("email")}
                error={emailForm.formState.errors.email?.message}
              />
              {serverError && (
                <p className="text-sm text-haru-danger">{serverError}</p>
              )}
              <Button
                type="submit"
                isLoading={emailForm.formState.isSubmitting}
                className="mt-1"
              >
                재설정 코드 보내기
              </Button>
            </form>
          )}

          {step === "code" && (
            <form
              onSubmit={codeForm.handleSubmit(onSubmitCode)}
              className="flex flex-col gap-4"
            >
              <Input
                label="인증 코드"
                id="code"
                type="text"
                inputMode="numeric"
                placeholder="재설정 코드"
                autoComplete="one-time-code"
                maxLength={10}
                autoFocus
                {...codeForm.register("code")}
                error={codeForm.formState.errors.code?.message}
              />
              {serverError && (
                <p className="text-sm text-haru-danger">{serverError}</p>
              )}
              <Button
                type="submit"
                isLoading={codeForm.formState.isSubmitting}
                className="mt-1"
              >
                확인
              </Button>
              <button
                type="button"
                onClick={goBackToEmail}
                className="py-2 text-sm text-haru-muted underline underline-offset-2"
              >
                이메일 다시 요청하기
              </button>
            </form>
          )}

          {step === "password" && (
            <form
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              className="flex flex-col gap-4"
            >
              <Input
                label="새 비밀번호"
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="6자 이상"
                autoComplete="new-password"
                autoFocus
                suffix={
                  <EyeToggle
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                  />
                }
                {...passwordForm.register("password")}
                error={passwordForm.formState.errors.password?.message}
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
                {...passwordForm.register("confirmPassword")}
                error={passwordForm.formState.errors.confirmPassword?.message}
              />
              {serverError && (
                <p className="text-sm text-haru-danger">{serverError}</p>
              )}
              <Button
                type="submit"
                isLoading={passwordForm.formState.isSubmitting}
                className="mt-1"
              >
                비밀번호 변경
              </Button>
            </form>
          )}
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
