# DESIGN_SYSTEM.md — 하루투두 디자인 시스템

Claude Code는 UI 작업 전 이 문서를 반드시 확인하고, 정의된 토큰과 컴포넌트 패턴을 우선 사용한다. 임의의 색상/간격/그림자/라운드 값을 컴포넌트에 하드코딩하지 않는다.

---

## 디자인 컨셉

**"따뜻한 하루 카드"** — 애플 크림(Apple Cream) 팔레트

- 연두/살구/스카이의 부드러운 파스텔 톤으로 산뜻한 일상감
- 따뜻하지만 과하게 귀엽지 않은 톤
- 커플 앱 감성은 은근하게만 표현. 데이팅/SNS/캐릭터 앱처럼 보이지 않게.
- 실용적인 공유 투두/캘린더 경험에 어울리는 차분한 분위기

**가독성 정책**: 파스텔 톤이므로 흰 텍스트는 거의 모든 fill 색상 위에서 WCAG AA(4.5:1)에 미달한다. **fill 버튼/칩의 텍스트는 항상 `text-haru-text`(딥 올리브)**를 기본으로 한다. white text는 `danger`처럼 충분히 어두운 fill 위에만 제한적으로 사용.

원칙: 화면을 예쁘게 만드는 것보다 사용 흐름을 명확하게 만드는 것이 우선.

---

## 디자인 토큰

토큰은 `app/globals.css`의 `@theme` 블록에 정의돼 있다. Tailwind v4가 자동으로 유틸리티 클래스(`bg-haru-primary`, `text-haru-text` 등)로 노출한다. 새 토큰이 필요하면 이 문서와 `globals.css`에 함께 추가한다.

### 컬러

| 토큰 | 값 | 용도 |
|---|---|---|
| `haru-bg` | `#FAFCF5` | 페이지 배경 (연한 크림 그린) |
| `haru-surface` | `#FFFFFF` | 카드, 입력창, 시트 배경 |
| `haru-surface-soft` | `#F4F8EB` | 미세하게 따뜻한 표면 |
| `haru-primary` | `#B9DFA7` | **애플 연두** — 주요 버튼/완료 체크 fill |
| `haru-primary-hover` | `#A5D193` | primary hover |
| `haru-primary-active` | `#8FBB7E` | primary active/pressed, 강조 underline |
| `haru-primary-soft` | `#EDF8E8` | 연두 베일 — 본인 컬럼/소프트 배경 |
| `haru-secondary` | `#F2C6A0` | 살구 크림 — **함께 할 일** fill |
| `haru-secondary-soft` | `#FFF0E2` | 살구 베일 |
| `haru-accent` | `#B8DCE8` | 파스텔 스카이 — 그 외/파트너/알림 포인트 |
| `haru-accent-soft` | `#E8F4F8` | 스카이 베일 — 파트너 컬럼 |
| `haru-text` | `#334033` | 본문 (딥 올리브) — **모든 fill 위 텍스트의 기본** |
| `haru-muted` | `#72806C` | 보조 텍스트 (muted 올리브 그레이) |
| `haru-border` | `#E3ECD9` | 보더, 구분선 (연한 그린 베이지) |
| `haru-success` | `#6B9F7A` | 성공 상태 |
| `haru-danger` | `#C97264` | 에러/위험 |

**가독성 검증**:
- `haru-text` on `haru-primary` (#334033 on #B9DFA7) ≈ 7.2:1 → AA 통과
- `haru-text` on `haru-secondary` (#334033 on #F2C6A0) ≈ 6.5:1 → AA 통과
- `haru-text` on `haru-accent` (#334033 on #B8DCE8) ≈ 7.8:1 → AA 통과
- `haru-muted` on `haru-bg` ≈ 4.6:1 → AA 통과
- white on `haru-primary` ≈ 1.5:1 → **불가** (사용 금지)

### 그룹 색상 매핑 (할 일)

홈 등에서 투두 그룹을 시각적으로 구분할 때 사용. `lib/utils/group.ts`의 `GROUP_COLOR_CLASS`를 통해서만 호출 — 임의 색 하드코딩 금지.

| 그룹 | 클래스 | 의미 |
|---|---|---|
| `together` | `bg-haru-secondary text-haru-text` | 함께 — 살구 |
| `individual` | `bg-haru-primary text-haru-text` | 사람별 — 연두 |
| `other` / `custom` | `bg-haru-accent text-haru-text` | 그 외 — 스카이 |

본인/파트너 구분은 `IndividualSection`의 좌우 컬럼 배경(primary-soft / accent-soft)으로 표현 — 본인 컬럼=연두 베일, 파트너 컬럼=스카이 베일. 살구 톤은 "함께" 의미에 보존.

### 참여자 색상 매핑 (일정)

캘린더 셀의 이벤트 라벨, `EventList` 시간 칩 등에서 사용. `lib/utils/event.ts`의 `eventColorClass(event, meId)`를 통해서만 호출.

| 참여자 | 클래스 | 의미 |
|---|---|---|
| 함께 (`assignee_id` null) | `bg-haru-secondary text-haru-text` | 살구 — 함께(group together)와 일관 |
| 본인 (`assignee_id` = me) | `bg-haru-primary text-haru-text` | 연두 — 본인 컬럼/사람별과 일관 |
| 파트너 | `bg-haru-accent text-haru-text` | 스카이 — 파트너 컬럼과 일관 |

**할 일과 일정의 모델은 분리되어 있지만 색 의미는 통일** — 살구=함께 / 연두=주요·본인 / 스카이=기타·파트너로 일관 사용해서 사용자가 색만 봐도 의미를 추론할 수 있게 한다.

### 그림자

| 토큰 | 값 | 용도 |
|---|---|---|
| `shadow-card` | 이중 그림자 (`0 4px 24px / 0.05` + `0 1px 3px / 0.04`) | 카드, 바텀시트, FAB |
| `shadow-tab` | `0 -1px 0 0 #E5E0D4` | 하단 탭바 상단 보더 효과 |

### 라운드 / 간격

- 라운드: Tailwind 기본(`rounded-2xl`/`rounded-3xl`) 사용. 카드는 `rounded-2xl`, 시트/큰 카드는 `rounded-3xl`.
- 간격: Tailwind 기본 스케일 사용. 페이지 좌우 padding은 `px-4`, 섹션 사이 `mb-5`, 카드 내부 `p-5`/`p-6` 표준.

### 애니메이션

CSS 키프레임 + Tailwind v4 `--animate-*` 토큰. 라이브러리 없이 GPU-친화적(`opacity` + `transform`)만 사용.

| 토큰 | 키프레임 | 용도 |
|---|---|---|
| `animate-haru-fade-up` | opacity 0→1 + translateY 8px→0, 320ms ease-out | 카드/아이템 mount enter |
| `animate-haru-pop` | scale 0.6→1.15→1 + opacity 0→1, 220ms spring | 체크 아이콘 표시 등 작은 강조 |

원칙:
- 살짝, 짧게 (300ms 이하 우선)
- `opacity` + `transform`만 (layout 변화 X, 리플로우 회피)
- 과도한 stagger 금지 — 사용자가 기다리지 않게

### Z-index 계층

| 요소 | z-index | 비고 |
|---|---|---|
| FAB (+ 버튼) | 40 | 위치상 탭바 위에 노출 |
| BottomTabBar | 40 (inline) | 항상 보이는 네비 |
| **BottomSheet (portal)** | **100** (inline) | 모달 — 무조건 최상위 |

새 모달성 컴포넌트는 100 이상을 사용하고, 일반 콘텐츠는 40 이하로 유지한다.

---

## 공통 컴포넌트

### Button — `components/ui/Button.tsx`

- variants: `primary` (filled), `ghost` (투명)
- 기본 size: `h-12 px-6 w-full` (모바일 풀너비)
- `isLoading` prop: 스피너 표시 + 비활성화 (중복 제출 방지)
- 항상 `type="button"` 또는 `type="submit"` 명시

### Input — `components/ui/Input.tsx`

- `label` + `error` prop 지원
- 최소 높이 44px (터치 타깃)
- 포커스: `border-haru-primary` + `ring-haru-primary-soft`
- 에러: `border-haru-danger` + 하단 메시지

### BottomSheet — `components/common/BottomSheet.tsx`

- `createPortal`로 `document.body` 직속 렌더 (stacking context 회피)
- `z-index: 100` (inline)
- 닫기: 배경 클릭 + ESC + 닫기 버튼(시트 상단 핸들 영역)
- 본문 스크롤은 `body overflow: hidden`으로 잠금
- 하단 padding: `pb-[max(1.25rem, env(safe-area-inset-bottom))]`

### Card

전용 컴포넌트는 없고 다음 클래스 조합을 표준으로 사용:

```
rounded-2xl bg-haru-surface p-5 shadow-card
```

큰 카드(시트 본체 등)는 `rounded-3xl`.

### BottomTabBar — `components/layout/BottomTabBar.tsx`

- `fixed bottom-0` + `padding-bottom: env(safe-area-inset-bottom)`
- 탭 높이 `h-14` (56px), 각 탭 최소 44px 터치 타깃
- 활성 탭: `text-haru-primary` + 굵은 아이콘
- 비활성: `text-haru-muted`

### ConfirmDialog — `components/common/ConfirmDialog.tsx`

파괴적 액션(삭제 등)에 사용하는 중앙 확인 다이얼로그. 모바일 실수 방지 목적.

- `createPortal`로 `document.body` 직속 렌더
- `z-index: 110` (BottomSheet 위)
- `max-w-sm` 중앙 정렬
- variant: `danger`(빨강) / `primary`(세이지)
- props: `open`, `title`, `description`, `confirmLabel`, `variant`, `isLoading`, `onConfirm`, `onClose`
- 닫기: ESC + 배경 클릭 + 취소 버튼

### Toast — `components/common/ToastContainer.tsx` + `store/useToastStore.ts`

라이브러리 없이 운영하는 최소 토스트. 모든 변이 액션(투두 추가/수정/삭제/토글)은 실패 시 토스트로 사용자에게 알린다.

- 위치: 하단 탭바 위 `bottom: calc(56px + 1rem + env(safe-area-inset-bottom))`
- 자동 dismiss: 3초 후
- 클릭으로 즉시 dismiss
- 타입: `error`(danger 톤) / `success`(primary 톤)
- `(main)/layout.tsx`에서 한 번만 마운트 — 어디서든 `useToastStore.getState().show(message)` 호출 가능
- 사용 패턴:
  ```ts
  const showToast = useToastStore((s) => s.show);
  try { await mutate(); }
  catch { showToast("저장에 실패했어요. 잠시 후 다시 시도해주세요"); }
  ```

---

## 화면별 UX 기준

### 홈 (`/`)

- 최상단: 오늘 날짜 라벨 ("오늘 / N월 D일 (요일)")
- 본문: 그룹별 섹션 — **함께 / 사람별 / 그 외**
  - "사람별"은 본인 / 파트너 / (미지정)으로 하위 그룹화
- 우하단 FAB(+) → 바텀시트로 추가
- 빈 상태: 친절한 메시지 + 추가 유도("우하단 + 버튼으로 추가해보세요")
- 로딩: 단일 줄 텍스트 ("불러오는 중...")

### 캘린더 (`/calendar`)

- 월간 그리드 + 오늘 강조 + 선택 날짜 강조 (색상 + 보더 조합으로 색만 의존 X)
- 날짜 선택 시 하단에 해당 날짜의 투두 리스트
- (구현은 우선순위 #4)

### 마이페이지 (`/mypage`)

- 설정 앱 스타일 — 세로 카드 리스트
- 항목: 프로필, 커스텀 그룹 관리, 로그아웃
- 커스텀 그룹: 리스트 + 휴지통 버튼 + 점선 "+ 새 그룹" 버튼 → 인라인 입력
- 커스텀 그룹은 **커플당 최대 5개**(`MAX_CUSTOM_GROUPS_PER_COUPLE`) — 도달 시 추가 버튼 자리에 "최대 N개까지 만들 수 있어요" 안내
- 한 화면에 정보 과적재 금지

### 인증 (`/login`, `/signup`, `/couple/connect`)

- 하단 탭바 없음 (인증 레이아웃)
- 카드 안에 폼 배치
- 헤더에 로고 + 짧은 카피 ("커플의 하루를 함께" 류)
- `/couple/connect`는 우상단 로그아웃 동선 제공 (커플 미연결 상태 탈출 경로)

### 에러/빈 상태

- 이모지 1개 + 한 줄 헤더 + 한 줄 설명 + 액션 버튼 패턴
- 사용자에게 항상 다음 행동을 안내 (로그아웃, 재시도, 추가 등)

---

## 인터랙션 가이드

### 낙관적 업데이트

체크 토글, 추가, 삭제 등은 즉시 UI 반영 후 백엔드 호출. 실패 시 `refetch`로 복구. 사용자에게 작은 피드백(토스트/하이라이트)으로 알린다.

### 폼

- 검증: `react-hook-form` + `zod`
- 에러 메시지는 입력 필드 바로 아래 (`Input` 컴포넌트의 `error` prop)
- 서버 에러는 폼 하단 또는 관련 필드에 한글 메시지로 매핑 (raw 에러 노출 금지)

### 키보드 / safe area

- 입력 시트는 `dvh` 단위로 키보드 대응
- 저장 버튼은 키보드 위에 항상 보이도록 sticky + `env(safe-area-inset-bottom)`

---

## 접근성 체크리스트

UI 작업 후 항상 점검:

- [ ] 색상만으로 상태를 구분하지 않는다 (체크박스 = 색 + 아이콘)
- [ ] 텍스트 대비 4.5:1 이상 (큰 텍스트는 3:1)
- [ ] 버튼/체크박스에 `aria-label` 또는 의미 있는 텍스트
- [ ] 포커스 상태가 시각적으로 보임
- [ ] 토글 가능한 요소는 `aria-pressed` 제공
- [ ] 모달은 `role="dialog"` + `aria-modal="true"` + `aria-label`

---

## 토큰을 추가할 때

새 색상/그림자/간격이 필요하면:

1. 정말 기존 토큰으로 해결 안 되는지 먼저 검토
2. 이 문서의 **디자인 토큰** 표에 항목 추가
3. `app/globals.css`의 `@theme` 블록에 `--color-haru-*` 또는 `--shadow-*` 추가
4. PR/커밋에 토큰 추가 이유를 명시
