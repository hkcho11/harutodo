# Resend OTP 비밀번호 재설정 설계 문서

## 배경 및 문제 정의

현재 비밀번호 재설정은 Supabase 기본 이메일 서비스를 통해 일회용 링크를 발송하는 방식이다.
두 가지 문제가 확인됐다.

1. **속도 제한**: Supabase 무료 플랜은 시간당 2건만 발송 가능하며, 대시보드에서 변경 불가
2. **이메일 스캐너 토큰 소비**: 네이버 웹 이메일 등 보안 스캐너가 이메일 본문의 링크를 미리 호출하여 일회용 OTP 토큰을 소비 → 사용자가 링크를 클릭하면 이미 만료된 상태

## 목표

- Resend를 Supabase SMTP로 연결하여 속도 제한 해제
- 링크 방식 → 6자리 코드 입력 방식으로 전환하여 스캐너 토큰 소비 문제 원천 차단
- 이탈 시 세션 미생성, 코드 메모리에만 보관 (보안)

## 사용자 흐름

```
/forgot-password
  [1단계] 이메일 입력 → "재설정 코드 보내기" 버튼
           └─ sendPasswordResetEmail(email) 호출
           └─ 2단계로 전환
  [2단계] 이메일로 받은 6자리 코드 입력 → "확인" 버튼
           └─ 코드를 React state(메모리)에 보관
           └─ 3단계로 전환
  [3단계] 새 비밀번호 입력 → "비밀번호 변경" 버튼
           └─ verifyOtp(email, code) 호출 → 세션 설정
           └─ updateUser(newPassword) 호출
           └─ 성공 시 /login으로 이동
```

**이탈 시나리오:**
- 1단계 이탈: 코드 미발송 또는 발송 후 미입력 → 세션 없음, 코드 만료 대기
- 2단계 이탈: 코드가 state에만 존재 → 페이지 이탈 시 자동 소멸, 세션 없음
- 3단계 이탈: verifyOtp 미호출 → 세션 없음, 비밀번호 미변경

## 아키텍처

### Supabase Dashboard 설정 (코드 변경 없음)

**SMTP 설정:**
- SMTP Host: `smtp.resend.com`
- SMTP Port: `465`
- SMTP User: `resend`
- SMTP Password: Resend API Key
- Sender Email: 인증된 도메인 발신 주소

**이메일 템플릿 변경 (Reset Password):**
- 기존: `{{ .ConfirmationURL }}` (링크 방식)
- 변경: `{{ .Token }}` (6자리 코드 방식)
- 예시 본문:
  ```
  하루투두 비밀번호 재설정 코드: {{ .Token }}
  이 코드는 1시간 후 만료됩니다.
  ```

### authService.ts 변경

**추가:**
```ts
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
```

**제거:**
- `exchangePasswordResetCode` — PKCE 링크 방식 전용, OTP 방식에서 불필요
- `subscribeToPasswordRecovery` — implicit 링크 방식 전용, OTP 방식에서 불필요

**유지:**
- `sendPasswordResetEmail` — 동일하게 사용 (SMTP만 교체됨)
- `resetPassword` — 동일하게 사용

### forgot-password/page.tsx 변경

3단계 멀티스텝 폼으로 재구성.

```
type Step = "email" | "code" | "password";
```

**State:**
```ts
const [step, setStep] = useState<Step>("email");
const [email, setEmail] = useState("");   // step 간 공유
const [code, setCode] = useState("");     // React state에만 보관 (sessionStorage 미사용)
```

**각 단계 폼:**
- email 단계: 이메일 입력 → `sendPasswordResetEmail` → step = "code"
- code 단계: 6자리 코드 입력 → 형식 검증(숫자 6자리) → state 저장 → step = "password"
- password 단계: 새 비밀번호 + 확인 입력 → `verifyPasswordResetOtp(email, code)` → `resetPassword(newPassword)` → `/login` 이동

**에러 처리:**
- 코드 오류 (`invalid otp`): "코드가 올바르지 않아요. 다시 확인해주세요"
- 코드 만료 (`expired`): "코드가 만료됐어요. 이메일을 다시 요청해주세요" + 1단계로 리셋
- 속도 제한: "잠시 후 다시 시도해주세요"

### reset-password/page.tsx 변경

기존의 PKCE/implicit 토큰 교환 로직(loading → 토큰 교환 → ready/error)을 제거하고, 이미 세션이 있는 상태에서 비밀번호를 입력받는 단순한 폼으로 교체한다.

OTP 방식에서 `/reset-password`는 더 이상 링크로 직접 접근하지 않는다.
forgot-password의 3단계에서 모든 흐름(verifyOtp + resetPassword)을 처리하므로,
reset-password 페이지는 다음과 같이 단순화한다.

**이번 작업 범위:**
- 기존 `loading → 토큰 교환 → ready/error` 상태 머신 및 관련 로직 전체 제거
- 세션 유무만 확인: 세션 없으면 `/forgot-password`로 리다이렉트
- 세션 있으면 비밀번호 입력 폼 표시 (기존 UI 유지, `resetPassword` 호출)
- 이 페이지는 향후 "마이페이지 → 비밀번호 변경" 진입점으로 재활용 가능

## 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| Supabase Dashboard | 설정 | SMTP → Resend, 이메일 템플릿 코드 방식으로 변경 |
| `lib/services/authService.ts` | 수정 | `verifyPasswordResetOtp` 추가, `exchangePasswordResetCode` / `subscribeToPasswordRecovery` 제거 |
| `app/(auth)/forgot-password/page.tsx` | 수정 | 3단계 멀티스텝 폼으로 재구성 |
| `app/(auth)/reset-password/page.tsx` | 수정 | 토큰 교환 로직 제거 및 간소화 |

## 환경변수

Next.js 앱 코드에 Resend 패키지 또는 환경변수 추가 없음.
Resend 자격증명은 Supabase Dashboard SMTP 설정에만 입력.

## 완료 기준

- [ ] Resend SMTP 연결 후 이메일 수신 확인
- [ ] 6자리 코드 이메일 발송 및 정상 수신
- [ ] 코드 입력 → 비밀번호 변경 → 로그인 성공 흐름 확인
- [ ] 잘못된 코드 입력 시 에러 메시지 표시
- [ ] 만료된 코드 입력 시 1단계 리셋 확인
- [ ] 각 단계 이탈 시 세션 미생성 확인
- [ ] `npm run lint` 통과
- [ ] `npm run type-check` 통과
- [ ] `npm run build` 성공
