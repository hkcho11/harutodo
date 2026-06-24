# 비밀번호 찾기 기능 설계

**작성일:** 2026-06-24
**상태:** 승인 완료
**범위:** `/forgot-password` 페이지 신규, `/reset-password` 페이지 신규, `/login` 페이지 진입점 추가

---

## 1. 개요

이메일/비밀번호 로그인 사용자가 비밀번호를 분실했을 때 이메일로 재설정 링크를 받아 새 비밀번호를 설정하는 흐름을 추가한다.

---

## 2. 사용자 플로우

```
로그인 페이지 (/login)
  → 비밀번호 필드 우측 상단 "비밀번호 찾기" 링크 클릭
  → /forgot-password
    → 이메일 입력 → 제출
    → Supabase resetPasswordForEmail 호출
    → 발송 완료 안내 화면 (emailSent 상태)
  → 사용자가 이메일 내 링크 클릭
  → /reset-password?code=...
    → 토큰 유효 → 새 비밀번호 입력 폼 노출
    → 변경 완료 → /login 이동
    → 토큰 무효/만료 → 에러 안내 + /forgot-password 재요청 링크
```

---

## 3. 라우팅 구조

```
app/(auth)/
├── login/page.tsx             ← 기존: 비밀번호 필드 우측 상단 링크 추가
├── forgot-password/page.tsx   ← 신규
└── reset-password/page.tsx    ← 신규
```

---

## 4. 환경 구분

`redirectTo`는 `NEXT_PUBLIC_APP_URL` 환경변수를 사용한다. 하드코딩 금지.

| 환경 | `NEXT_PUBLIC_APP_URL` | `redirectTo` |
|------|----------------------|--------------|
| 개발 (`.env.local`) | `http://localhost:3000` | `http://localhost:3000/reset-password` |
| 운영 (Vercel) | `https://harutodo.vercel.app` | `https://harutodo.vercel.app/reset-password` |

**Supabase Dashboard 추가 작업:**
- DEV 프로젝트 → Auth → URL Configuration → Redirect URLs → `http://localhost:3000/reset-password` 추가
- PROD 프로젝트 → Auth → URL Configuration → Redirect URLs → `https://harutodo.vercel.app/reset-password` 추가

---

## 5. 서비스 계층 (`lib/services/authService.ts`)

기존 `authService.ts`에 함수 2개 추가.

```ts
// 비밀번호 재설정 이메일 발송
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });
  if (error) throw error;
}

// 새 비밀번호 저장 (reset-password 페이지에서 코드 교환 후 호출)
export async function resetPassword(newPassword: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
```

---

## 6. 화면 설계

### 6-1. `/login` 수정

비밀번호 라벨 행 우측에 텍스트 링크 추가.

```
[비밀번호]                    [비밀번호 찾기 →]
[__________________________]
```

- 스타일: `text-xs text-haru-muted`, 기존 `Input` 컴포넌트의 `label` 영역 우측 정렬
- Link: `href="/forgot-password"`

### 6-2. `/forgot-password` 페이지

**idle 상태:**
- 헤더: "비밀번호 찾기" / "가입하신 이메일로 재설정 링크를 보내드려요"
- 이메일 Input (zod: email 형식)
- "재설정 링크 보내기" Button
- "로그인으로 돌아가기" Link (`href="/login"`)

**sent 상태 (제출 성공):**
- 📬 아이콘
- "메일함을 확인해주세요"
- "재설정 링크를 보냈습니다. 링크는 1시간 후 만료됩니다."
- "로그인으로 이동" Link

존재하지 않는 이메일도 항상 `sent` 상태로 전환 (이메일 열거 공격 방지).

### 6-3. `/reset-password` 페이지

**진입 시:**
- URL의 `?code=` 파라미터를 `supabase.auth.exchangeCodeForSession(code)`로 교환
- 교환 성공 → 새 비밀번호 입력 폼 노출
- 교환 실패 / `code` 없음 → 에러 상태 노출

**입력 상태:**
- 새 비밀번호 Input (6자 이상, EyeToggle)
- 비밀번호 확인 Input (일치 검증, EyeToggle)
- "비밀번호 변경" Button
- 완료 → `router.push("/login")`

**에러 상태 (토큰 무효/만료/직접 접근):**
- "링크가 만료됐거나 이미 사용된 링크예요."
- "다시 요청하기" Link (`href="/forgot-password"`)

---

## 7. 에러 처리

| 상황 | 처리 |
|------|------|
| 존재하지 않는 이메일 | 항상 sent 화면 노출 (보안) |
| 네트워크 오류 | "잠시 후 다시 시도해주세요" 인라인 에러 |
| rate limit 초과 | "잠시 후 다시 시도해주세요" 인라인 에러 |
| `code` 파라미터 없음 | "유효하지 않은 링크" 에러 상태 |
| 토큰 만료/재사용 | `exchangeCodeForSession` 실패 → 에러 상태 |
| 비밀번호 불일치 | zod 클라이언트 검증 |
| `updateUser` 실패 | "비밀번호 변경에 실패했어요. 다시 시도해주세요" |

---

## 8. 수동 검수 체크리스트

**정상 흐름:**
- [ ] 로그인 페이지 비밀번호 필드 우측 상단 "비밀번호 찾기" 링크 노출
- [ ] `/forgot-password` 이메일 입력 → 제출 → 발송 완료 화면 전환
- [ ] 존재하지 않는 이메일 입력 시에도 발송 완료 화면 노출
- [ ] 이메일 링크 클릭 → `/reset-password` 진입 (dev/prod 각각 확인)
- [ ] 새 비밀번호 입력 → 변경 완료 → `/login` 이동
- [ ] 변경된 비밀번호로 로그인 성공

**에러 흐름:**
- [ ] 잘못된 이메일 형식 → zod 검증 에러
- [ ] `/reset-password` 직접 접근 → "유효하지 않은 링크" 안내
- [ ] 만료된 링크 → "링크가 만료됐거나 이미 사용된 링크" + 재요청 링크

**모바일 UX (375px):**
- [ ] "비밀번호 찾기" 링크 터치 영역 44px 이상
- [ ] 키보드 노출 시 폼 가려지지 않음
- [ ] EyeToggle 버튼 터치 영역 충분

---

## 9. 수정 대상 파일 요약

| 파일 | 변경 |
|------|------|
| `lib/services/authService.ts` | `sendPasswordResetEmail`, `resetPassword` 함수 추가 |
| `app/(auth)/login/page.tsx` | 비밀번호 찾기 링크 추가 |
| `app/(auth)/forgot-password/page.tsx` | 신규 생성 |
| `app/(auth)/reset-password/page.tsx` | 신규 생성 |

**Supabase Dashboard (코드 외 작업):**
- DEV/PROD 각 프로젝트 Redirect URLs에 `/reset-password` 경로 추가
