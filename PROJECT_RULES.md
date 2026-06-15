# PROJECT_RULES.md — 하루투두 개발 규칙

## 기술 스택

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router) | PWA, SSR, 파일 기반 라우팅 |
| 언어 | TypeScript | 타입 안전성, Supabase 타입 자동 생성 |
| 스타일링 | Tailwind CSS v4 | 모바일 퍼스트, 유틸리티 클래스 |
| 상태 관리 | Zustand | 경량, 단순, 보일러플레이트 최소 |
| 백엔드/DB | Supabase | 실시간 동기화, 인증, PostgreSQL |
| PWA | @ducanh2912/next-pwa | Next.js 15 호환, Service Worker 관리 |
| UI 컴포넌트 | shadcn/ui | 접근성, Radix 기반, 커스터마이징 용이 |
| 폼 | React Hook Form + Zod | 유효성 검사, 타입 안전 |

## 폴더 구조 원칙

```
harutodo/
├── app/
│   ├── (auth)/                # 인증 레이아웃 (탭바 없음)
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── couple/
│   │       └── connect/page.tsx
│   ├── (main)/                # 메인 레이아웃 (하단 탭바 포함)
│   │   ├── layout.tsx         # 탭바 레이아웃
│   │   ├── page.tsx           # 홈 (오늘의 투두)
│   │   ├── calendar/page.tsx
│   │   └── mypage/page.tsx
│   ├── api/                   # API Routes
│   │   └── ...
│   ├── layout.tsx             # 루트 레이아웃 (메타, PWA 메타 태그)
│   └── globals.css
├── components/
│   ├── ui/                    # shadcn/ui 기본 컴포넌트 (수정 금지)
│   ├── todo/                  # 투두 관련 컴포넌트
│   ├── calendar/              # 캘린더 관련 컴포넌트
│   ├── layout/                # 탭바, 헤더 등 레이아웃 컴포넌트
│   └── common/                # 공통 컴포넌트
├── lib/
│   ├── services/              # 도메인 서비스 — UI에서 호출하는 유일한 데이터 진입점
│   │   ├── mappers/           # schema row ↔ 도메인 타입 변환
│   │   ├── authService.ts
│   │   ├── coupleService.ts
│   │   ├── todoService.ts
│   │   ├── eventService.ts
│   │   └── customGroupService.ts
│   ├── supabase/              # Supabase 클라이언트 팩토리만 (직접 호출은 service 안에서만)
│   └── utils/                 # 플랫폼 의존 없는 순수 유틸 함수
├── store/                     # Zustand 스토어 (도메인별 분리)
├── types/                     # TypeScript 타입 정의
│   ├── supabase.ts            # Supabase CLI 자동 생성 (수정 금지)
│   ├── domain/                # 도메인 타입 — UI/서비스 인터페이스 (camelCase)
│   │   ├── todo.ts
│   │   ├── event.ts
│   │   └── couple.ts
│   ├── todo.ts                # (기존 — 점진적으로 domain/ 으로 이관)
│   └── couple.ts
├── hooks/                     # 커스텀 훅
└── public/
    ├── icons/                 # PWA 아이콘 (192px, 512px)
    └── manifest.json
```

- 파일 200줄 이하 유지 (초과 시 분리 검토)
- 기능 단위로 폴더를 묶는다 (레이어 기준 X, 도메인 기준 O)

## 컴포넌트 분리 원칙

계층 구조: Page → Section → Component → Primitive

- Page: 라우팅 단위, 데이터 패칭 담당
- Section: 화면 내 의미 있는 영역 분리
- Component: 재사용 가능한 단위
- Primitive: shadcn/ui 또는 HTML 기본 요소

props drilling 3단계 초과 시 Zustand 또는 Context 활용.
`components/ui/`는 shadcn/ui 원본 유지, 커스텀은 `components/common/`에 작성.

## 상태 관리 원칙

| 상태 종류 | 관리 방법 |
|---|---|
| 서버 상태 (DB 데이터) | Supabase 쿼리 + Realtime 구독 |
| 전역 클라이언트 상태 | Zustand |
| URL 상태 | useSearchParams, useRouter |
| 로컬 UI 상태 | useState |
| 폼 상태 | React Hook Form |

Zustand 스토어는 도메인별로 분리:
- `store/useTodoStore.ts`
- `store/useCalendarStore.ts`
- `store/useCoupleStore.ts`

서버 상태를 Zustand로 복제하지 않는다. Supabase Realtime 구독을 직접 사용한다.

## 타입 정의 원칙

- `types/` 폴더에 중앙 관리
- Supabase CLI로 DB 스키마 기반 타입 자동 생성 → `types/supabase.ts`
- 도메인 타입은 `supabase.ts` 타입을 기반으로 확장
- `any` 사용 금지, `unknown` + 타입 가드 사용
- DB 응답 타입은 Supabase 자동 생성 타입을 1차 기준으로 사용

## PWA 설정 원칙

PWA 설정은 초기 레이아웃 구성과 함께 반드시 완료한다. 추후 추가 항목이 아니다.

### 초기 설정 필수 항목 (스캐폴딩 시 완료)

- `public/manifest.json`: `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `theme_color: "#ffffff"`, `background_color: "#ffffff"`, 아이콘(192px/512px)
- `next.config.ts`: `@ducanh2912/next-pwa` withPWA 래핑, `dest: "public"`, 개발 환경 disable
- `app/layout.tsx` — Next.js Metadata API 활용:
  - `manifest: "/manifest.json"`
  - `appleWebApp: { capable: true, statusBarStyle: "default", title: "하루투두" }`
  - `icons: { apple: "/icons/apple-touch-icon.png" }`
- `app/layout.tsx` — Viewport 설정:
  - `themeColor: "#ffffff"`
  - `viewportFit: "cover"` ← safe-area-inset 적용의 전제 조건, 반드시 포함
- `display: "standalone"`: iOS/Android 홈화면 앱 모드로 실행
- `viewport-fit=cover`: `env(safe-area-inset-*)` 사용 가능 조건
- PWA 생성 파일(`sw.js`, `workbox-*.js`)은 `.gitignore`에 포함

### 홈화면 추가 유도

- 첫 방문 + PWA 미설치 시 배너 표시 (추후 구현)

## 모바일 반응형 원칙

- 기준 뷰포트: 375px (iPhone SE / 소형 안드로이드 기준)
- Tailwind 기본 breakpoint: `sm:` 이상은 태블릿/데스크톱 보정용
- 하단 탭바: `fixed bottom-0 left-0 right-0`, `padding-bottom: env(safe-area-inset-bottom)` 적용
- 콘텐츠 영역: 탭바 높이(56px) + safe-area 만큼 `pb-` 여백 확보
- 터치 타겟: 최소 44×44px
- `overscroll-behavior-y: contain`으로 iOS bounce 제어
- 스크롤은 각 섹션 내부에서 처리 (전체 페이지 스크롤 최소화)

## 네이밍 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 컴포넌트 파일 | PascalCase | `TodoItem.tsx`, `MonthCalendar.tsx` |
| 페이지 파일 | Next.js 고정 | `page.tsx`, `layout.tsx` |
| 훅 | camelCase + `use` 접두어 | `useTodoList.ts`, `useCouple.ts` |
| 유틸 함수 파일 | camelCase | `formatDate.ts`, `generateInviteCode.ts` |
| 상수 | UPPER_SNAKE_CASE | `MAX_TODO_TITLE_LENGTH` |
| Zustand 스토어 훅 | `use` + PascalCase + `Store` | `useTodoStore`, `useCoupleStore` |
| Supabase 테이블 | snake_case | `todo_items`, `couple_groups`, `invite_codes` |
| CSS 클래스 | Tailwind 유틸리티만 사용 | 커스텀 클래스 최소화 |

## 오프라인 캐시 정책

투두/캘린더 데이터는 개인/커플 공유 데이터이므로 캐시 전략에 보안 기준을 명시한다.

### 캐시 허용 대상

| 대상 | 전략 | 설명 |
|---|---|---|
| 정적 자산 (JS/CSS/폰트/아이콘) | CacheFirst | 버전 변경 시 자동 갱신 |
| 페이지 쉘 (HTML) | NetworkFirst | 오프라인 시 캐시 fallback |
| 투두 목록 API 응답 | NetworkFirst + 10분 TTL | 오프라인 시 마지막 성공 응답 표시 |

### 캐시 절대 금지

- 인증 관련 API (`/api/auth/**`, Supabase Auth 엔드포인트): 캐시 금지
- Supabase 세션/토큰 응답: 캐시 금지
- 개인 식별 정보(이메일, 이름) 포함 응답: 캐시 금지

### 사용자별 캐시 분리

- 캐시 키에 사용자 ID를 포함하여 디바이스 공유 시 데이터 혼재 방지
- 패턴: `harutodo-todo-${userId}-v1`

### 로그아웃 시 캐시 삭제

- 로그아웃 시 해당 사용자의 데이터 캐시 전체 삭제
- 구현: Service Worker에 `CLEAR_USER_CACHE` 메시지 이벤트 → `caches.keys()` 순회 후 사용자 ID 포함 캐시 삭제

### 캐시 버전 관리

- 캐시 이름에 버전 suffix 포함: `harutodo-static-v1`, `harutodo-pages-v1`
- 새 Service Worker 활성화 시 이전 버전 캐시 자동 삭제 (`activate` 이벤트에서 처리)

## 바텀시트 / 모달 / 키보드 대응

투두 추가/수정 화면은 바텀시트로 제공한다. 모달 전체화면 대체는 사용하지 않는다.

### 바텀시트 기준

- 최대 높이: `max-h-[90dvh]` — `dvh`(dynamic viewport height) 사용, iOS 키보드 팝업 시 자동 재계산
- 내부 스크롤: 콘텐츠 영역에 `overflow-y-auto` + `flex-1` 적용
- Safe area: 하단 `padding-bottom: env(safe-area-inset-bottom, 0px)` 적용
- 배경 딤: `bg-black/40`, 클릭 시 닫힘
- 닫기 방식: 상단 핸들 드래그 다운 + 배경 클릭 + 닫기 버튼 (3가지 모두 지원)
- 포커스 트랩: 바텀시트 열린 동안 외부 요소 Tab 이동 차단

### 키보드 대응

- `dvh` 단위 사용으로 iOS/Android 키보드 팝업 시 뷰포트 자동 조정
- 저장/확인 버튼: `position: sticky; bottom: 0` + `padding-bottom: env(safe-area-inset-bottom, 0px)` — 키보드 위에 버튼이 항상 노출되어야 함
- `visualViewport` API: `dvh`로 해결되지 않는 엣지 케이스에서만 사용 (폴리필 불필요)
- 인풋 포커스 시 바텀시트가 키보드 위로 올라오지 않으면 `scrollIntoView({ block: "nearest" })` 적용

### 확인/삭제 다이얼로그

- 중앙 팝업 허용, `max-w-sm`, 배경 딤 동일
- 바텀시트 내부에서 다이얼로그 열릴 경우 z-index 계층 관리 필수

## Supabase Realtime 구독 관리

### 구독 원칙

- 구독은 컴포넌트/커스텀 훅 단위로 생성 및 관리
- 페이지 레벨(`page.tsx`)에서 직접 구독 생성 금지 — 반드시 훅으로 추출
- 동일 채널 중복 구독 방지: 구독 생성 전 채널 존재 여부 확인 또는 훅 deps 배열로 제어
- `useEffect` cleanup 함수에서 반드시 `supabase.removeChannel(channel)` 호출

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`todos:couple_id=${coupleId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "todo_items" }, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [coupleId]);
```

### Route 이동 시 처리

- 페이지 이동 시 해당 페이지의 Realtime 구독은 `useEffect` cleanup으로 자동 해제
- 전역 구독(커플 데이터 수신)은 루트 레이아웃에서 관리, 로그인 시 생성 / 로그아웃 시 해제

### Optimistic Update 정책

| 동작 | Optimistic Update | 실패 시 |
|---|---|---|
| 투두 완료 체크/해제 | 사용 (즉각 UI 반영) | 이전 상태로 롤백 |
| 투두 제목 수정 | 사용 | 롤백 + 오류 토스트 |
| 투두 생성 | 사용 (임시 ID 부여) | 삭제 + 오류 토스트 |
| 투두 삭제 | 사용 | 복원 + 오류 토스트 |

- 롤백 패턴: 변경 전 상태를 `const prev = useTodoStore.getState().todos` 로 저장 → 오류 시 `setTodos(prev)` 복원

### 오류 및 재연결 처리

- Supabase 오류 시 Optimistic update 롤백 필수
- 사용자에게 오류 토스트 표시 (재시도 버튼 선택 포함)
- `online`/`offline` 이벤트 감지 → 네트워크 복구 시 Realtime 재연결 시도

### 2개 탭 동기화 검수 기준

- 탭 A에서 투두 생성 → 탭 B에서 1초 이내 반영 확인
- 탭 A에서 완료 체크 → 탭 B에서 즉시 반영 확인
- 커플 연결 완료 후 파트너 투두가 즉시 표시되는지 확인

## 서비스 계층 원칙 (`lib/services/`)

도메인 로직을 UI/플랫폼에서 분리해 향후 React Native 전환과 백엔드 교체에 대비한다. UI 컴포넌트는 절대 Supabase 클라이언트를 직접 호출하지 않는다.

### 원칙

1. UI 컴포넌트(`app/*/page.tsx`, `components/*`)는 `@supabase/*` 또는 `lib/supabase/{client,server}`를 직접 import 하지 않는다.
2. 모든 도메인 액션(인증/투두/일정/커플/커스텀 그룹)은 `lib/services/<domain>Service.ts` 함수를 통해 호출한다.
3. service 함수는 **순수 함수** — React/Next 의존 X. `useState`, `useEffect`, `next/*` import 금지.
4. service는 도메인 타입(`types/domain/*`)을 받고 반환. supabase row를 그대로 노출하지 않는다.
5. 데이터 hook(`hooks/use*`)은 service 호출 + React state 관리만 담당 (얇은 adapter).
6. service는 throw로 에러를 전파한다. 호출 측(hook 또는 page)이 catch 후 토스트/메시지로 사용자에게 전달.
7. service는 supabase 클라이언트를 모듈 import로 사용하거나, 함수 인자로 주입받는다. 후자가 테스트/이식에 유리.

### 인터페이스 패턴

```ts
// lib/services/todoService.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { Todo, TodoCreateInput, TodoUpdateInput } from "@/types/domain/todo";
import { toTodo } from "./mappers/todoMapper";

export async function listTodosByDate(
  supabase: SupabaseClient<Database>,
  args: { coupleId: string; date: string }
): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todo_items")
    .select("*")
    .eq("couple_id", args.coupleId)
    .eq("date", args.date)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toTodo);
}
```

### 동일 패턴 함수명

각 service는 다음 동작을 표준 이름으로 노출:

| 동작 | 함수명 |
|---|---|
| 단건/리스트 조회 | `find...`, `list...` |
| 생성 | `insert...` 또는 `create...` |
| 부분 수정 | `update...` |
| 삭제 | `remove...` |
| 도메인 RPC | RPC 이름과 동일 (`createInviteCode`, `useInviteCode`) |

## 도메인 타입 vs Schema 타입 분리

타입은 두 층으로 관리한다.

| 층 | 위치 | 역할 |
|---|---|---|
| Schema 타입 | `types/supabase.ts` (자동 생성) | DB row 그대로 (`snake_case`, DB 메타 포함) |
| 도메인 타입 | `types/domain/*.ts` | UI/서비스 인터페이스 (`camelCase`, 의미 명확, DB 메타 제외) |

### 원칙

- UI 컴포넌트와 hook은 **도메인 타입만** 사용. `Tables<"...">`를 직접 props/state 타입으로 쓰지 않는다.
- service의 mapper(`lib/services/mappers/`)에서 schema row ↔ 도메인 변환.
- snake_case 컬럼명을 camelCase 도메인 필드로 매핑 (예: `created_by` → `createdBy`, `is_completed` → `isCompleted`).
- DB 메타 컬럼(`created_by`, `created_at`, `updated_at`, `couple_id` 등)은 도메인 타입에 노출하지 않는다(서비스 내부 전용).
- schema 변경 시 mapper만 수정하면 UI/도메인은 영향 없도록 한다.

### 예시

```ts
// types/domain/todo.ts
export type TodoGroup = "together" | "individual" | "other" | "custom";

export interface Todo {
  id: string;
  title: string;
  date: string | null;
  group: TodoGroup;
  assigneeId: string | null;
  customGroupId: string | null;
  isCompleted: boolean;
  // schema의 created_by/couple_id/created_at/updated_at은 노출하지 않음
}

export interface TodoCreateInput {
  title: string;
  date: string;
  group: TodoGroup;
  assigneeId: string | null;
  customGroupId: string | null;
}

export type TodoUpdateInput = Partial<TodoCreateInput> & {
  isCompleted?: boolean;
};
```

## 플랫폼 이식성 원칙 (Next.js → Expo/RN 대비)

현재는 Next.js + PWA만 운영하지만, 모든 도메인/유틸/타입/스토어는 향후 React Native에서도 import 가능한 구조로 유지한다.

### 강결합 vs 공통 분류

| 강결합 (Next 전용 — 한정) | 공통 (이식 가능 — 확장 가능) |
|---|---|
| `app/*/page.tsx`, `layout.tsx` | `lib/services/*` |
| `middleware.ts` | `lib/utils/*` |
| `lib/supabase/server.ts` (`next/headers` 의존) | `types/domain/*` |
| 서버 컴포넌트의 게이트 로직 | `store/*` (zustand는 RN 호환) |
| `next/navigation`, `next/server`, `next/headers` | `hooks/*` (service 분리된 한도 내) |

### 원칙

1. 공통 영역(`lib/services`, `lib/utils`, `types/domain`, `store`, `hooks`)에는 `next/*` import를 넣지 않는다.
2. Next 전용 API(`useRouter`, `redirect`, `cookies()`, 서버 컴포넌트 자체)는 `app/*`, `middleware.ts`, `lib/supabase/server.ts`에만 사용.
3. 새 도메인 로직은 항상 공통 영역(`lib/services/`)에 먼저 작성하고, page에서는 호출만 한다.
4. `createPortal(document.body)`에 의존하는 컴포넌트(`BottomSheet`, `ConfirmDialog`, `ToastContainer`)는 향후 RN의 `Modal`로 교체 가능하도록 **props 인터페이스를 안정 유지**한다.
5. 라우팅·세션 가드처럼 Next 의존이 불가피한 로직도, 그 내부에서 호출하는 도메인 로직은 service로 분리해 RN의 라우터 가드에서 동일 함수를 재사용할 수 있게 한다.

### 점진 적용 전략

전체 마이그레이션은 한 번에 하지 않는다. **새 기능 / 손대는 파일부터 service 패턴으로 옮기는 방식**으로 점진 적용.

- 신규 도메인 추가 시: 무조건 service + domain type 부터 작성.
- 기존 코드 수정 시 (auth/couple/todo/event/customGroup): 그 흐름이 닿는 부분을 service로 이관.
- 안 손대는 파일은 그대로 둔다 — CLAUDE.md "최소 수정 / 작업 범위 외 리팩토링 X" 원칙 유지.

## UX/UI 구현 규칙

UI 작업은 단순히 "동작하는 화면"을 만드는 것이 아니라, 모바일 PWA에서 사용자가 매일 편하게 쓸 수 있는 흐름을 만드는 것을 목표로 한다. 모든 UI 작업 전 [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)를 먼저 확인한다.

### 모바일 우선 원칙

- 모바일 세로 화면(375px)을 1순위로 설계한다. 데스크톱은 보조 환경.
- 주요 터치 영역은 최소 44×44px 확보.
- 하단 고정 네비게이션은 `env(safe-area-inset-bottom)` 고려.
- 모달보다 바텀시트를 우선 고려한다.
- 입력창은 모바일 키보드에 가려지지 않도록 `dvh` 단위 + sticky 버튼 활용.

### 정보 구조

- 홈에서는 **오늘의 투두**가 가장 먼저 보여야 한다.
- 캘린더에서는 날짜·오늘·선택 날짜·일정/투두가 명확하게 구분돼야 한다.
- 마이페이지는 설정 앱처럼 단순하고 안정적인 구조를 유지한다.
- 한 화면에 너무 많은 정보를 넣지 않는다.
- 완료/미완료 상태는 즉시 구분 가능해야 한다.
- 구분선보다 여백·카드·배경색으로 정보 구조를 나눈다.

### 디자인 토큰 사용 원칙

- 컬러·radius·spacing·shadow는 **반드시 디자인 토큰**(`globals.css`의 `@theme` 또는 Tailwind 토큰)을 사용한다.
- 임의의 hex 값, px 값, rgba 그림자를 컴포넌트에 하드코딩하지 않는다.
- 새 스타일을 만들기 전에 기존 컴포넌트(`components/ui/`, `components/common/`)와 디자인 토큰을 먼저 확인한다.
- 화면마다 임의의 색상/간격을 만들지 않는다 — 토큰이 부족하면 `DESIGN_SYSTEM.md`에 신규 토큰을 먼저 정의하고 사용한다.

### 공통 컴포넌트 우선 사용

- 버튼·카드·체크박스·하단 탭·바텀시트는 공통 스타일/컴포넌트를 따른다.
- `components/ui/`는 디자인 시스템 프리미티브(수정 시 영향 범위 큰 곳).
- `components/common/`은 도메인 공통(예: `BottomSheet`, `ProfileErrorScreen`).
- 도메인 컴포넌트는 `components/<domain>/`(예: `components/todo/`).

### 접근성 기준

- **색상만으로** 상태를 구분하지 않는다 (체크박스는 색 + 아이콘 조합).
- 텍스트 대비는 WCAG AA 이상(`4.5:1` 본문, `3:1` 큰 텍스트) 확보.
- 버튼·체크박스에는 접근 가능한 이름(`aria-label`)을 제공한다.
- 포커스 상태가 시각적으로 확인돼야 한다 (`focus:ring-*` 활용).
- 작은 텍스트(<12px)는 과도하게 사용하지 않는다.
- 토글 가능한 요소는 `aria-pressed` 등 상태 속성을 제공한다.

### UI에 비즈니스 로직 결합 금지

- UI 컴포넌트는 Supabase 클라이언트를 직접 import 하기보다, 훅(`hooks/use*.ts`) 또는 service 함수를 통해 호출한다.
- 추후 백엔드 교체나 테스트 모킹 시 UI 변경이 최소화되도록 한다.

## 인증/권한 규칙

- 인증은 Supabase Auth(이메일/비밀번호) 기반. 소셜 로그인은 Product Growth 로드맵.
- 게이트 책임 분리:
  - **미들웨어**: 세션(`getUser()`) 유무만 검사. 무거운 DB 조회 금지.
  - **`(main)/layout.tsx`**: 커플 멤버십 검사. 미연결 시 `/couple/connect`로 리다이렉트.
  - **`/couple/connect`**: 이미 연결됐으면 `/`로 리다이렉트.
- 인증/게이트 조건이 두 곳에서 다르면 리다이렉트 루프가 발생하므로, 기준은 항상 한 곳에서만 판정한다.
- 모든 도메인 테이블에 **RLS 정책**을 적용한다. 정책의 컬럼 참조는 모호하지 않도록 항상 한정(`profiles.id`, `couples.user1_id` 등)한다.
- `SECURITY DEFINER` 함수에는 `SET search_path = public, pg_temp`를 명시한다.
- 클라이언트는 anon key만 사용한다. service role key는 절대 클라이언트 번들에 포함되지 않는다.

## 환경변수 / 마이그레이션 규칙

- 클라이언트 노출 변수는 `NEXT_PUBLIC_` 접두어 사용.
- 비공개 변수(예: service role key, PAT)는 절대 커밋하지 않는다.
- `.env.local`은 `.gitignore`에 포함.
- DB 변경은 항상 **`supabase/migrations/` 파일로 기록**한다 (Dashboard에서만 적용하고 파일을 만들지 않는 일 금지).
- 마이그레이션 적용 후 `types/supabase.ts`를 재생성한다.

## 테스트/검수 기준

- 기능 구현 후 모바일 Chrome DevTools 375px 기준 시각적 검수 필수
- 탭바, 헤더, 스크롤 영역 겹침 없는지 확인
- 투두 CRUD 전체 플로우 수동 검수 (생성 → 완료 체크 → 수정 → 삭제)
- 커플 공유 실시간 동기화: 2개 탭(또는 2개 디바이스)으로 확인
- 초대 코드 플로우 수동 검수 (코드 생성 → 입력 → 연결 확인)
- 타입 오류 0개 유지 (`npm run type-check` 통과)
- 린트 에러 0개 유지 (`npm run lint` 통과)
- 빌드 성공 확인 (`npm run build` — 푸시 전 필수)
- Lighthouse PWA 점수 90+ (주요 릴리즈 기준)
