# 마이페이지 섹션 통합 정리 — 디자인 스펙

## 배경

현재 마이페이지는 카드 섹션이 8개로 스크롤이 길고 항목 간 관계가 불명확하다. 사용자가 "정신없다"고 느끼는 원인은 단독 카드로 분리된 항목들 — 특히 내 주기(토글 1개), 위험 구역(버튼 1개) — 이 각각 카드 한 장을 차지하기 때문이다.

## 목표

- 8개 카드 → 5개 카드로 줄이기
- 관련 있는 항목끼리 묶어 논리적 그룹핑
- 코드 변경 최소화, 기존 동작 유지

## 변경 후 섹션 구조

| # | 섹션 | 변경 내용 |
|---|------|-----------|
| 1 | 프로필 카드 | 하단에 내 주기 토글 흡수 |
| 2 | 커스텀 그룹 | 변경 없음 |
| 3 | 알림 설정 | 변경 없음 |
| 4 | 연동 | 외부 캘린더 + 홈 화면 위젯 통합 |
| 5 | 계정 | 로그아웃 + 커플 연결 해제 통합 |

## 섹션별 상세

### 1. 프로필 카드 — 내 주기 토글 흡수

- 기존 아바타/이름/파트너 영역 아래에 `border-t border-haru-border` 구분선 추가
- 그 아래에 기존 `ToggleRow` 컴포넌트 그대로 사용
  - label: "내 주기 기록"
  - description: "캘린더에서 개인 주기를 기록할 수 있어요" (기존 문구 약간 축약)
- 토글 ON 시 표시되는 안내 문구(`rounded-xl bg-haru-surface-soft`) 유지
- 기존 "내 주기" 단독 카드(`<section>`) 제거

### 2·3. 커스텀 그룹 / 알림 설정

변경 없음.

### 4. 연동 카드 (신규 통합)

헤더: `Link2` 아이콘 + "연동"

두 항목을 `divide-y divide-haru-border`로 구분:

**네이버 캘린더 (상단)**
- 기존 연결/해제 UI 그대로 유지
- 섹션 헤더 텍스트(`text-xs font-semibold text-haru-muted`) "네이버 캘린더" 추가

**홈 화면 위젯 (하단)**
- 기존 설명 문구 + "복사하고 Scriptable 열기" 버튼 그대로 유지
- 섹션 헤더 텍스트 "홈 화면 위젯" 추가

### 5. 계정 카드 (신규 통합)

`overflow-hidden rounded-2xl bg-haru-surface shadow-card` — 기존 계정 스타일 유지

**로그아웃 행**
- 기존 `LogOut` 아이콘 + "로그아웃" + `ChevronRight` 행 그대로
- 탭 시 기존 ConfirmDialog 동작 유지

**구분선** (`border-t border-haru-border`)

**커플 연결 해제 행**
- `AlertTriangle` 아이콘 + "커플 연결 해제" — 텍스트 색상 `text-haru-danger`
- 우측 `ChevronRight` (`text-haru-danger`)
- 아래에 `text-xs text-haru-muted` 부연 설명: "해제 시 공유 데이터가 모두 삭제돼요"
- 탭 시 기존 ConfirmDialog 동작 유지 (내용 동일)
- 기존 `border border-haru-danger/20` 별도 위험 카드 제거

## 제거되는 카드

- "내 주기" 단독 섹션 (프로필 카드로 흡수)
- "위험 구역" 별도 카드 (계정 카드로 흡수)

## 변경 파일

- `app/(main)/mypage/page.tsx` — 단일 파일 수정

## 유지되는 것

- 모든 핸들러 로직 (`handleCycleToggle`, `handleLogout`, `handleDisconnect` 등)
- 모든 ConfirmDialog, BottomSheet 동작
- ToggleRow 컴포넌트
- DESIGN_SYSTEM.md 토큰 사용 방식

## 비고

- 커스텀 그룹, 알림 설정 섹션은 현재 완성도가 높아 손대지 않음
- 연동 카드의 두 항목은 "외부 서비스/설치"라는 맥락이 같아 묶어도 자연스러움
- 위험 구역은 별도 카드로 강조하는 것보다 계정 카드 내에서 텍스트 색상으로 위험도 표현하는 것이 더 간결
