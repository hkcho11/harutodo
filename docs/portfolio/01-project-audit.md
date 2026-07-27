# 하루투두 프로젝트 감사

## 1. 한 줄 정의

하루투두는 커플·부부 두 사람이 오늘의 할 일과 일정을 빠르게 확인하고
함께 관리하도록 설계한 모바일 중심 공유 투두·캘린더 PWA다.

## 1-1. 프로젝트 배경

- 기획·개발 기간: 2026년 6월 초부터 현재까지
- 실제 사용 기간: 2026년 6월 중순부터 현재까지
- 실제 사용자: 개발자 본인과 배우자, 2인
- GitHub 저장소: [github.com/hkcho11/harutodo](https://github.com/hkcho11/harutodo)

결혼을 준비하며 당시 여자친구와 일정과 할 일을 공유할 앱을 찾았지만,
사용해 본 서비스는 유료이거나 두 사람이 필요로 하는 기능이 부족했다.
이에 필요한 흐름을 두 사람이 직접 논의하고, 제품 범위와 UX를 기획해
하루투두를 개발했다.

## 2. 해결하려는 문제

메신저, 개인 투두 앱, 각자의 캘린더에 흩어진 생활 정보를 한곳에서
확인하기 어렵다는 문제를 다룬다. 제품의 핵심은 기능의 수가 아니라 다음
세 가지 질문에 빠르게 답하게 하는 것이다.

- 오늘 우리가 해야 할 일은 무엇인가?
- 이 일은 함께 하는가, 나 또는 파트너가 담당하는가?
- 일정이나 투두가 변경되었을 때 두 사람에게 같은 상태가 보이는가?

## 3. 실제 확인된 사용자 흐름

1. 이메일로 가입하면 Supabase Auth 사용자와 `profiles` 행이 생성된다.
2. 한 사용자가 24시간 유효한 8자리 초대 코드를 만든다.
3. 다른 사용자가 코드를 사용하면 두 사람을 묶는 `couples` 행이 생성된다.
4. 사용자는 날짜별 투두와 일정을 등록하고 담당자를 지정한다.
5. 변경은 `couple_id` 범위로 Realtime 구독 중인 파트너 화면에 반영된다.
6. 사용자는 아침 요약, 저녁 미완료, 일정 리마인더, 파트너 활동 알림을 받을 수 있다.
7. PWA 홈 화면 또는 Scriptable 위젯을 통해 빠르게 접근할 수 있다.

## 4. 구현 범위

### 제품 기능

- 날짜별 투두 생성·수정·삭제·완료
- 함께·본인·파트너·기타·커스텀 그룹 구분
- 지난 미완료 투두 일괄 이동 또는 삭제
- 월간 캘린더와 일정 관리
- 다일 일정, 주간 반복 일정, 공휴일 표시
- 개인 주기 기록과 예측 표시
- 초대 코드 기반 커플 연결
- Supabase Realtime 동기화
- Web Push 알림과 알림 클릭 딥링크
- PWA 및 iOS Scriptable 위젯 API

### 기술 구성

| 영역 | 구현 |
|---|---|
| 웹 | Next.js 15 App Router, React 19, TypeScript |
| UI | Tailwind CSS v4, 자체 디자인 토큰, 모바일 바텀시트 |
| 상태 | 로컬 상태, Zustand, Supabase 서버 상태의 역할 분리 |
| 인증 | Supabase Auth, SSR 쿠키 세션, middleware 경로 보호 |
| 데이터 | Supabase PostgreSQL, FK·제약·인덱스·트리거 |
| 권한 | Row Level Security와 `couple_id` 멤버십 검증 |
| 동기화 | Supabase Realtime `postgres_changes` |
| 알림 | Service Worker, Web Push, Edge Functions, pg_cron |
| 품질 | ESLint, TypeScript, Vitest, production build |

## 5. 시스템 경계

```text
사용자
  ↓
Next.js PWA
  ├─ Page / Component: 화면과 사용자 상호작용
  ├─ Hook: 데이터 조회·변경·Realtime 수명주기
  ├─ Service: 인증·커플·Push·외부 API 진입점
  └─ Zustand: 여러 화면이 공유하는 클라이언트 상태
  ↓
Supabase
  ├─ Auth: 사용자 인증
  ├─ PostgreSQL + RLS: 데이터와 권한의 최종 방어선
  ├─ Realtime: 커플 간 변경 전파
  ├─ Database Trigger: 일정 알림 예약 동기화
  ├─ pg_cron: 정기 작업 호출
  └─ Edge Function: 알림 대상 조회 및 Web Push 발송
  ↓
Web Push
```

## 6. 데이터 모델 핵심

```text
auth.users 1 ── 1 profiles
profiles   2 ── 1 couples
couples    1 ── N todo_items
couples    1 ── N events
couples    1 ── N custom_groups
profiles   1 ── N push_subscriptions
events     1 ── N notification_schedules
```

- `created_by`는 항목을 만든 사용자를 나타낸다.
- `assignee_id`는 실제 담당자를 나타내며 `null`이면 함께 하는 항목이다.
- `couple_id`는 공유 데이터의 소유 경계이자 Realtime 필터 기준이다.
- RLS는 요청한 사용자가 해당 커플의 구성원인지 DB에서 다시 검사한다.

## 7. 확인된 설계 강점

### 제품 경계가 분명하다

타깃을 두 명의 커플로 제한하고, 함께·본인·파트너 구분을 투두와 일정에
동일한 색상 언어로 적용했다. 일반 협업 도구보다 생활 맥락에 맞는 단순한
정보 구조를 선택했다.

### UI 검증만 믿지 않고 DB에 무결성을 둔다

한 사용자가 여러 커플에 속하지 못하도록 unique index를 두었고, 초대
코드 사용은 `UPDATE ... RETURNING`으로 원자적으로 선점한다. 잘못된
`custom_group_id` 연결과 `couple_id` 변경도 DB 트리거로 차단한다.

### Realtime의 실패 조건을 다룬다

구독 상태를 구분하고, 구독 직후 refetch하여 최초 조회와 구독 사이에서
발생할 수 있는 이벤트 유실을 보완한다. 컴포넌트별 unique 채널 이름과
cleanup 함수를 제공한다.

### 모바일 사용 환경을 제품 요구로 다룬다

375px 기준, safe area, 최소 터치 영역, 바텀시트, 스와이프 날짜 이동,
PWA 설치 환경을 별도 품질 기준으로 관리한다.

### 설계 결정의 흔적이 남아 있다

기능별 스펙과 구현 계획, 작은 단위의 Git 커밋이 남아 있어 결과만이 아니라
의사결정과 개선 과정을 설명할 수 있다.

## 8. 기술 부채와 공개 전 리스크

### Major

- 자동화 테스트가 날짜·일정 유틸리티 중심의 2개 파일에 집중되어 있다.
  인증, RLS, 초대 코드 동시성, Realtime, 알림에는 회귀 테스트가 부족하다.
- `hooks`가 Supabase 쿼리와 도메인 변환을 직접 담당하는 부분이 많아 문서의
  service 계층 원칙과 실제 구조 사이에 차이가 있다.
- `lib/services/pushService.ts`의 구독 해제 쿼리에 `any` 예외가 남아 있다.
- README의 기술 스택에 shadcn/ui와 React Hook Form/Zod가 적혀 있지만,
  현재 실제 사용 범위와 정확히 일치하는지 공개 전 정정이 필요하다.
- 예약 알림 Edge Function은 service-role로 DB에 접근하지만 함수 내부에서
  cron 호출자만 허용하는 별도 secret 검증은 확인되지 않았다. 현재 cron은
  공개 가능한 anon JWT를 사용하므로 임의 반복 호출, 동시 실행, 비용과 중복
  발송 위험을 배포 설정(`verify_jwt`)까지 포함해 확인해야 한다.

### Minor

- 일부 큰 페이지와 Hook은 책임이 많아 탐색 비용이 높다.
- 성능, 접근성, 실제 기기 E2E 결과를 자동으로 보존하는 리포트가 없다.
- 사용자 성과 지표와 정식 사용성 테스트 결과는 저장소에서 확인할 수 없다.

### 보안 공개 주의

- `.env.local`은 공개 대상에서 제외해야 한다.
- service-role key가 코드·로그·스크린샷에 포함되지 않았는지 별도 점검해야 한다.
- Supabase anon key는 공개 가능한 키지만, 공개 키와 서버 비밀키의 차이를
  포트폴리오에서 명확히 설명해야 한다.

## 9. 근거 파일

- 제품 개요: `README.md`
- 제품·기술 원칙: `AGENTS.md`, `PROJECT_RULES.md`, `DESIGN_SYSTEM.md`
- 홈 UX: `app/(main)/page.tsx`
- 캘린더 UX: `app/(main)/calendar/page.tsx`
- 인증 라우팅: `middleware.ts`, `app/(main)/layout.tsx`
- 초기 데이터 모델/RLS: `supabase/migrations/20260527000000_init.sql`
- 동시성·무결성 보완: `supabase/migrations/20260527000001_security_fixes.sql`
- Realtime 공통화: `lib/services/realtimeService.ts`
- 알림 예약: `supabase/migrations/20260612000002_notification_schedules.sql`
- 정기 작업: `supabase/migrations/20260612000005_cron_schedules.sql`
- Push 구독: `lib/services/pushService.ts`
- Service Worker: `worker/index.ts`

## 10. 대표 확인 필요

- 공개 가능한 사용자 수와 재사용 빈도
- 가장 큰 사용자 피드백 2~3개와 반영 전후
- 배포 URL 및 GitHub 저장소 공개 범위
- 개인 주기 기능을 공개 포트폴리오에서 강조할지 여부
