# Resend OTP 비밀번호 재설정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase 기본 이메일을 Resend SMTP로 교체하고, 링크 방식을 6자리 OTP 코드 입력 방식으로 전환하여 이메일 스캐너 토큰 소비 문제와 시간당 2건 속도 제한을 동시에 해결한다.

**Architecture:** `/forgot-password` 페이지에서 이메일 입력 → 코드 입력 → 새 비밀번호 입력의 3단계 흐름을 모두 처리한다. OTP 코드는 React state(메모리)에만 보관하여 XSS 위험을 없애고, `verifyOtp + updateUser`는 비밀번호 입력 후 한 번에 호출한다. `/reset-password`는 향후 "마이페이지 → 비밀번호 변경" 용도로 단순화한다.

**Tech Stack:** Next.js 15 App Router, Supabase Auth (`verifyOtp`, `updateUser`), Resend SMTP, react-hook-form, zod, Tailwind CSS (디자인 토큰)

## Global Constraints

- `any` 타입 사용 금지
- UI 컴포넌트에서 `@supabase/*` 또는 `lib/supabase/{client,server}` 직접 import 금지 — 반드시 `lib/services/` 경유
- 디자인 토큰(`haru-*`) 사용, 임의 색상/spacing 하드코딩 금지
- 터치 타깃 44px 이상
- `npm run lint` 에러 0개, `npm run type-check` 통과, `npm run build` 성공 필수

---

## Task 1: Supabase Dashboard 설정 (수동)

**Files:**
- 없음 (Dashboard 설정만, 코드 변경 없음)

**Interfaces:**
- Produces: Resend SMTP로 6자리 코드 이메일이 발송되는 환경

> 이 태스크는 코드 구현 전에 완료해야 한다. Resend 계정과 인증된 발신 도메인이 필요하다.

- [ ] **Step 1: Resend 계정 생성 및 API Key 발급**

  1. [https://resend.com](https://resend.com) 가입
  2. 좌측 메뉴 "API Keys" → "Create API Key"
  3. Name: `harutodo-supabase`, Permission: `Sending access`
  4. 생성된 `re_xxxx...` 키를 안전한 곳에 저장 (이후 Supabase SMTP 비밀번호로 사용)

- [ ] **Step 2: 발신 도메인 인증 (또는 Resend 기본 도메인 사용)**

  도메인이 있는 경우:
  - Resend → "Domains" → "Add Domain" → 도메인 입력 → DNS 레코드 추가 후 Verify

  도메인이 없는 경우 (테스트):
  - Resend는 `onboarding@resend.dev`를 기본 발신 주소로 제공함
  - 단, 기본 발신 주소는 자신의 이메일로만 발송 가능 (프로덕션 전 자체 도메인 필요)

- [ ] **Step 3: Supabase Dashboard SMTP 설정**

  DEV 프로젝트와 PROD 프로젝트 각각 동일하게 설정:

  1. Supabase Dashboard → Authentication → "Email" 섹션 → "Enable Custom SMTP" 토글 ON
  2. 아래 값 입력:

  ```
  SMTP Host:     smtp.resend.com
  SMTP Port:     465
  SMTP User:     resend
  SMTP Password: [Step 1에서 발급한 Resend API Key]
  Sender Name:   하루투두
  Sender Email:  [인증된 도메인의 발신 주소, 예: noreply@yourdomain.com]
  ```

  3. "Save" 클릭

- [ ] **Step 4: Supabase 이메일 템플릿 변경 (Reset Password)**

  Authentication → Email Templates → "Reset Password" 선택:

  **Subject:**
  ```
  하루투두 비밀번호 재설정 코드
  ```

  **Body (HTML):**
  ```html
  <h2>비밀번호 재설정 코드</h2>
  <p>아래 6자리 코드를 하루투두 앱에 입력해주세요.</p>
  <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">{{ .Token }}</p>
  <p>이 코드는 1시간 후 만료됩니다.</p>
  <p>본인이 요청하지 않았다면 이 이메일을 무시해주세요.</p>
  ```

  "Save" 클릭

- [ ] **Step 5: 이메일 발송 테스트**

  Authentication → "Send test email" 버튼으로 테스트 이메일 발송 확인.
  이메일에 `{{ .Token }}` 대신 실제 6자리 숫자가 표시되는지 확인.

---

## Task 2: authService.ts 수정

**Files:**
- Modify: `lib/services/authService.ts`

**Interfaces:**
- Consumes: `@/lib/supabase/client` (createClient), `@/store/useCoupleStore`
- Produces:
  - `verifyPasswordResetOtp(email: string, token: string): Promise<void>` — 신규
  - `sendPasswordResetEmail(email: string): Promise<void>` — redirectTo 제거 (기존 시그니처 유지)
  - `resetPassword(newPassword: string): Promise<void>` — 변경 없음
  - `signOut(): Promise<void>` — 변경 없음
  - `exchangePasswordResetCode` 제거
  - `subscribeToPasswordRecovery` 제거

- [ ] **Step 1: `lib/services/authService.ts` 전체 파일을 아래 내용으로 교체**

  ```ts
  import { createClient } from "@/lib/supabase/client";
  import { useCoupleStore } from "@/store/useCoupleStore";

  export async function signOut(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // 사용자 컨텍스트 초기화 — 로그아웃 직후 다음 사용자가 로그인하기 전까지
    // 이전 세션의 couple/profile 정보가 store에 남지 않게 한다.
    useCoupleStore.getState().reset();

    // TODO (#7 PWA): 여기서 사용자별 cache 삭제 트리거
    //   - Service Worker로 `CLEAR_USER_CACHE` postMessage 전송
    //   - 또는 caches.keys() 순회하여 사용자 ID 포함 캐시 삭제
  }

  export async function sendPasswordResetEmail(email: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }

  export async function verifyPasswordResetOtp(
    email: string,
    token: string
  ): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    if (error) throw error;
  }

  export async function resetPassword(newPassword: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }
  ```

  제거된 함수:
  - `exchangePasswordResetCode` (PKCE 링크 방식 전용)
  - `subscribeToPasswordRecovery` (implicit 링크 방식 전용)

  변경된 함수:
  - `sendPasswordResetEmail`: `redirectTo` 옵션 제거 (OTP 방식에서 불필요)

- [ ] **Step 2: 타입 체크**

  ```
  npm run type-check
  ```

  Expected: 오류 없음. reset-password/page.tsx에서 제거된 함수를 import하는 에러가 발생하면 정상 — Task 4에서 해결한다.

- [ ] **Step 3: 커밋**

  ```
  git add lib/services/authService.ts
  git commit -m "refactor: authService OTP 방식으로 전환 (verifyPasswordResetOtp 추가, 링크 방식 함수 제거)"
  ```

---

## Task 3: forgot-password/page.tsx 3단계 폼으로 재구성

**Files:**
- Modify: `app/(auth)/forgot-password/page.tsx`

**Interfaces:**
- Consumes:
  - `sendPasswordResetEmail(email: string): Promise<void>` (Task 2)
  - `verifyPasswordResetOtp(email: string, token: string): Promise<void>` (Task 2)
  - `resetPassword(newPassword: string): Promise<void>` (Task 2)
- Produces: 없음 (leaf component)

- [ ] **Step 1: `app/(auth)/forgot-password/page.tsx` 전체를 아래 내용으로 교체**

  ```tsx
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
      .length(6, "코드는 6자리입니다")
      .regex(/^\d{6}$/, "숫자 6자리를 입력해주세요"),
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
    const [code, setCode] = useState("");
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

    const onSubmitCode = (values: CodeValues) => {
      setCode(values.code);
      setServerError("");
      setStep("password");
    };

    const onSubmitPassword = async (values: PasswordValues) => {
      setServerError("");
      try {
        await verifyPasswordResetOtp(email, code);
        await resetPassword(values.password);
        router.push("/login");
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("expired") || message.includes("invalid")) {
          setServerError("코드가 만료됐거나 올바르지 않아요. 이메일을 다시 요청해주세요");
          setStep("email");
          setCode("");
          codeForm.reset();
          passwordForm.reset();
        } else {
          setServerError("잠시 후 다시 시도해주세요");
        }
      }
    };

    const goBackToEmail = () => {
      setStep("email");
      setServerError("");
      setCode("");
      codeForm.reset();
    };

    const headers: Record<Step, { title: string; desc: string }> = {
      email: {
        title: "비밀번호 찾기",
        desc: "가입하신 이메일로 재설정 코드를 보내드려요",
      },
      code: {
        title: "코드 입력",
        desc: `${email}로 보낸 6자리 코드를 입력해주세요`,
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
                  placeholder="6자리 코드"
                  autoComplete="one-time-code"
                  maxLength={6}
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
                  이메일 다시 보내기
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
  ```

- [ ] **Step 2: `Input` 컴포넌트가 `inputMode`, `maxLength`, `autoFocus` props를 지원하는지 확인**

  ```
  grep -n "inputMode\|maxLength\|autoFocus\|\.\.\." components/ui/Input.tsx
  ```

  `...rest` 또는 `{...props}` 형태로 HTML 속성을 전달받으면 정상. 그렇지 않으면 해당 props를 Input 컴포넌트 인터페이스에 추가한다.

- [ ] **Step 3: 타입 체크 및 린트**

  ```
  npm run type-check && npm run lint
  ```

  Expected: 오류 없음

- [ ] **Step 4: 로컬 동작 확인**

  `npm run dev` 실행 후 [http://localhost:3000/forgot-password](http://localhost:3000/forgot-password) 접속:
  - 1단계: 이메일 입력 후 제출 → 2단계 코드 입력 화면으로 전환 확인
  - 2단계: 임의 6자리 숫자 입력 후 제출 → 3단계 비밀번호 입력 화면으로 전환 확인
  - 2단계: "이메일 다시 보내기" 클릭 → 1단계로 이동 확인
  - 3단계: 비밀번호/확인 불일치 시 에러 메시지 확인
  - 각 단계에서 "로그인으로 돌아가기" 링크 확인

- [ ] **Step 5: 커밋**

  ```
  git add app/\(auth\)/forgot-password/page.tsx
  git commit -m "feat: forgot-password 3단계 OTP 코드 입력 방식으로 전환"
  ```

---

## Task 4: middleware.ts + reset-password/page.tsx 간소화

**Files:**
- Modify: `middleware.ts`
- Modify: `app/(auth)/reset-password/page.tsx`

**Interfaces:**
- Consumes: `resetPassword(newPassword: string): Promise<void>` (Task 2)
- Produces: 없음 (leaf component)

**배경:** `/reset-password`를 `AUTH_PAGES`에서 제거하면 미들웨어가 세션 없는 사용자를 `/login`으로 리다이렉트한다. 이로 인해 페이지 컴포넌트에서 세션 체크 코드가 불필요해진다. 기존의 PKCE/implicit 토큰 교환 로직도 전부 제거한다.

- [ ] **Step 1: `middleware.ts`에서 `/reset-password` 제거**

  `middleware.ts` 5번째 줄을 아래와 같이 수정:

  ```ts
  const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];
  ```

  (기존: `["/login", "/signup", "/forgot-password", "/reset-password"]`)

- [ ] **Step 2: `app/(auth)/reset-password/page.tsx` 전체를 아래 내용으로 교체**

  기존의 `Suspense`, `useEffect`, `useSearchParams`, `exchangePasswordResetCode`, `subscribeToPasswordRecovery`, `PageState`, `loading/error` 상태 머신을 모두 제거하고 단순 비밀번호 폼으로 교체한다. 미들웨어가 세션 없는 접근을 `/login`으로 차단하므로 클라이언트 세션 체크가 필요 없다.

  ```tsx
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
  ```

- [ ] **Step 3: 타입 체크 및 린트**

  ```
  npm run type-check && npm run lint
  ```

  Expected: 오류 없음

- [ ] **Step 4: 커밋**

  ```
  git add middleware.ts app/\(auth\)/reset-password/page.tsx
  git commit -m "refactor: reset-password 링크 방식 로직 제거 및 간소화"
  ```

---

## Task 5: 최종 검증

**Files:**
- 없음 (검증만)

- [ ] **Step 1: 빌드 검증**

  ```
  npm run lint && npm run type-check && npm run build
  ```

  Expected:
  - lint: 에러 0개
  - type-check: 오류 없음
  - build: `✓ Compiled successfully` 또는 `Route (app)` 목록 출력 후 종료

- [ ] **Step 2: 수동 테스트 — 전체 흐름 (Task 1 완료 후 진행)**

  `npm run dev` 후 [http://localhost:3000](http://localhost:3000) 접속 (로그아웃 상태):

  **정상 흐름:**
  - [ ] /login → "비밀번호 찾기" 클릭 → /forgot-password 이동
  - [ ] 이메일 입력 → "재설정 코드 보내기" → 코드 입력 화면 전환
  - [ ] 이메일 수신 확인 → 6자리 코드 확인
  - [ ] 코드 입력 → "확인" → 비밀번호 입력 화면 전환
  - [ ] 새 비밀번호 + 확인 입력 → "비밀번호 변경" → /login으로 이동
  - [ ] 변경된 새 비밀번호로 로그인 성공 확인

  **에러 흐름:**
  - [ ] 코드 입력 화면에서 잘못된 코드(예: 000000) 입력 → 에러 메시지 표시 및 1단계 리셋 확인
  - [ ] 이메일 입력 화면에서 "이메일 다시 보내기" 클릭 → 1단계 이동 확인
  - [ ] 비밀번호 불일치 입력 → "비밀번호가 일치하지 않아요" 에러 확인

  **이탈 시나리오:**
  - [ ] 2단계(코드 입력) 중 페이지 이탈 후 재접속 → 1단계(이메일 입력)부터 다시 시작 확인
  - [ ] 로그아웃 상태에서 /reset-password 직접 접속 → /login으로 리다이렉트 확인

- [ ] **Step 3: 모바일 375px 검수**

  Chrome DevTools → 기기 에뮬레이션 → iPhone SE (375px):
  - [ ] 각 단계 폼이 잘리지 않고 표시됨
  - [ ] 코드 입력 시 모바일 숫자 키패드 표시됨 (`inputMode="numeric"`)
  - [ ] "로그인으로 돌아가기" 링크 터치 영역 충분함

- [ ] **Step 4: 최종 커밋 확인**

  ```
  git log --oneline -5
  ```

  Expected (최근 3개 커밋):
  ```
  refactor: reset-password 링크 방식 로직 제거 및 간소화
  feat: forgot-password 3단계 OTP 코드 입력 방식으로 전환
  refactor: authService OTP 방식으로 전환 (verifyPasswordResetOtp 추가, 링크 방식 함수 제거)
  ```
