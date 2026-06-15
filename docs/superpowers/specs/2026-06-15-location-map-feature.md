# 일정 장소 검색 및 지도 미리보기 기능 설계

**작성일:** 2026-06-15  
**상태:** 승인 대기  
**범위:** 일정(events)에 장소 추가 — 키워드 검색 → 현재 위치 기반 추천 → 장소 선택 → 지도 미리보기

---

## 1. 현재 상태

### events 테이블 컬럼

```
id, couple_id, created_by, assignee_id,
title, date, end_date, start_time, end_time,
created_at, updated_at
```

위치 관련 컬럼 없음.

### EventSheet 현재 필드

제목, 날짜(시작/종료), 시간(시작/종료), 참여자(함께/나/파트너)

장소 입력 UI 없음.

---

## 2. 기능 목표

- 일정에 장소를 선택적으로 추가할 수 있다.
- 장소 입력은 카카오 로컬 API 검색 결과를 자동완성으로 보여준다.
- 현재 위치 권한이 있으면 거리순, 없으면 정확도순으로 결과를 정렬한다.
- 검색 결과 선택 시 위치 정보(좌표·주소·카카오 ID)를 저장한다.
- 선택한 장소는 지도 미리보기로 확인할 수 있다.
- 검색이 실패하거나 직접 입력한 경우에도 일정을 저장할 수 있다.

---

## 3. 사용자 흐름

```
장소 입력창 노출 (선택 항목)
  └─ 2글자 이상 입력 + 400ms debounce
       └─ [현재 위치 있음] /api/locations/search?query=...&lat=...&lng=...
          [현재 위치 없음] /api/locations/search?query=...
            └─ 결과 최대 5개 드롭다운 표시
                 └─ 선택 → 장소명·주소·좌표·카카오 ID 저장
                           → 지도 미리보기 표시 (160~200px)
                 └─ 미선택 → 직접 입력 텍스트 그대로 저장 (좌표 없음)
```

### 위치 권한 요청 정책

- 입력창 포커스 또는 첫 검색 시 "현재 위치 기준으로 보여드릴까요?" 안내 배너 표시.
- 사용자가 명시적으로 허용해야만 `navigator.geolocation.getCurrentPosition()` 호출.
- 거부 또는 무시하면 권한 재요청 없이 전국 정확도순 검색 진행.
- 현재 위치 좌표는 DB에 저장하지 않는다 (브라우저 세션 메모리에만 보관).

---

## 4. 데이터 모델 변경

### 추가 컬럼 (events 테이블)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `location_name` | `TEXT` | 장소명 (직접 입력 또는 검색 결과 선택) |
| `location_address` | `TEXT` | 도로명 주소 (검색 결과 선택 시에만) |
| `location_latitude` | `DOUBLE PRECISION` | 위도 (검색 결과 선택 시에만) |
| `location_longitude` | `DOUBLE PRECISION` | 경도 (검색 결과 선택 시에만) |
| `location_provider` | `TEXT` | `'kakao'` 또는 `NULL` (직접 입력) |
| `location_provider_id` | `TEXT` | 카카오 장소 ID (검색 결과 선택 시에만) |
| `location_url` | `TEXT` | 카카오맵 장소 URL |

모두 `NULL` 허용. 장소를 입력하지 않으면 전부 `NULL`.

### 데이터 유형별 상태

| 상황 | location_name | 좌표·주소·provider |
|------|--------------|-------------------|
| 장소 미입력 | NULL | NULL |
| 직접 입력 | 입력 텍스트 | NULL |
| 검색 결과 선택 | 장소명 | 모두 채워짐 |
| 선택 후 직접 수정 | 수정 텍스트 | NULL (좌표 제거) |

### 검증 규칙

- `location_name` 길이 최대 200자.
- 빈 문자열은 `NULL`로 변환.
- `location_latitude`: -90~90, `location_longitude`: -180~180.
- `location_provider`는 `'kakao'` 또는 `NULL`만 허용 (`CHECK` 제약).
- 좌표가 없으면 provider도 반드시 `NULL`.

### Migration 후보 (승인 후 작성)

```sql
-- 20260615000000_events_location.sql
ALTER TABLE events
  ADD COLUMN location_name       TEXT,
  ADD COLUMN location_address    TEXT,
  ADD COLUMN location_latitude   DOUBLE PRECISION,
  ADD COLUMN location_longitude  DOUBLE PRECISION,
  ADD COLUMN location_provider   TEXT,
  ADD COLUMN location_provider_id TEXT,
  ADD COLUMN location_url        TEXT;

ALTER TABLE events
  ADD CONSTRAINT events_location_provider_check
    CHECK (location_provider IN ('kakao') OR location_provider IS NULL),
  ADD CONSTRAINT events_location_latitude_check
    CHECK (location_latitude IS NULL OR (location_latitude >= -90 AND location_latitude <= 90)),
  ADD CONSTRAINT events_location_longitude_check
    CHECK (location_longitude IS NULL OR (location_longitude >= -180 AND location_longitude <= 180)),
  ADD CONSTRAINT events_location_coords_provider_check
    CHECK (
      (location_latitude IS NULL AND location_longitude IS NULL AND location_provider IS NULL)
      OR (location_latitude IS NOT NULL AND location_longitude IS NOT NULL AND location_provider IS NOT NULL)
    );
```

RLS 변경 없음. 기존 events 정책으로 위치 컬럼도 커버됨.  
기존 rows는 모두 `NULL` — 하위 호환 이슈 없음.

---

## 5. API 설계

### 서버 프록시 Route Handler

카카오 REST API 키는 서버에서만 사용한다. 클라이언트 번들에 포함 금지.

```
GET /api/locations/search
  ?query=강남역 스타벅스
  &lat=37.4979
  &lng=127.0276
```

**응답:**

```json
{
  "places": [
    {
      "id": "1234567",
      "name": "스타벅스 강남R점",
      "address": "서울 강남구 강남대로 390",
      "category": "카페",
      "latitude": 37.4970,
      "longitude": 127.0280,
      "distanceMeters": 320,
      "url": "https://place.map.kakao.com/1234567"
    }
  ]
}
```

- 카카오 원본 응답 필드를 UI에 직접 노출하지 않는다.
- 내부 타입 `LocationSearchResult`로 변환 후 반환.
- 검색 결과 없음: `{ "places": [] }`
- API 오류: HTTP 500, 클라이언트는 "직접 입력 저장" 안내로 fallback.

### 카카오 API 호출 파라미터

```
https://dapi.kakao.com/v2/local/search/keyword.json
  ?query={query}
  &x={lng}&y={lat}          -- 현재 위치 있을 때만
  &radius=10000              -- 10km, 현재 위치 있을 때만
  &sort=distance             -- 현재 위치 있을 때: 거리순
  &sort=accuracy             -- 현재 위치 없을 때: 정확도순
  &size=5
```

### 환경변수 (승인 후 추가)

```
KAKAO_REST_API_KEY=...         # 서버 전용, 클라이언트 노출 금지
NEXT_PUBLIC_KAKAO_MAP_KEY=...  # 지도 JavaScript SDK, 허용 도메인 제한 필수
```

---

## 6. UI/UX 설계

### EventSheet 장소 필드

기존 필드(제목·날짜·시간·참여자) 아래 선택 항목으로 추가.

```
제목
날짜
시간
참여자
─────────────────────────
장소 (선택)
[ 장소명 또는 주소 입력 ]
```

**입력 상태:**

- 초기: 빈 입력창만 표시
- 2글자 미만: 검색 없음
- 2글자 이상: 400ms debounce 후 검색
- 검색 중: 입력창 하단 로딩 스피너
- 결과 있음: 드롭다운 최대 5개
- 결과 없음: "직접 입력한 장소로 저장해요" 안내
- API 오류: "검색에 실패했어요. 직접 입력하거나 나중에 다시 시도해주세요"
- 오프라인: "오프라인 상태예요. 장소를 직접 입력해서 저장할 수 있어요"

**장소 선택 후 상태:**

```
[📍] 스타벅스 강남R점
      서울 강남구 강남대로 390
                          [변경] [삭제]
```

장소명을 직접 수정하면 좌표·주소·provider 초기화, 텍스트 장소로 전환.

### 자동완성 드롭다운 항목

```
스타벅스 강남R점
카페 · 320m
서울 강남구 강남대로 390
```

- 현재 위치 있음: 거리 표시
- 현재 위치 없음: 거리 항목 숨김
- 도로명 주소 없으면 지번 주소

### 위치 권한 안내

최초 검색 시 1회만 표시. 이후에는 표시하지 않음.

```
현재 위치 주변 장소를 먼저 보여드릴까요?
[현재 위치 사용]    [괜찮아요]
```

### 지도 미리보기 (선택 후 표시)

```
┌─────────────────────────────┐
│                             │
│      (카카오맵 SDK 렌더링)   │
│             📍              │
│                             │
└─────────────────────────────┘
[카카오맵에서 보기 ↗]
```

- 높이 160~200px, 단일 마커
- 초기 줌 레벨 고정 (이동·확대/축소 불필요)
- 지도 SDK 로드 실패 시: 장소명·주소 텍스트 + [카카오맵에서 보기] 버튼으로 fallback
- 지도가 없어도 일정 저장 가능

### 일정 상세(EventDaySheet/CalendarPage) 장소 표시

```
장소
📍 스타벅스 강남R점
   서울 강남구 강남대로 390
   
   [지도 미리보기]     [카카오맵에서 보기 ↗]
```

좌표 없는 직접 입력 장소:

```
장소
📍 스타벅스 강남R점
```

카카오맵 URL 우선순위:
1. `location_url` (저장된 값)
2. 좌표 기반 `https://map.kakao.com/link/map/{name},{lat},{lng}`
3. 장소명 검색 URL
4. 모두 실패 시 웹 지도 검색

---

## 7. 상태 설계 (LocationInput 컴포넌트)

```typescript
type LocationState =
  | { type: "empty" }
  | { type: "typing"; query: string }
  | { type: "searching"; query: string }
  | { type: "results"; places: LocationSearchResult[]; query: string }
  | { type: "no_results"; query: string }
  | { type: "error"; query: string }
  | { type: "selected"; place: SelectedPlace }
  | { type: "manual"; name: string };   // 직접 입력
```

---

## 8. 서비스 계층 설계

```
lib/services/locationService.ts
  searchPlaces(query, coords?) → LocationSearchResult[]

lib/services/mappers/locationMapper.ts
  fromKakaoResult(raw) → LocationSearchResult

types/domain/location.ts
  LocationSearchResult
  SelectedPlace
  EventLocation    ← events 저장용

app/api/locations/search/route.ts   ← 카카오 API 프록시
```

`EventFormValues`에 선택적 장소 필드 추가:

```typescript
interface EventFormValues {
  title: string;
  date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  assignee_id: string | null;
  location?: {
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    provider?: "kakao";
    providerId?: string;
    url?: string;
  } | null;
}
```

---

## 9. 분석 이벤트

| 이벤트 | 시점 |
|--------|------|
| `location_search_used` | 검색창에 첫 입력 |
| `location_result_selected` | 검색 결과 선택 |
| `location_entered_manually` | 직접 입력으로 저장 |
| `location_removed` | 장소 삭제 |
| `location_map_opened` | 카카오맵에서 보기 클릭 |
| `location_permission_granted` | 위치 권한 허용 |
| `location_permission_denied` | 위치 권한 거부 |

**전송 금지 데이터:** 검색어, 장소명, 주소, 좌표 — 개인정보 보호.

---

## 10. 테스트 계획

### 단위 테스트 (Vitest)

- `locationMapper.fromKakaoResult` — 카카오 응답 → 내부 타입 변환
- `locationService.searchPlaces` — API 오류 핸들링, 빈 결과 처리
- `EventFormValues` 스키마 검증 — 좌표 유효성 검사

### 수동 검수 항목

- [ ] 2글자 미만 입력 시 검색 없음
- [ ] 400ms debounce 동작 확인
- [ ] 현재 위치 허용 → 거리 표시 + 거리순 정렬
- [ ] 현재 위치 거부 → 거리 없이 정확도순
- [ ] 검색 결과 선택 → 지도 표시, 주소·좌표 저장
- [ ] 선택 후 장소명 직접 수정 → 좌표 제거
- [ ] 장소 없이 일정 저장 가능
- [ ] API 오류 → "직접 입력 가능" fallback
- [ ] 지도 로드 실패 → 텍스트 + 외부 링크 fallback
- [ ] 375px 모바일, 키보드 노출 시 드롭다운 위치
- [ ] 터치 타깃 44px 이상

---

## 11. 구현 순서

### Phase 1 — 장소 검색과 저장 (핵심)

1. DB 스키마 변경 (migration 승인 필요)
2. `types/supabase.ts` 재생성
3. `types/domain/location.ts` 도메인 타입 정의
4. `app/api/locations/search/route.ts` — 카카오 프록시
5. `lib/services/locationService.ts`
6. `LocationInput` 컴포넌트 (검색 + 자동완성)
7. EventSheet에 장소 필드 추가
8. eventService 업데이트 (location 필드 CRUD)

### Phase 2 — 지도 미리보기

9. 카카오맵 JavaScript SDK 로드 (Script 태그, 허용 도메인 제한)
10. `LocationMapPreview` 컴포넌트
11. EventSheet에 지도 미리보기 통합

### Phase 3 — 일정 조회 연동

12. EventDaySheet / 일정 상세에 장소 표시
13. 카카오맵에서 보기 링크

---

## 12. 사용자 승인이 필요한 사항

구현 전 아래 항목에 대한 승인을 받는다.

- [ ] **DB 스키마 변경** — `events` 테이블에 위치 컬럼 7개 추가 (migration)
- [ ] **카카오 REST API 키 발급** — 개발자 콘솔 등록, `.env.local` + Vercel 환경변수 추가
- [ ] **카카오 지도 JavaScript SDK 키 발급** — 허용 도메인 설정 (localhost, harutodo.vercel.app)
- [ ] **API Route 신설** — `app/api/locations/search/route.ts`
- [ ] **EventFormValues 타입 변경** — location 선택 필드 추가 (types/event.ts 수정)
- [ ] **지도 SDK 도입** — `@types/kakao.maps.d.ts` 또는 카카오 공식 타입 패키지 검토

---

*스키마 변경, 환경변수 추가, 카카오 API 키 발급은 사용자 승인 후 진행한다. 승인 전까지 코드, DB, 패키지를 수정하지 않는다.*
