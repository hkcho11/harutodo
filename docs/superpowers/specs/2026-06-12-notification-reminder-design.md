# 오늘 할 일·일정 푸시 알림 — 기능 설계 문서

- **작성일**: 2026-06-12
- **상태**: 스키마 승인 대기 (구현 금지)
- **버전**: v0.2
- **결정 확정**: 2026-06-12

### 확정된 결정

| # | 항목 | 결정 |
|---|------|------|
| 1 | 제목 노출 | 기본 비노출 (잠금화면 보안 우선) |
| 2 | 파트너 변경 알림 중복 방지 | 현행 유지 (변경마다 즉시 발송) |
| 3 | 일정 알림 예약 방식 | CRUD 시 즉시 예약 |
| 4 | analytics_events | 신규 전용 테이블 |
| 5 | notification_settings 생성 시점 | 회원가입 시 자동 생성 |

---

## 1. 배경과 문제

하루투두는 커플이 함께 할 일과 일정을 관리하는 PWA다. 현재 알림 기능은 **파트너가 투두·일정을 추가·수정·삭제할 때 상대방에게 발송**하는 변경 알림만 존재한다.

문제는 두 가지다.

첫째, 앱을 열지 않으면 오늘 해야 할 일을 까먹는다. 투두를 등록해도 사용자가 능동적으로 앱을 열지 않는 한 당일 미완료로 끝나는 경우가 발생한다.

둘째, 시작 시간이 있는 일정(예: 병원 예약, 데이트)에 대한 사전 알림이 없다. 캘린더에 일정을 등록해도 브라우저를 닫으면 알림을 받을 방법이 없다.

두 가지 모두 **앱을 열지 않아도 오늘을 챙기는 경험**이 부재하다는 같은 문제로 귀결된다. 과도한 알림이나 파트너에 대한 압박은 오히려 역효과를 낳으므로, 최소한의 알림으로 실제 완료 전환을 높이는 것을 목표로 한다.

---

## 2. 제품 목표

| 목표 | 측정 기준 |
|------|-----------|
| 앱을 열지 않아도 오늘 할 일을 인지한다 | 알림 클릭 후 당일 투두 완료율 |
| 시간이 있는 일정을 놓치지 않는다 | 일정 알림 클릭 후 일정 화면 진입율 |
| 알림 피로를 만들지 않는다 | 하루 3회 이상 수신 사용자 비율 < 5% |
| 파트너를 압박하지 않는다 | 파트너 전용 알림 제외 정책 준수 |

핵심 지표는 **클릭률이 아니라 투두 완료 전환율**이다.

---

## 3. MVP 범위

### 3-1. 오늘 아침 요약 (Morning Summary)

- **발송 시각**: 기본 오전 8:00 KST (사용자 설정 가능)
- **발송 조건**: 오늘 날짜의 미완료 투두 또는 시작 시간 유무와 무관하게 오늘 날짜의 일정이 1개 이상 존재할 때
- **수신 대상**: 본인 담당 + 공동 담당 투두, 오늘 일정 (담당자 정책 §6 참조)
- **탭 동작**: 홈(`/`) 화면으로 이동
- **문구**: §8 참조

### 3-2. 일정 시작 전 알림 (Event Reminder)

- **대상**: `start_time`이 null이 아닌 일정만
- **발송 시각**: 일정 시작 시각 기준 기본 30분 전 (10분·30분·1시간 선택 가능)
- **발송 조건**: 해당 일정이 삭제·날짜 변경되지 않은 상태
- **종일 일정**: 아침 요약에만 포함, 별도 사전 알림 없음
- **탭 동작**: 캘린더(`/calendar`)로 이동하며 해당 날짜 선택 상태
- **문구**: §8 참조

### 3-3. 저녁 미완료 알림 (Evening Reminder)

- **발송 시각**: 기본 오후 8:00 KST (사용자 설정 가능)
- **기본 상태**: **opt-in** — 사용자가 직접 활성화해야 발송
- **발송 조건**:
  - 오늘 날짜 기준 미완료 투두가 1개 이상 존재
  - 본인 담당 또는 공동 담당(담당자 없음)만 포함
  - 파트너 단독 담당 투두는 제외
- **당일 최대 발송**: 사용자별 1회
- **탭 동작**: 홈(`/`) 화면으로 이동

### 3-4. 파트너 변경 알림 (Partner Change Notification)

- 기존 `notify-partner` Edge Function 구조 유지
- 추가·수정·삭제 시 파트너에게 발송하는 현행 동작 유지
- 검토 사항: 동일 투두에 대해 짧은 시간 내 여러 변경이 발생할 경우 중복 알림 여부 확인 필요 (§10 참조)

---

## 4. 범위 제외

아래 항목은 이번 MVP에서 의도적으로 제외한다.

| 항목 | 제외 이유 |
|------|-----------|
| 반복 투두 알림 | 반복 투두 기능 자체가 MVP 미포함 |
| 알림 문구 A/B 테스트 | 외부 SDK 도입 없이 운영 불가 |
| AI 기반 알림 시간 추천 | MVP 과설계 |
| 네이티브 위젯 | PWA 범위 초과 |
| 위치 기반 알림 | 권한·배터리 부담 |
| 파트너 완료 재촉 알림 | 커플 간 압박 유발 우려 |
| 관리자 대시보드 본 구현 | 로그만으로 충분 |
| 외부 분석 SDK 도입 | Supabase 이벤트 테이블로 대체 |
| 이메일·SMS 알림 | Web Push로 한정 |

---

## 5. 알림별 발송 조건

### 아침 요약 발송 판단 흐름

```
매일 07:55 KST (Supabase Cron 또는 Edge Function)
  ↓
커플 전체 사용자 조회 (아침 요약 설정 활성화 & push_subscription 존재)
  ↓
각 사용자별:
  오늘 날짜 미완료 투두(본인·공동) 또는 오늘 일정 존재?
  ├─ YES → push_scheduled 이벤트 기록 → 발송
  └─ NO  → 스킵 (발송 없음)
```

### 일정 알림 발송 판단 흐름

```
일정 등록·수정 시 또는 매시간 폴링:
  start_time이 있고 오늘·미래 일정 조회
  ↓
각 일정별:
  (start_time - 알림_시점) 에 예약 스케줄 생성 또는 갱신
  ↓
발송 직전 재확인:
  일정이 여전히 존재하고 날짜·시간이 변경되지 않았는가?
  ├─ YES → 발송
  └─ NO  → 취소 (cancelled_at 기록)
```

### 저녁 미완료 알림 발송 판단 흐름

```
매일 19:55 KST
  ↓
저녁 알림 opt-in 활성화 사용자 조회
  ↓
각 사용자별:
  오늘 날짜 미완료 투두(본인·공동) 존재?
  AND 오늘 저녁 알림 발송 이력 없음?
  ├─ YES → 발송 → 발송 이력 기록
  └─ NO  → 스킵
```

---

## 6. 담당자 및 커플 정책

| 담당자 상태 | 알림 수신자 |
|-------------|-------------|
| 본인 단독 (`assignee_id = me`) | 본인만 |
| 파트너 단독 (`assignee_id = partner`) | 파트너만 |
| 공동 / 담당자 없음 (`assignee_id = null`) | 커플 두 명 모두 |

**저녁 미완료 알림 예외**: 파트너 단독 담당 투두는 본인에게 발송하지 않는다. 파트너를 재촉하는 알림은 의도적으로 제외한다.

**커플 연결 해제 시**: 커플 연결이 해제되면 해당 커플의 예약된 알림(일정 사전 알림 포함)을 즉시 취소 처리한다.

**파트너 변경 알림**: 기존 `notify-partner` 정책 그대로 유지. 변경을 유발한 본인에게는 발송하지 않고, 상대방에게만 발송.

---

## 7. 사용자 설정과 기본값

마이페이지에서 개별 설정 가능. 설정은 `notification_settings` 테이블(사용자별 1행)에 저장.

| 설정 항목 | 기본값 | 비고 |
|-----------|--------|------|
| 아침 요약 활성화 | ✅ ON | |
| 아침 요약 시각 | 08:00 | 15분 단위 선택 |
| 일정 시작 전 알림 활성화 | ✅ ON | |
| 일정 알림 시점 | 30분 전 | 10분·30분·1시간 |
| 저녁 미완료 알림 활성화 | ❌ OFF | opt-in |
| 저녁 알림 시각 | 20:00 | 15분 단위 선택 |
| 파트너 변경 알림 활성화 | ✅ ON | |
| 타임존 | Asia/Seoul | 현재 고정, 추후 확장 여지 |

설정 변경 시 `notification_setting_changed` 이벤트를 기록한다.

---

## 8. 알림 문구

> **보안 검토 필요**: 투두 제목·일정 제목을 알림에 노출하면 잠금화면에서 제삼자가 내용을 볼 수 있다. 아래는 두 가지 안을 모두 제시하며, 사용자 승인 후 확정한다.

### 8-1. 아침 요약

| 구분 | 문구 |
|------|------|
| 투두만 있을 때 | **"오늘 할 일 {n}개가 기다리고 있어요 ☀️"** |
| 일정만 있을 때 | **"오늘 일정 {n}개가 있어요 📅"** |
| 둘 다 있을 때 | **"오늘 할 일 {n}개, 일정 {m}개가 있어요 ☀️"** |
| body (제목 비노출 안) | "앱을 열어 오늘을 확인해보세요" |
| body (제목 노출 안) | 첫 번째 항목 제목 + 외 n-1개 |

### 8-2. 일정 시작 전 알림

| 구분 | 문구 |
|------|------|
| title (제목 비노출 안) | **"곧 일정이 시작돼요 📅"** |
| title (제목 노출 안) | **"{일정 제목}"** |
| body (공통) | "{n}분 후 시작 · {start_time}" |

### 8-3. 저녁 미완료 알림

| 구분 | 문구 |
|------|------|
| 미완료 {n}개 | **"오늘 할 일 {n}개가 아직 남아 있어요 🌙"** |
| body (제목 비노출 안) | "지금 확인하고 마무리해보세요" |
| body (제목 노출 안) | 미완료 투두 첫 번째 제목 + 외 n-1개 |

### 8-4. 파트너 변경 알림 (기존 유지)

현행 문구(`{파트너명}이 {투두/일정}을 {추가/수정/삭제}했어요`) 유지.

---

## 9. 딥링크 동작

모든 알림에는 클릭 추적 URL을 포함한다.

| 알림 종류 | 이동 경로 | URL 예시 |
|-----------|-----------|----------|
| 아침 요약 | 홈 화면 | `/?source=push&notification_id={id}&type=morning` |
| 일정 사전 알림 | 캘린더 (해당 날짜) | `/calendar?source=push&notification_id={id}&date={YYYY-MM-DD}&type=event` |
| 저녁 미완료 | 홈 화면 | `/?source=push&notification_id={id}&type=evening` |
| 파트너 변경 | 홈 또는 캘린더 | 기존 동작 유지 |

클릭 이벤트는 Service Worker의 `notificationclick` 핸들러에서 `clients.openWindow(url)`로 처리한다. 앱이 이미 열려 있으면 `clients.focus()`로 포커스 후 URL 이동.

`notification_id`는 수신 페이지에서 `push_clicked` 이벤트를 기록하는 데 사용한다.

---

## 10. 중복 발송 방지

### 일정 사전 알림 중복 방지

일정이 수정되면 기존 예약을 `cancelled_at`으로 무효화하고 새 예약을 생성한다. 발송 직전 `notification_schedules` 테이블에서 유효한 예약인지 재확인 후 발송한다.

### 저녁 알림 중복 방지

`notification_logs` 테이블에 `(user_id, type, scheduled_date)` 유니크 제약을 걸어 당일 1회만 기록·발송한다.

### 파트너 변경 알림 중복 방지 (검토 필요)

짧은 시간 내 동일 투두에 여러 변경이 발생할 경우(예: 제목 수정 후 즉시 날짜 수정) 알림이 연속 발송될 수 있다. 아래 두 가지 방안을 검토한다.

- **방안 A — 디바운스**: 동일 엔티티 변경 후 30초 이내 재변경은 알림을 병합
- **방안 B — 현행 유지**: 변경마다 발송 (현재 동작)

→ **사용자 승인 필요** (§18 참조)

---

## 11. 타임존 정책

- 모든 예약 시각 계산은 **Asia/Seoul (KST, UTC+9)** 기준
- DB에는 UTC로 저장, 발송 판단 시 KST 변환
- 현재 타임존은 서버 고정값으로 사용. 추후 사용자별 타임존 설정 확장을 고려해 `notification_settings.timezone` 컬럼을 처음부터 포함한다
- Edge Function과 Supabase Cron은 UTC 기준으로 실행되므로 KST 변환 로직을 함수 내부에 명시적으로 구현한다

---

## 12. 데이터 및 이벤트 모델 초안

> 아래는 설계 초안이며, 구현 전 별도 스키마 승인이 필요하다.

### 12-1. `notification_settings` (신규)

```sql
CREATE TABLE notification_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  morning_enabled BOOLEAN NOT NULL DEFAULT true,
  morning_time    TIME NOT NULL DEFAULT '08:00',
  event_enabled   BOOLEAN NOT NULL DEFAULT true,
  event_lead_min  SMALLINT NOT NULL DEFAULT 30,  -- 10 | 30 | 60
  evening_enabled BOOLEAN NOT NULL DEFAULT false,
  evening_time    TIME NOT NULL DEFAULT '20:00',
  partner_enabled BOOLEAN NOT NULL DEFAULT true,
  timezone        TEXT NOT NULL DEFAULT 'Asia/Seoul',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 12-2. `notification_schedules` (신규)

일정 사전 알림 예약 관리용.

```sql
CREATE TABLE notification_schedules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id     UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type         TEXT NOT NULL DEFAULT 'event_reminder',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at      TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 12-3. `notification_logs` (신규)

발송 이력 및 퍼널 추적용.

```sql
CREATE TABLE notification_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,  -- morning | event_reminder | evening | partner_change
  notification_id   UUID NOT NULL DEFAULT gen_random_uuid(),
  scheduled_date    DATE NOT NULL,
  status            TEXT NOT NULL,  -- scheduled | sent | failed | clicked
  error_message     TEXT,
  clicked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type, scheduled_date)  -- 저녁 알림 중복 방지
);
```

### 12-4. `analytics_events` (신규 또는 기존 테이블 활용)

이용 지표 이벤트 로그용.

```sql
CREATE TABLE analytics_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name   TEXT NOT NULL,
  properties   JSONB NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

기록 이벤트 예시:
```json
{ "event_name": "push_clicked", "properties": { "notification_id": "...", "type": "morning", "source": "push" } }
{ "event_name": "todo_completed_after_push", "properties": { "notification_id": "...", "todo_id": "...", "minutes_since_click": 4 } }
```

---

## 13. RLS와 개인정보 보호

### RLS 정책 원칙

- `notification_settings`: 본인만 SELECT·UPDATE 가능
- `notification_schedules`: 본인만 SELECT 가능, INSERT·UPDATE는 Edge Function 전용 서비스 키
- `notification_logs`: 본인만 SELECT 가능, INSERT는 Edge Function 전용
- `analytics_events`: INSERT는 누구나 가능 (익명 포함), SELECT는 서비스 키만

### 개인정보 보호

- **투두 제목·일정 제목 노출 여부**: 잠금화면 노출 위험이 있으므로 기본값은 제목 비노출로 설계하고, 사용자가 명시적으로 "제목 표시" 옵션을 켜야 노출한다. (`notification_settings`에 `show_content` 컬럼 추가 검토)
- `notification_logs`는 투두·일정 제목을 저장하지 않는다. `entity_id`만 기록한다
- 커플 연결 해제 시 관련 `notification_schedules`를 즉시 `cancelled_at` 처리한다

---

## 14. 이용 지표와 계산식

### 퍼널

```
대상 선정 → 발송 시도 → 발송 성공 → 클릭 → 앱 진입 → 대상 확인 → 투두 완료
```

### 이벤트 목록

| 이벤트 | 기록 시점 | 주요 properties |
|--------|-----------|-----------------|
| `push_scheduled` | 알림 예약 시 | type, scheduled_at, user_id |
| `push_sent` | 발송 성공 시 | notification_id, type |
| `push_failed` | 발송 실패 시 | notification_id, type, error |
| `push_clicked` | 사용자 탭 시 | notification_id, type |
| `notification_setting_changed` | 설정 변경 시 | setting_key, old_value, new_value |
| `todo_completed_after_push` | 알림 클릭 후 투두 완료 시 | notification_id, todo_id, minutes_since_click |
| `event_viewed_after_push` | 알림 클릭 후 일정 화면 진입 시 | notification_id, event_id |

### 핵심 지표 계산식

| 지표 | 계산식 |
|------|--------|
| 알림 활성화율 | 설정 활성화 사용자 / 전체 사용자 |
| 발송 성공률 | push_sent / push_scheduled |
| 종류별 클릭률 | push_clicked / push_sent (type별) |
| 클릭 후 투두 완료율 | todo_completed_after_push / push_clicked (morning·evening) |
| 발송 후 당일 완료율 | 당일 완료 투두 수 / 아침 요약 발송 시점 미완료 투두 수 |
| 일정 화면 진입율 | event_viewed_after_push / push_clicked (event_reminder) |
| 알림 설정 해제율 | setting OFF 전환 수 / 전체 setting_changed |
| 사용자당 일평균 알림 수 | SUM(push_sent) / DAU / days |
| 하루 3회 이상 수신 비율 | 일 3회 이상 수신 사용자 / DAU |

---

## 15. 실패·만료 구독 처리

### Web Push 구독 만료

- HTTP 410 (Gone) 응답 수신 시: `push_subscriptions` 테이블에서 해당 구독 즉시 삭제
- HTTP 429 (Too Many Requests): 지수 백오프 후 재시도 (최대 3회)
- HTTP 4xx 기타: `push_failed` 이벤트 기록 후 스킵

현재 `notify-partner` Edge Function에 410 처리 로직이 이미 구현되어 있으므로 동일 패턴을 신규 알림 함수에도 적용한다.

### iOS PWA 제약

- iOS 16.4 미만: Web Push 미지원 → 구독 자체가 불가능하므로 `push_subscriptions`에 레코드 없음 → 자동 스킵
- iOS 16.4 이상: 홈화면 추가(A2HS) 상태에서만 Web Push 동작. 브라우저 탭에서는 알림 수신 불가
- iOS Safari에서 알림 권한 팝업은 사용자 제스처(버튼 탭) 직후에만 호출 가능

### Android Chrome 제약

- 백그라운드 제한(Battery Saver 모드): 알림이 지연될 수 있으나 FCM-Web Push가 처리
- 알림 채널 설정은 Android 8.0 이상에서 사용자가 시스템 설정에서 별도 조정 가능

### 구독 갱신

Web Push 구독에는 만료 시각이 없으므로 갱신 스케줄은 불필요하다. 브라우저가 구독을 무효화하면 410으로 감지해 정리한다.

---

## 16. 구현 단계와 파일 영향 범위

> 아래는 구현 계획 초안이며 사용자 승인 후 확정한다.

### 1단계: 스키마·RLS

| 파일 | 변경 내용 |
|------|-----------|
| `supabase/migrations/YYYYMMDD_notification_settings.sql` | notification_settings 테이블 + RLS |
| `supabase/migrations/YYYYMMDD_notification_schedules.sql` | notification_schedules 테이블 + RLS |
| `supabase/migrations/YYYYMMDD_notification_logs.sql` | notification_logs 테이블 + RLS |
| `supabase/migrations/YYYYMMDD_analytics_events.sql` | analytics_events 테이블 + RLS |
| `types/supabase.ts` | 신규 테이블 타입 추가 |

### 2단계: 서비스·훅

| 파일 | 변경 내용 |
|------|-----------|
| `lib/services/notificationSettingsService.ts` | 설정 CRUD |
| `lib/services/analyticsService.ts` | 이벤트 로깅 |
| `hooks/useNotificationSettings.ts` | 설정 상태 관리 |
| `store/useNotificationStore.ts` | 알림 설정 전역 상태 (필요 시) |

### 3단계: Edge Functions

| 파일 | 변경 내용 |
|------|-----------|
| `supabase/functions/morning-summary/index.ts` | 아침 요약 발송 |
| `supabase/functions/event-reminder/index.ts` | 일정 사전 알림 발송 |
| `supabase/functions/evening-reminder/index.ts` | 저녁 미완료 알림 발송 |
| `supabase/functions/notify-partner/index.ts` | 중복 알림 검토 반영 (Minor) |

### 4단계: UI

| 파일 | 변경 내용 |
|------|-----------|
| `app/(main)/mypage/page.tsx` | 알림 설정 섹션 추가 |
| `components/common/PushBanner.tsx` | 기존 유지·재활용 |
| `worker/index.ts` | notificationclick 딥링크 처리 확장 |
| `app/(main)/page.tsx` | push 클릭 후 analytics 이벤트 수집 |
| `app/(main)/calendar/page.tsx` | push 클릭 후 analytics 이벤트 수집 |

---

## 17. 테스트 시나리오

### 아침 요약

| 시나리오 | 기대 결과 |
|----------|-----------|
| 오늘 미완료 투두 있음, 아침 요약 ON | 발송 |
| 오늘 투두·일정 없음, 아침 요약 ON | 발송 안 함 |
| 아침 요약 OFF | 발송 안 함 |
| push_subscription 없음 | 발송 안 함 |
| 커플 연결 안 된 사용자 | 발송 안 함 |

### 일정 사전 알림

| 시나리오 | 기대 결과 |
|----------|-----------|
| start_time 있는 일정, 알림 ON | 설정 시점에 발송 |
| 종일 일정 (start_time null) | 사전 알림 없음, 아침 요약에만 포함 |
| 일정 삭제 후 발송 시각 도래 | 발송 안 함 (cancelled_at 확인) |
| 일정 시간 변경 후 | 기존 예약 취소, 새 예약 생성 |
| 알림 시점 이후 일정 등록 | 발송 안 함 |

### 저녁 미완료 알림

| 시나리오 | 기대 결과 |
|----------|-----------|
| 미완료 본인 담당 투두 있음, opt-in | 발송 |
| 파트너 단독 담당 미완료 투두만 있음 | 발송 안 함 |
| 공동 담당 미완료 투두 있음 | 발송 |
| 당일 이미 발송함 | 중복 발송 안 함 |
| 저녁 알림 OFF (기본값) | 발송 안 함 |

### 딥링크

| 시나리오 | 기대 결과 |
|----------|-----------|
| 아침 요약 탭 | `/` 이동, `push_clicked` 기록 |
| 일정 알림 탭 | `/calendar?date=YYYY-MM-DD` 이동 |
| 앱 이미 열린 상태에서 탭 | 포커스 후 URL 이동 |

---

## 18. 사용자 승인 필요 사항

구현 전 아래 항목에 대한 명시적 승인이 필요하다.

### 결정 필요 항목

| # | 항목 | 선택지 |
|---|------|--------|
| 1 | 알림에 투두·일정 제목 노출 여부 | A) 기본 비노출 (잠금화면 보안) / B) 기본 노출 (편의성) |
| 2 | 파트너 변경 알림 중복 방지 | A) 디바운스 30초 / B) 현행 유지 |
| 3 | 일정 알림 예약 방식 | A) Supabase Cron 주기적 폴링 / B) 일정 CRUD 시 즉시 예약 |
| 4 | `analytics_events` 테이블 신설 여부 | A) 신규 테이블 / B) 기존 `notification_logs`에 통합 |
| 5 | `notification_settings` 기본 레코드 생성 시점 | A) 회원가입 시 자동 생성 / B) 최초 설정 진입 시 생성 |

### 필요한 스키마 변경 후보

- `notification_settings` 테이블 신규
- `notification_schedules` 테이블 신규
- `notification_logs` 테이블 신규
- `analytics_events` 테이블 신규
- `notification_settings.show_content` 컬럼 (투두 제목 노출 설정)

### 예상 수정 파일 (전체)

```
supabase/migrations/ (4개 신규)
supabase/functions/ (3개 신규, 1개 수정)
types/supabase.ts
lib/services/notificationSettingsService.ts (신규)
lib/services/analyticsService.ts (신규)
hooks/useNotificationSettings.ts (신규)
app/(main)/mypage/page.tsx
worker/index.ts
app/(main)/page.tsx
app/(main)/calendar/page.tsx
```

### 기존 기능에 미치는 영향

| 기존 기능 | 영향 |
|-----------|------|
| `notify-partner` Edge Function | 중복 알림 검토 후 Minor 수정 가능성 |
| `usePushSubscription` 훅 | 재사용, 수정 없음 |
| `PushBanner` 컴포넌트 | 재사용, 수정 없음 |
| `push_subscriptions` 테이블 | 스키마 변경 없음, 재사용 |
| 마이페이지 UI | 알림 설정 섹션 추가로 기존 섹션과 공존 |

### MVP에서 의도적으로 제외한 항목

반복 투두 알림, 문구 A/B 테스트, AI 추천, 위젯, 위치 알림, 파트너 재촉, 관리자 대시보드, 외부 분석 SDK.

### Codex 자체 리뷰 체크리스트

구현 완료 후 아래 항목을 Codex 자체 리뷰에서 확인한다.

- [ ] RLS 정책이 각 테이블에 올바르게 적용됐는가
- [ ] Edge Function에서 서비스 키를 올바르게 사용하고 anon 키가 노출되지 않는가
- [ ] 410 구독 만료 처리가 모든 발송 함수에 구현됐는가
- [ ] `notification_logs`의 `(user_id, type, scheduled_date)` 유니크 제약이 저녁 알림 중복을 실제로 막는가
- [ ] `any` 타입이 사용되지 않았는가
- [ ] UI 컴포넌트에서 Supabase 직접 접근이 없는가
- [ ] 딥링크 URL에 민감 정보가 포함되지 않는가
- [ ] iOS PWA 제약에 대한 사용자 안내가 있는가
- [ ] 커플 연결 해제 시 예약 취소 처리가 트리거 또는 서비스에서 처리되는가
- [ ] 하루 3회 이상 알림 수신 방어 로직이 있는가
