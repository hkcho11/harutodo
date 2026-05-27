# 인증 흐름 설계 — 회원가입 / 로그인 / 커플 연결

- 작성일: 2026-05-27
- 범위: MVP 우선순위 #1 (인증 + 커플 연결 — 초대 코드)
- 전제: 백엔드(스키마, RLS, RPC, 프로필 자동 생성 트리거)는 완료됨. 이 작업은 **프론트엔드 UI + 로직**과 **라우팅 게이트**만 다룬다.

## 목표

가입 → 커플 연결 → 홈 진입까지 전체 루프를 모바일 브라우저(375px)에서 눈으로 확인 가능하게 만든다.

## 현재 상태

- `app/(auth)/{login,signup,couple/connect}/page.tsx`: 제목만 있는 빈 스텁
- `app/(main)/{page,calendar,mypage}.tsx`: 거의 빈 상태
- 인프라 완비: `lib/supabase/{client,server,config}.ts`, `middleware.ts`(세션 검사), 마이그레이션 4개
- 설치된 스택: `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `zustand`
- DB: 회원가입 시 `handle_new_user` 트리거가 `profiles` 자동 생성. `create_invite_code()` / `use_invite_code(p_code)` RPC 존재.

## 발견된 구조적 갭

`middleware.ts`가 로그인된 유저를 모든 공개 경로(`/couple/connect` 포함)에서 `/`로 리다이렉트한다. 그러나 `/`(홈)는 `couple_id`가 있어야 의미가 있다. 따라서 **"로그인했지만 커플 미연결"** 상태인 유저가 `/couple/connect`에 도달할 수 없다. 이 설계에서 해결한다.

## 결정 사항

### 라우팅 게이트: 접근 2 (미들웨어는 세션만, 커플 게이트는 레이아웃)

매 요청마다 `couples` 테이블을 조회하는 미들웨어 방식 대신, 미들웨어는 세션 검사만 하고 커플 멤버십 검사는 실제 보호 화면 진입 시 `(main)` 레이아웃에서 1회 수행한다.

### 이메일 인증: OFF 가정 + 안전장치

개발 중에는 Supabase "Confirm email" OFF(가입 즉시 세션 생성)를 가정한다. 단, 가입 응답에 세션이 없으면(=확인 켜짐) "메일함을 확인해주세요" 안내를 표시해 양쪽 설정을 모두 커버한다.

## 컴포넌트 설계

### 1. `middleware.ts` 수정

- `getSession()` → `getUser()` 로 변경 (토큰 갱신 + 검증, `@supabase/ssr` 권장 패턴)
- 경로 분류:
  - `AUTH_PAGES = ['/login', '/signup']`: 세션 있으면 `/`로 리다이렉트
  - `/couple/connect`: 세션 필요 (없으면 `/login`), 세션 있으면 통과
  - 그 외 `(main)` 경로: 세션 없으면 `/login`
- 커플 멤버십은 검사하지 않음

### 2. `app/(main)/layout.tsx` — 서버 컴포넌트로 전환

- 서버 `createClient()` → `getUser()` → `couples`에서 `user1_id = uid OR user2_id = uid` 조회
- 결과 없으면 `redirect('/couple/connect')`
- 있으면 기존 레이아웃(`BottomTabBar` 포함) 그대로 렌더
- BottomTabBar는 클라이언트 컴포넌트이므로 그대로 import (레이아웃만 서버로)

### 3. 공유 UI 프리미티브 — `components/ui/`

세 화면 공통 최소 단위만 생성. 그 이상 라이브러리화 금지(YAGNI).

- `Input.tsx`: 라벨 + 에러 메시지 표시, 최소 44px 터치 타깃
- `Button.tsx`: `cva` 기반 variant(`primary` | `ghost`), `isLoading` 상태(중복 제출 방지 + 스피너/비활성화)

### 4. 회원가입 — `app/(auth)/signup/page.tsx` (`"use client"`)

- 폼 필드: `display_name`(닉네임), `email`, `password`
- 검증(`zod`): 이메일 형식 / 비밀번호 6자 이상 / 닉네임 1자 이상
- 제출: `supabase.auth.signUp({ email, password, options: { data: { display_name } } })`
- 성공 + 세션 존재 → `router.push('/couple/connect')`
- 성공 + 세션 없음(이메일 확인 켜짐) → "메일함을 확인해주세요" 안내 표시
- 에러 매핑(예: `User already registered` → "이미 가입된 이메일입니다")
- 하단 링크: "이미 계정이 있나요? 로그인" → `/login`

### 5. 로그인 — `app/(auth)/login/page.tsx` (`"use client"`)

- 폼 필드: `email`, `password`
- 제출: `supabase.auth.signInWithPassword({ email, password })`
- 성공 → `router.push('/')` (게이트가 미연결 시 `/couple/connect`로 보냄)
- 에러: 잘못된 자격증명 → "이메일 또는 비밀번호를 확인해주세요"
- 하단 링크: "계정이 없나요? 회원가입" → `/signup`

### 6. 커플 연결 — `app/(auth)/couple/connect/page.tsx` (`"use client"`)

- 진입 시 이미 커플이면 `/`로 리다이렉트 (서버 컴포넌트 래퍼 또는 클라이언트 마운트 체크)
- **내 코드 생성 영역**: 버튼 → `supabase.rpc('create_invite_code')` → 8자리 코드 + 만료시각 표시, 복사 버튼(`navigator.clipboard`)
- **상대 코드 입력 영역**: 8자 입력 + 제출 → `supabase.rpc('use_invite_code', { p_code })`
  - `{ success: true }` → `router.push('/')`
  - `{ success: false, error }` → 한글 매핑: `invalid_code` → "유효하지 않거나 만료된 코드입니다", `already_connected` → "이미 커플과 연결되어 있습니다"
- **초대한 쪽 대기 처리**: 코드 생성자는 상대가 코드를 쓰기 전까지 미연결. "연결 확인" 버튼으로 커플 상태 재조회 → 연결됐으면 `/`로 이동. (자동 실시간 감지는 기능 #6 실시간 동기화에서 다룸. 여기선 DB publication 변경 없음)

### 7. 로그아웃 — `app/(main)/mypage/page.tsx` (최소 추가)

- "로그아웃" 버튼: `supabase.auth.signOut()` → `router.push('/login')`
- 가입→연결→홈→로그아웃→로그인 전체 루프 검증을 위해 필요한 최소한만 추가. 마이페이지 본기능(#8)은 범위 밖.

## 에러 처리 원칙

- 모든 Supabase 에러는 사용자에게 한글 메시지로 매핑해 표시 (raw 에러 노출 금지)
- 제출 중 버튼 비활성화 + 로딩 표시로 중복 요청 방지
- RPC 결과의 `success: false` 분기를 명시적으로 처리

## 테스트 / 검수 기준

- Chrome DevTools 375px 기준 모바일 뷰
- 시나리오: ① 가입 → 커플 연결 화면 진입 ② 코드 생성/복사 ③ 두 번째 계정으로 코드 입력 → 연결 → 홈 진입 ④ 로그아웃 → 재로그인 → 홈 직행(게이트 통과)
- 미연결 유저가 `/` 직접 접근 시 `/couple/connect`로 리다이렉트되는지 확인

## 범위 밖 (이번 작업 제외)

- 소셜 로그인 (비 MVP)
- 비밀번호 재설정 / 이메일 변경
- 커플 연결 자동 실시간 감지 (기능 #6)
- 마이페이지 프로필 편집 등 본기능 (기능 #8)
- 투두 CRUD / 홈·캘린더 화면 (다음 우선순위)

## DB 스키마 변경 여부

**없음.** 기존 마이그레이션/RPC/트리거를 그대로 사용한다.
