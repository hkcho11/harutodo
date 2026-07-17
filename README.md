# 하루투두 (Harutodo)

커플/부부가 함께 사용하는 공유 투두 + 캘린더 PWA 웹앱

---

## 개요

모바일 브라우저에서 바로 사용할 수 있는 PWA로 개발 중이며, 추후 앱스토어 등록을 목표로 한다.

- 대상: 커플/부부 2인
- 플랫폼: iOS Safari, Android Chrome (PWA)
- 방향: 커플 감성보다 실용적인 공유 투두/캘린더 경험

## 기능

- **투두 관리** — 제목, 날짜, 담당자, 그룹별 분류, 완료 체크
- **투두 그룹** — 함께 할 일 / 사람별 할 일 / 그 외 할 일 / 커스텀 그룹 (최대 5개)
- **홈** — 날짜별 투두 리스트, 스와이프 날짜 이동
- **캘린더** — 월간 캘린더, 날짜별 일정 확인, 스와이프 월 이동
- **커플 연결** — 초대 코드 방식
- **실시간 동기화** — Supabase Realtime
- **PWA** — 홈화면 추가, 오프라인 캐시
- **푸시 알림** — 아침 요약 / 저녁 리마인더 / 일정 리마인더 / 파트너 알림

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일링 | Tailwind CSS v4 |
| 상태 관리 | Zustand |
| 백엔드/DB | Supabase (PostgreSQL + Realtime + Auth) |
| PWA | @ducanh2912/next-pwa |
| UI 컴포넌트 | shadcn/ui |
| 폼 | React Hook Form + Zod |

## 시작하기

### 요구 사항

- Node.js 20+
- npm

### 설치

```bash
npm install
```

### 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`에 Supabase 프로젝트 정보를 입력한다.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 개발 서버 실행

```bash
npm run dev
```

### 타입 체크

```bash
npm run type-check
```

## 프로젝트 구조

```
harutodo/
├── app/
│   ├── (auth)/            # 인증 페이지 (로그인, 회원가입, 커플 연결)
│   ├── (main)/            # 메인 앱 (홈, 캘린더, 마이페이지)
│   │   └── layout.tsx     # 하단 탭바 레이아웃
│   └── layout.tsx         # 루트 레이아웃 (PWA 메타 태그)
├── components/
│   ├── ui/                # shadcn/ui 기본 컴포넌트
│   ├── layout/            # 탭바 등 레이아웃 컴포넌트
│   ├── todo/              # 투두 관련 컴포넌트
│   ├── calendar/          # 캘린더 관련 컴포넌트
│   └── common/            # 공통 컴포넌트
├── lib/
│   ├── supabase/          # Supabase 클라이언트 (client/server)
│   └── utils/             # 유틸 함수
├── store/                 # Zustand 스토어
├── types/                 # TypeScript 타입 정의
├── hooks/                 # 커스텀 훅
└── public/
    ├── icons/             # PWA 아이콘
    └── manifest.json      # PWA 매니페스트
```

## 화면 구조

```
/ (홈)           → 오늘의 투두 리스트
/calendar        → 월간 캘린더
/mypage          → 프로필 / 커플 연결 상태 / 설정
/login           → 로그인
/signup          → 회원가입
/couple/connect  → 초대 코드 입력/생성
```

## Supabase 타입 갱신

DB 스키마 변경 후 타입을 자동 생성한다.

```bash
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
```

## 개발 문서

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](./CLAUDE.md) | 과거 도구 호환용 파일. 현재 내용은 Codex 단독 운영 기준, 제품 기능 현황, 작업 방식, 완료 정의 |
| [AGENTS.md](./AGENTS.md) | Codex 단독 역할, 작업 순서, 자체 리뷰 및 피드백 반영 규칙 |
| [PROJECT_RULES.md](./PROJECT_RULES.md) | 기술 스택, 폴더 구조, 네이밍, PWA/모바일 기준 |
