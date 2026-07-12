# 마이페이지 섹션 통합 정리 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마이페이지 카드 8개를 5개로 줄여 가독성과 UX를 개선한다.

**Architecture:** 단일 파일(`app/(main)/mypage/page.tsx`)만 수정. 모든 핸들러 로직은 그대로 유지하고, JSX 구조만 재배치한다. 새로운 컴포넌트 생성 없음.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, lucide-react

## Global Constraints

- `any` 타입 사용 금지
- 디자인 토큰(`haru-*`) 사용, 임의 색상/spacing 하드코딩 금지
- 터치 타깃 44px 이상 유지
- 기존 핸들러 로직(`handleCycleToggle`, `handleLogout`, `handleDisconnect`, `handleNaverConnect`, `handleNaverDisconnect`, `handleInstallWidget`) 변경 없음
- `npm run type-check` 타입 오류 0개
- `npm run lint` 에러 0개

---

## 파일 구조

| 파일 | 변경 |
|------|------|
| `app/(main)/mypage/page.tsx` | 수정 — JSX 섹션 재구성, import 정리 |

---

### Task 1: 내 주기 토글을 프로필 카드 하단에 통합

**Files:**
- Modify: `app/(main)/mypage/page.tsx`

**변경 요약:**
- 프로필 카드(`<section className="rounded-3xl...">`) 닫는 태그 직전에 내 주기 토글 추가
- 기존 "내 주기" 단독 `<section>` 제거
- `Heart` import 제거

- [ ] **Step 1: 프로필 카드 안에 내 주기 토글 추가**

`app/(main)/mypage/page.tsx` 의 프로필 카드 닫힘 직전 (`</section>` 바로 앞, 즉 `{editingName && ...}` 블록 다음):

```tsx
        {/* 내 주기 */}
        <div className="mt-4 border-t border-haru-border pt-4">
          <ToggleRow
            label="내 주기 기록"
            description="캘린더에서 개인 주기를 기록할 수 있어요"
            checked={me?.cycle_enabled ?? false}
            onChange={(v) => void handleCycleToggle(v)}
          />
          {me?.cycle_enabled && (
            <p className="mt-3 rounded-xl bg-haru-surface-soft px-3 py-2 text-xs leading-relaxed text-haru-muted">
              기록은 나만 볼 수 있어요. 파트너 공유는 주기 기록 시 직접 설정할 수 있어요.
            </p>
          )}
        </div>
```

현재 코드에서 교체할 범위 — `{editingName && (...)}` 블록 뒤, 프로필 카드 닫힘(`</section>`) 전:

```tsx
        {editingName && (
          <div className="mt-5 flex items-center gap-2 border-t border-haru-border pt-5">
            {/* ... 기존 내용 유지 ... */}
          </div>
        )}
      </section>
```

→ 다음으로 교체:

```tsx
        {editingName && (
          <div className="mt-5 flex items-center gap-2 border-t border-haru-border pt-5">
            {/* ... 기존 내용 유지 ... */}
          </div>
        )}

        {/* 내 주기 */}
        <div className="mt-4 border-t border-haru-border pt-4">
          <ToggleRow
            label="내 주기 기록"
            description="캘린더에서 개인 주기를 기록할 수 있어요"
            checked={me?.cycle_enabled ?? false}
            onChange={(v) => void handleCycleToggle(v)}
          />
          {me?.cycle_enabled && (
            <p className="mt-3 rounded-xl bg-haru-surface-soft px-3 py-2 text-xs leading-relaxed text-haru-muted">
              기록은 나만 볼 수 있어요. 파트너 공유는 주기 기록 시 직접 설정할 수 있어요.
            </p>
          )}
        </div>
      </section>
```

- [ ] **Step 2: 기존 "내 주기" 단독 섹션 제거**

아래 블록 전체를 삭제한다 (현재 `app/(main)/mypage/page.tsx` line 468~487):

```tsx
      {/* 내 주기 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-haru-border px-5 py-4">
          <Heart className="h-4 w-4 text-haru-muted" />
          <h2 className="text-sm font-semibold text-haru-text">내 주기</h2>
        </div>
        <div className="px-5 py-4">
          <ToggleRow
            label="내 주기 기록 기능"
            description="캘린더에서 개인 주기를 기록하고 필요 시 파트너와 공유할 수 있어요"
            checked={me?.cycle_enabled ?? false}
            onChange={(v) => void handleCycleToggle(v)}
          />
          {me?.cycle_enabled && (
            <p className="mt-3 rounded-xl bg-haru-surface-soft px-3 py-2 text-xs leading-relaxed text-haru-muted">
              기록은 나만 볼 수 있어요. 파트너 공유는 주기 기록 시 직접 설정할 수 있어요.
            </p>
          )}
        </div>
      </section>
```

- [ ] **Step 3: `Heart` import 제거**

1번째 줄 import에서 `Heart`를 제거한다:

```tsx
// 변경 전
import { Plus, Trash2, Check, X, Pencil, LogOut, ChevronRight, AlertTriangle, Bell, Clock, Link2, Link2Off, Smartphone, Download, Heart } from "lucide-react";

// 변경 후
import { Plus, Trash2, Check, X, Pencil, LogOut, ChevronRight, AlertTriangle, Bell, Clock, Link2, Link2Off, Smartphone, Download } from "lucide-react";
```

- [ ] **Step 4: 타입 검사**

```bash
npm run type-check
```

Expected: 오류 0개

- [ ] **Step 5: 커밋**

```bash
git add app/(main)/mypage/page.tsx
git commit -m "refactor: 내 주기 토글을 프로필 카드 하단으로 통합"
```

---

### Task 2: 연동 카드 통합 (네이버 캘린더 + 홈 화면 위젯)

**Files:**
- Modify: `app/(main)/mypage/page.tsx`

**변경 요약:**
- "외부 캘린더 연동" 섹션과 "홈 화면 위젯" 섹션 두 개를 "연동" 단일 카드로 교체
- `Smartphone` import 제거

- [ ] **Step 1: 두 섹션을 연동 카드 하나로 교체**

현재 "외부 캘린더 연동" 섹션부터 "홈 화면 위젯" 섹션 끝까지 전체를 다음으로 교체:

```tsx
      {/* 연동 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <div className="flex items-center gap-2 border-b border-haru-border px-5 py-4">
          <Link2 className="h-4 w-4 text-haru-muted" />
          <h2 className="text-sm font-semibold text-haru-text">연동</h2>
        </div>
        <div className="divide-y divide-haru-border">
          {/* 네이버 캘린더 */}
          <div className="px-5 py-4">
            <p className="mb-3 text-xs font-semibold text-haru-muted">네이버 캘린더</p>
            {naverConnected === null ? (
              <p className="text-sm text-haru-muted">불러오는 중...</p>
            ) : naverConnected ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-haru-muted">일정 추가 시 네이버 캘린더에 자동 등록돼요</p>
                <button
                  type="button"
                  onClick={() => void handleNaverDisconnect()}
                  disabled={naverLoading}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-haru-border px-3 py-2 text-xs font-medium text-haru-muted active:bg-haru-primary-soft disabled:opacity-40"
                >
                  <Link2Off className="h-3.5 w-3.5" />
                  연결 해제
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-haru-muted">연결하면 하루투두 일정이 자동으로 등록돼요</p>
                <button
                  type="button"
                  onClick={handleNaverConnect}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-haru-primary px-3 py-2 text-xs font-semibold text-haru-text active:bg-haru-primary-active"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  연결하기
                </button>
              </div>
            )}
          </div>
          {/* 홈 화면 위젯 */}
          <div className="px-5 py-4">
            <p className="mb-2 text-xs font-semibold text-haru-muted">홈 화면 위젯</p>
            <p className="mb-3 text-xs leading-relaxed text-haru-muted">
              Scriptable 앱으로 홈 화면에 월간 캘린더 위젯을 추가할 수 있어요. 버튼을 누르면 스크립트가 복사되고 Scriptable이 열려요. 새 스크립트를 만들어 붙여넣기 후 실행하면 돼요.
            </p>
            <button
              type="button"
              onClick={() => void handleInstallWidget()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-haru-primary py-3 text-sm font-semibold text-haru-text active:bg-haru-primary-active"
            >
              <Download className="h-4 w-4" />
              복사하고 Scriptable 열기
            </button>
            <p className="mt-2 text-center text-xs text-haru-muted">
              Scriptable이 설치돼 있어야 해요 (App Store 무료)
            </p>
          </div>
        </div>
      </section>
```

- [ ] **Step 2: `Smartphone` import 제거**

```tsx
// 변경 전
import { Plus, Trash2, Check, X, Pencil, LogOut, ChevronRight, AlertTriangle, Bell, Clock, Link2, Link2Off, Smartphone, Download } from "lucide-react";

// 변경 후
import { Plus, Trash2, Check, X, Pencil, LogOut, ChevronRight, AlertTriangle, Bell, Clock, Link2, Link2Off, Download } from "lucide-react";
```

- [ ] **Step 3: 타입 검사**

```bash
npm run type-check
```

Expected: 오류 0개

- [ ] **Step 4: 커밋**

```bash
git add app/(main)/mypage/page.tsx
git commit -m "refactor: 외부 캘린더 연동과 홈 화면 위젯을 연동 카드로 통합"
```

---

### Task 3: 계정 카드 통합 (로그아웃 + 커플 연결 해제)

**Files:**
- Modify: `app/(main)/mypage/page.tsx`

**변경 요약:**
- "계정(로그아웃)" 섹션과 "위험 구역" 섹션을 단일 "계정" 카드로 교체
- 연결 해제는 텍스트 색상으로 위험도 표현 유지, 별도 danger border 카드 제거

- [ ] **Step 1: 두 섹션을 계정 카드 하나로 교체**

현재 "계정 — Settings 스타일 행" 섹션부터 "위험 구역" 섹션 끝까지 전체를 다음으로 교체:

```tsx
      {/* 계정 */}
      <section className="overflow-hidden rounded-2xl bg-haru-surface shadow-card">
        <button
          type="button"
          onClick={() => setLogoutOpen(true)}
          disabled={isLoggingOut}
          className="flex h-[52px] w-full items-center gap-3 px-5 transition-colors active:bg-haru-primary-soft disabled:opacity-40"
        >
          <LogOut className="h-4 w-4 shrink-0 text-haru-muted" />
          <span className="flex-1 text-left text-base text-haru-text">로그아웃</span>
          {isLoggingOut ? (
            <span className="text-sm text-haru-muted">처리 중...</span>
          ) : (
            <ChevronRight className="h-4 w-4 text-haru-muted" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setDisconnectOpen(true)}
          className="flex w-full items-center gap-3 border-t border-haru-border px-5 py-4 transition-colors active:bg-haru-danger/5"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-haru-danger" />
          <div className="flex-1 text-left">
            <p className="text-base text-haru-danger">커플 연결 해제</p>
            <p className="mt-0.5 text-xs text-haru-muted">해제 시 공유 데이터가 모두 삭제돼요</p>
          </div>
          <ChevronRight className="h-4 w-4 text-haru-danger" />
        </button>
      </section>
```

- [ ] **Step 2: 타입 검사 + 린트**

```bash
npm run type-check && npm run lint
```

Expected: 오류 0개

- [ ] **Step 3: 빌드 검증**

```bash
npm run build
```

Expected: 빌드 성공

- [ ] **Step 4: 커밋**

```bash
git add app/(main)/mypage/page.tsx
git commit -m "refactor: 마이페이지 섹션 통합 — 8개 카드를 5개로 정리"
```

---

## 최종 확인 체크리스트

- [ ] 마이페이지 스크롤 시 섹션 5개 노출 확인 (프로필, 커스텀 그룹, 알림, 연동, 계정)
- [ ] 프로필 카드 하단 내 주기 토글 ON/OFF 동작 확인
- [ ] 내 주기 ON 시 안내 문구 노출 확인
- [ ] 이름 편집 모드 진입/종료 시 내 주기 토글이 가려지지 않는지 확인
- [ ] 네이버 캘린더 연결/해제 버튼 동작 확인
- [ ] 위젯 복사 버튼 동작 확인
- [ ] 로그아웃 탭 → ConfirmDialog 노출 확인
- [ ] 커플 연결 해제 탭 → ConfirmDialog 노출 확인 (기존 경고 문구 유지)
- [ ] 375px 기준 모바일 레이아웃 확인
