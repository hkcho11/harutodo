# 하루투두 포트폴리오 다이어그램

포트폴리오 웹과 발표 자료에 공통으로 사용할 다이어그램 원본이다.

## 1. 핵심 사용자 흐름

```mermaid
flowchart LR
    A[이메일 가입] --> B[초대 코드 생성·입력]
    B --> C[커플 연결]
    C --> D[오늘 할 일 확인]
    D --> E[함께·나·파트너 담당 구분]
    E --> F[추가·수정·완료]
    F --> G[파트너 화면에 실시간 반영]
    G --> H[요약·리마인더 알림]
```

## 2. 시스템 구성

```mermaid
flowchart TB
    U[사용자 · Mobile PWA]

    subgraph WEB[Next.js App Router]
        PAGE[Page · Component]
        HOOK[Domain Hook]
        STORE[Zustand Store]
        SERVICE[Service]
        ROUTE[Route Handler]
    end

    subgraph SB[Supabase]
        AUTH[Auth]
        DB[(PostgreSQL)]
        RLS[Row Level Security]
        RT[Realtime]
        CRON[pg_cron]
        EDGE[Edge Functions]
    end

    PUSH[Web Push]

    U --> PAGE
    PAGE --> HOOK
    PAGE --> STORE
    HOOK --> SERVICE
    SERVICE --> AUTH
    SERVICE --> DB
    ROUTE --> AUTH
    DB --> RLS
    DB --> RT
    RT --> HOOK
    CRON --> EDGE
    EDGE --> DB
    EDGE --> PUSH
    PUSH --> U
```

## 3. 커플 데이터 모델

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : extends
    PROFILES }o--|| COUPLES : belongs_to
    COUPLES ||--o{ TODO_ITEMS : owns
    COUPLES ||--o{ EVENTS : owns
    COUPLES ||--o{ CUSTOM_GROUPS : owns
    PROFILES ||--o{ PUSH_SUBSCRIPTIONS : registers
    EVENTS ||--o{ NOTIFICATION_SCHEDULES : schedules

    COUPLES {
        uuid id PK
        uuid user1_id FK
        uuid user2_id FK
    }

    TODO_ITEMS {
        uuid id PK
        uuid couple_id FK
        uuid created_by FK
        uuid assignee_id FK
        date date
        boolean is_completed
    }

    EVENTS {
        uuid id PK
        uuid couple_id FK
        uuid created_by FK
        uuid assignee_id FK
        date date
        time start_time
    }
```

## 4. Realtime 정합성

```mermaid
sequenceDiagram
    participant A as 사용자 A
    participant DB as PostgreSQL + RLS
    participant RT as Supabase Realtime
    participant B as 사용자 B

    B->>DB: 현재 목록 fetch
    B->>RT: couple_id 채널 subscribe
    RT-->>B: SUBSCRIBED
    B->>DB: gap 보완 refetch
    A->>DB: 일정·투두 변경
    DB->>DB: RLS 및 무결성 검증
    DB-->>RT: postgres_changes
    RT-->>B: INSERT / UPDATE / DELETE
    B->>B: ID 기반 멱등 반영
```

## 5. 예약 알림

```mermaid
flowchart LR
    A[일정 INSERT · UPDATE] --> B[DB Trigger]
    B --> C{알림 대상인가?}
    C -- 아니오 --> D[예약 생략]
    C -- 예 --> E[(notification_schedules)]
    F[pg_cron] --> G[Edge Function]
    G --> E
    G --> H[(push_subscriptions)]
    G --> I[Web Push 발송]
    I --> J[Service Worker]
    J --> K[관련 날짜로 이동]
```

## 발표 시 강조할 관계

- `couple_id`는 데이터 조회, RLS, Realtime 필터를 관통하는 공유 경계다.
- RLS는 접근 권한을, FK·unique·check·trigger는 유효한 데이터 상태를 보장한다.
- Realtime은 최초 조회를 대체하지 않으며 fetch-subscribe gap을 별도로 보완한다.
- DB는 알림 예약의 정합성을, Edge Function은 외부 네트워크 발송을 담당한다.
