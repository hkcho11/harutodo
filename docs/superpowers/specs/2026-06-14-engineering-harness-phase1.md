# 1단계 검증 하네스 설계

**작성일:** 2026-06-14  
**상태:** 승인 대기  
**범위:** lint 정리 · Vitest 도입 · 핵심 순수 함수 단위 테스트 · `npm run verify` · GitHub Actions CI

---

## 1. 현재 검증 명령과 실패 상태

### 현재 scripts (package.json)

| 명령 | 상태 |
|------|------|
| `npm run dev` | 정상 |
| `npm run build` | 정상 |
| `npm run type-check` | 정상 (`tsc --noEmit`) |
| `npm run lint` | **실패** (14 problems: 7 errors, 7 warnings) |
| `npm run test` | **없음** |
| `npm run verify` | **없음** |

### ESLint 실패 목록 (현재 `eslint .` 결과)

**에러 (7건)**

| 파일 | 규칙 | 원인 |
|------|------|------|
| `supabase/functions/evening-reminder/index.ts:2` | `@typescript-eslint/ban-ts-comment` | `@ts-ignore` 사용 (Deno 런타임 모듈) |
| `supabase/functions/event-reminder/index.ts:2` | 위와 동일 | 위와 동일 |
| `supabase/functions/morning-summary/index.ts:2` | 위와 동일 | 위와 동일 |
| `supabase/functions/notify-partner/index.ts:2` | 위와 동일 | 위와 동일 |
| `hooks/useDateTodos.ts:44` | `react-hooks/set-state-in-effect` | effect 내 `setTodos([])` 직접 호출 |
| `hooks/useNotificationSettings.ts:27` | 위와 동일 | effect 내 `setLoading(false)` 직접 호출 |
| `hooks/usePushSubscription.ts:18` | 위와 동일 | effect 내 `setState("denied")` 직접 호출 |

**경고 (7건)**

| 파일 | 규칙 | 원인 |
|------|------|------|
| `components/common/CalendarPickerSheet.tsx:41` | `reportUnusedDisableDirectives` | 이제 불필요한 `eslint-disable` 주석 |
| `components/common/DatePickerSheet.tsx:62,64` | 위와 동일 | 위와 동일 |
| `components/ui/TimePickerSheet.tsx:59` | 위와 동일 | 위와 동일 |
| `hooks/useMonthEvents.ts:177,226` | `@typescript-eslint/no-unused-vars` | `_` 미사용 변수 |
| `supabase/functions/event-reminder/index.ts:159` | 위와 동일 | `eventId` 미사용 변수 |

---

## 2. 자동 검증 공백

| 공백 | 영향 |
|------|------|
| `.github/workflows/` 없음 | PR에서 lint·타입·빌드 검증 없음. 깨진 코드가 main에 병합 가능 |
| 테스트 없음 | 순수 함수 회귀를 코드 리뷰로만 감지 |
| `verify` 명령 없음 | 릴리즈 전 사람이 4개 명령을 순서대로 수동 실행해야 함 |
| ESLint 7 errors | `npm run lint`가 이미 실패 상태 — CI가 있어도 즉시 막힘 |

---

## 3. Vitest 도입 필요성과 대안

### 채택: Vitest

- **ESM 네이티브**: Next.js 15는 ESM 기반. Jest는 추가 transform 설정(babel-jest 또는 SWC)이 필요하지만 Vitest는 Vite와 같은 번들러를 사용해 설정 없이 TS·ESM을 처리함
- **경량**: 순수 함수 테스트만 하는 Phase 1에서 jsdom·browser env 없이 `node` 환경으로 실행 가능
- **Watch 모드**: `vitest`(watch), `vitest run`(CI one-shot) 분리 지원
- **타입 추론**: TypeScript 타입이 테스트 코드에서 그대로 동작

### 비교 대안

| | Jest | Vitest |
|---|---|---|
| Next.js 15 + ESM | transform 추가 설정 필요 | 네이티브 |
| 설치 패키지 수 | `jest`, `@types/jest`, `babel-jest` 등 4+ | `vitest` 1개 |
| 실행 속도 | 상대적으로 느림 (cold start) | Vite 기반, 빠름 |
| Phase 1 (순수함수) | 가능 | 가능 |

→ **Vitest 채택**. 순수 함수 전용이므로 `@testing-library/react`는 Phase 2로 미룸.

---

## 4. 테스트 대상 선정 근거

### 선정 기준

1. **외부 의존성 없음**: Supabase, 네트워크, 실제 DB 없이 입력·출력만으로 검증 가능
2. **시각 비의존적**: `new Date()` 없이 인자로만 동작
3. **실제 사용 빈도 높음**: 캘린더 셀, 홈 화면, 일정 시트에서 매번 호출
4. **회귀 위험 존재**: 날짜 계산 오류나 포맷 버그는 UI 전체에 파급

### 선정된 함수 (8개)

| 파일 | 함수 | 선정 이유 |
|------|------|-----------|
| `lib/utils/date.ts` | `addDays(iso, days)` | 날짜 경계(월말·연말)·음수 days 회귀 위험 |
| `lib/utils/date.ts` | `formatDateNavLabel(iso)` | 요일 계산 오류 시 전체 날짜 네비게이션 영향 |
| `lib/utils/date.ts` | `formatDateShort(iso)` | 폼 버튼 날짜 표기 |
| `lib/utils/event.ts` | `formatTime(t)` | DB에서 오는 'HH:MM:SS' → 'HH:MM' 처리 |
| `lib/utils/event.ts` | `formatEventLabel(event)` | 캘린더 셀 텍스트 |
| `lib/utils/event.ts` | `formatEventTimeRange(event)` | 다일 일정·시간 범위·종일 분기 로직 |
| `lib/utils/event.ts` | `eventColorClass(event, meId)` | 본인·파트너·함께 색상 분기 |
| `lib/utils/event.ts` | `eventColorClassSoft(event, meId)` | 캘린더 셀 반투명 색상 |

### 제외된 함수 (이유 포함)

| 함수 | 제외 이유 |
|------|-----------|
| `todayISO()` | `new Date()` 의존 — 시각에 따라 결과 변동 |
| `formatTodayLabel()` | 위와 동일 |
| `cn()` | clsx + twMerge 외부 라이브러리 래퍼, 자체 로직 없음 |
| Supabase Functions의 `floorTo15Min`, `timeToMinutes`, `toKSTDateString`, `toKSTMinutes` | 각 함수 파일 내부에만 정의·비공개. tsconfig에서 제외된 Deno 환경. 추출은 Phase 2에서 검토 |
| hooks (`useMonthEvents`, `useDateTodos` 등) | Supabase 클라이언트·React 상태 결합. Phase 2 통합 테스트 대상 |

---

## 5. 변경할 파일

### 새로 생성

| 파일 | 내용 |
|------|------|
| `vitest.config.ts` | vitest 설정 (environment: node, `@/` 경로 별칭) |
| `lib/utils/__tests__/date.test.ts` | addDays, formatDateNavLabel, formatDateShort 테스트 |
| `lib/utils/__tests__/event.test.ts` | formatTime, formatEventLabel, formatEventTimeRange, eventColorClass, eventColorClassSoft 테스트 |
| `.github/workflows/ci.yml` | PR·main push 시 lint → type-check → test → build |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `devDependencies`에 `vitest` 추가. `scripts`에 `test`, `test:watch`, `verify` 추가 |
| `eslint.config.mjs` | `ignores`에 `supabase/functions/**`, `worker/**` 추가 (ESLint 에러 4건 제거) |
| `hooks/useDateTodos.ts` | `setTodos([])` → lazy init 또는 `useReducer` 전환으로 `react-hooks/set-state-in-effect` 해소 |
| `hooks/useNotificationSettings.ts` | `setLoading` 초기값을 `useState(() => !!userId)`로 이동 |
| `hooks/usePushSubscription.ts` | `setState("denied")` guard를 lazy init 또는 초기값으로 이동 |
| `components/common/CalendarPickerSheet.tsx` | 불필요한 `eslint-disable` 주석 제거 |
| `components/common/DatePickerSheet.tsx` | 위와 동일 |
| `components/ui/TimePickerSheet.tsx` | 위와 동일 |
| `hooks/useMonthEvents.ts` | `_` → `__` 또는 변수 제거 |

---

## 6. CI 실행 순서

```
PR 열기 / main push
         │
         ▼
  ┌─────────────┐
  │  checkout   │
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  setup-node │  Node.js 22 고정, npm 캐시
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │   npm ci    │
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  npm run    │
  │    lint     │  실패 → CI 즉시 중단
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  npm run    │
  │ type-check  │  실패 → CI 즉시 중단
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  npm run    │
  │    test     │  vitest run, 실패 → CI 즉시 중단
  └──────┬──────┘
         │
  ┌──────▼──────┐
  │  npm run    │
  │    build    │  Next.js 빌드
  └──────┬──────┘
         │
         ▼
       성공 ✓
```

### CI 환경변수 (더미값)

빌드 시 `process.env`를 읽는 항목에 더미값을 주입해 실제 Supabase·VAPID 없이 빌드 통과:

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: https://placeholder.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY: placeholder-anon-key
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: BPlaceholderVAPIDPublicKeyForCI00000000000000000000000000
```

---

## 7. 완료 조건

| 조건 | 검증 방법 |
|------|-----------|
| `npm run verify` 단일 명령 실행 → 4단계 모두 통과 | 로컬 터미널 |
| `npm run lint` 에러 0건 (경고 포함 0건 목표) | `eslint . --max-warnings 0` |
| `npm run type-check` 통과 | `tsc --noEmit` |
| `npm run test` 8개 함수 전체 커버, 최소 25개 케이스 | `vitest run` |
| `npm run build` Next.js 정적 생성 통과 | `next build` |
| PR 생성 시 GitHub Actions CI 자동 실행 | `.github/workflows/ci.yml` |
| CI 내 Supabase·VAPID 없이도 빌드 통과 | 더미 환경변수 |

---

## 8. 범위 제외 (이번 단계에서 하지 않는 것)

| 항목 | 이유 / 단계 |
|------|------------|
| Playwright E2E | 브라우저 인스턴스 필요, CI 비용 높음 → Phase 3 |
| 실제 Web Push 발송 테스트 | VAPID·브라우저 구독 필요 → 수동 검증 유지 |
| Supabase 로컬 DB (`supabase start`) | Docker 의존, CI 실행 시간 증가 → Phase 2 |
| RLS 통합 테스트 | 위와 동일 |
| Hook 단위 테스트 (`useDateTodos` 등) | Supabase 클라이언트 mock 설계 필요 → Phase 2 |
| 컴포넌트 렌더링 테스트 | `@testing-library/react` + `jsdom` 추가 필요 → Phase 2 |
| Edge Function(Deno) 테스트 | Deno 런타임 → 별도 `deno test` 체계 필요 |
| 운영 배포 자동화 | 현재 Vercel auto-deploy 유지 |
| 외부 모니터링 | 범위 외 |

---

## 9. 예상 위험

| 위험 | 가능성 | 완화 방법 |
|------|--------|-----------|
| **한국어 Intl 로케일 CI 미지원** — `formatDateNavLabel` 등이 'ko-KR' 로케일을 사용하지만 일부 Node.js CI 빌드는 ICU 제한 | 낮음 (Node.js 22 기본 full-icu) | CI에 `NODE_ICU_DATA` 설정 또는 Node.js 22 고정으로 해결 |
| **`Event` 타입 fixture 복잡도** — `Tables<"events">`는 많은 필수 필드를 가짐. 테스트용 최소 픽스처 작성 시 타입 단언 필요 | 중간 | `as unknown as Event` 대신 필요한 필드만 갖는 픽스처 헬퍼 함수 제공 |
| **`addDays` 타임존 경계** — `new Date(\`${iso}T00:00:00\`)` 로컬 타임존 기준. CI 서버(UTC)와 로컬(KST) 결과 차이 가능성 | 낮음 | 함수 자체가 로컬 타임존 기반으로 설계됨. CI는 UTC에서 실행되므로 날짜 경계 케이스(23:30 등)가 아닌 이상 안전 |
| **ESLint `--max-warnings 0` 너무 엄격** — 경고 0건은 경고 억제 주석 남용 위험 | 낮음 | `eslint:off` 방식 대신 코드 수정으로 해결. 부득이한 경우만 `eslint-disable` + 이유 주석 |
| **Hook 수정 중 기존 동작 변경** — `useDateTodos`, `useNotificationSettings` effect 수정 | 중간 | 수정 범위를 setState 호출 위치 이동으로 한정. 상태 초기값·타이밍 변경 없이 처리 |

---

## 10. 사용자 승인 필요 사항

승인 전 결정이 필요한 항목입니다.

### A. Vitest 버전 (필수)
- `vitest@^3.x` (최신) vs `vitest@^2.x` (안정)
- **권장**: `vitest@^3` — Next.js 15·React 19와 동일 세대, 설정 간소화 지원

### B. Node.js CI 고정 버전 (필수)
- **권장**: `22` (현재 로컬 버전 22.17.0와 일치, LTS)
- 대안: `20` (이전 LTS, 더 넓은 호환성)

### C. ESLint Hook 에러 수정 방식 (필수)
- `useDateTodos`, `useNotificationSettings`, `usePushSubscription`의 `react-hooks/set-state-in-effect` 에러 수정
- 방식 A: **lazy `useState` 초기값으로 이동** (권장 — 코드 간결, React 19 권장 패턴)
- 방식 B: `eslint-disable` 주석으로 억제 + 이유 명시 (빠르지만 lint 목적에 역행)

### D. 테스트 파일 위치 (선호도)
- 방식 A: `lib/utils/__tests__/date.test.ts` (서브 폴더, 권장)
- 방식 B: `lib/utils/date.test.ts` (소스 파일 옆)

### E. `supabase/functions` ESLint 제외 (확인)
- Deno 런타임 파일이므로 `eslint.config.mjs` ignores에 추가 → **별도 `deno lint`로 관리**
- 이에 동의하는 경우 즉시 반영

---

## 참고: 예상 테스트 케이스 개요

### `date.test.ts` (~12 케이스)

```
addDays
  ✓ 일반 날짜에 양수 더하기 ("2026-01-15" + 5 = "2026-01-20")
  ✓ 월 경계 넘기 ("2026-01-31" + 1 = "2026-02-01")
  ✓ 연 경계 넘기 ("2025-12-31" + 1 = "2026-01-01")
  ✓ 음수로 빼기 ("2026-06-01" - 1 = "2026-05-31")
  ✓ 윤년 ("2024-02-28" + 1 = "2024-02-29")
  ✓ 0 더하기 → 원본 반환

formatDateNavLabel
  ✓ "2026-05-29" → "2026년 5월 29일 (금)"
  ✓ "2026-01-01" → "2026년 1월 1일 (목)"

formatDateShort
  ✓ "2026-05-29" → "5월 29일 (금)"
  ✓ "2026-12-25" → "12월 25일 (금)"
```

### `event.test.ts` (~18 케이스)

```
formatTime
  ✓ "09:30:00" → "09:30"
  ✓ null → null

formatEventLabel
  ✓ 시간 있음: "09:30 회의" 형식
  ✓ 시간 없음: 제목만

formatEventTimeRange
  ✓ end_date 있음 → "2박 3일"
  ✓ start_time + end_time → "09:00 – 10:00"
  ✓ 둘 다 없음 → "종일"
  ✓ start_time만 → "09:00부터"
  ✓ end_time만 → "10:00까지"

eventColorClass / eventColorClassSoft
  ✓ assignee_id null → secondary (함께)
  ✓ assignee_id === meId → primary (본인)
  ✓ assignee_id !== meId → accent (파트너)
  ✓ meId null, assignee_id 있음 → accent
```

---

*이 문서에 기반한 구현은 사용자 승인 후 시작합니다.*
