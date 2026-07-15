# 캘린더 공휴일·토요일 표시 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한국 달력 표준에 맞게 캘린더에 토요일(파란색)·공휴일(빨간색)을 표시한다.

**Architecture:** `holiday-kr` 패키지로 공휴일 여부를 계산한다. `MonthCalendar`가 `useMemo`로 표시 날짜들의 공휴일 Set을 만들고, `DayCell`에 `isSaturday`·`isHoliday` prop으로 전달한다. calendar page.tsx는 변경하지 않는다.

**Tech Stack:** Next.js App Router, React, Tailwind CSS, `holiday-kr`

## Global Constraints

- `any` 타입 사용 금지
- 디자인 토큰(`haru-*`) 사용 — 임의 색상 하드코딩 금지
- 터치 타깃 44px 이상 유지 (기존 DayCell 구조 변경 없음)
- `npm run type-check` 타입 오류 0개
- `npm run lint` 에러 0개

---

## 파일 구조

| 파일 | 변경 |
|------|------|
| `package.json` | 수정 — `holiday-kr` 의존성 추가 |
| `types/holiday-kr.d.ts` | 생성 — `holiday-kr` 모듈 타입 선언 |
| `components/calendar/DayCell.tsx` | 수정 — `isSaturday`, `isHoliday` prop 추가 및 색상 분기 |
| `components/calendar/MonthCalendar.tsx` | 수정 — 공휴일 Set 계산, DayCell에 전달 |

---

### Task 1: DayCell 컴포넌트에 토요일·공휴일 props 추가

**Files:**
- Modify: `components/calendar/DayCell.tsx`
- Create: `types/holiday-kr.d.ts`
- Install: `holiday-kr` (package.json via npm)

**Interfaces:**
- Produces: `DayCell` 컴포넌트가 `isSaturday: boolean`, `isHoliday: boolean` prop을 받고, 색상 우선순위 `(isHoliday || isSunday) → text-haru-danger`, `isSaturday → text-haru-accent`를 적용한다.

- [ ] **Step 1: `holiday-kr` 설치**

```bash
npm install holiday-kr
```

Expected: `package.json`의 `dependencies`에 `"holiday-kr": "^0.1.5"` 추가됨.

- [ ] **Step 2: 타입 선언 파일 생성**

`types/holiday-kr.d.ts` 를 아래 내용으로 생성한다:

```ts
declare module "holiday-kr" {
  export function isHoliday(date: Date): boolean;
  export function isLunarHoliday(date: Date): boolean;
  export function isSolarHoliday(date: Date): boolean;
}
```

- [ ] **Step 3: `DayCell.tsx` 전체 교체**

`components/calendar/DayCell.tsx` 를 아래 내용으로 교체한다:

```tsx
"use client";

import { cn } from "@/lib/utils/cn";

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isSunday: boolean;
  isSaturday?: boolean;
  isHoliday?: boolean;
  hasMark?: boolean;
  overflowCount?: number;
  disabled?: boolean;
  cycleType?: "recorded" | null;
  onClick: () => void;
}

export default function DayCell({
  date,
  iso,
  inMonth,
  isToday,
  isSelected,
  isSunday,
  isSaturday = false,
  isHoliday = false,
  hasMark = false,
  overflowCount = 0,
  disabled = false,
  cycleType,
  onClick,
}: Props) {
  const dayNum = date.getDate();

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-label={iso}
      aria-pressed={isSelected}
      aria-disabled={disabled}
      className={cn(
        "flex h-full w-full flex-col items-center pt-1.5 transition-colors",
        cycleType === "recorded" && inMonth && "bg-haru-cycle-soft",
        !disabled && "active:bg-haru-primary-soft/60",
        !inMonth && "opacity-30",
        disabled && inMonth && "opacity-30 cursor-default"
      )}
    >
      <div className="relative flex w-full justify-center">
        <span
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs leading-none",
            isToday && isSelected
              ? "bg-haru-primary/25 ring-2 ring-haru-primary-active"
              : isToday
              ? "ring-2 ring-haru-primary-active"
              : isSelected
              ? "bg-haru-primary/25"
              : isHoliday || isSunday
              ? "text-haru-danger"
              : isSaturday
              ? "text-haru-accent"
              : "text-haru-text"
          )}
        >
          {dayNum}
        </span>
        {overflowCount > 0 && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] leading-none text-haru-muted">
            +{overflowCount}
          </span>
        )}
      </div>
      {hasMark && (
        <span className="mt-1 h-1 w-1 rounded-full bg-haru-primary" />
      )}
    </button>
  );
}
```

- [ ] **Step 4: 타입 검사**

```bash
npm run type-check
```

Expected: 오류 0개. (`isSaturday`, `isHoliday`가 optional + 기본값이므로 MonthCalendar 수정 전에도 타입 오류 없음.)

- [ ] **Step 5: 커밋**

```bash
git add types/holiday-kr.d.ts components/calendar/DayCell.tsx package.json package-lock.json
git commit -m "feat: DayCell에 isSaturday·isHoliday prop 추가"
```

---

### Task 2: MonthCalendar에서 공휴일 계산 후 DayCell에 전달

**Files:**
- Modify: `components/calendar/MonthCalendar.tsx`

**Interfaces:**
- Consumes: Task 1에서 추가된 `DayCell` props — `isSaturday: boolean`, `isHoliday: boolean`
- Produces: 없음 (MonthCalendar의 외부 인터페이스 변경 없음)

- [ ] **Step 1: `isHoliday` import 추가**

`components/calendar/MonthCalendar.tsx` 상단 import 블록에 한 줄 추가한다. 현재 파일 첫 줄은 `"use client";` 이고 그 다음이 import들이다:

```tsx
// 기존 import들 아래에 추가
import { isHoliday } from "holiday-kr";
```

- [ ] **Step 2: `holidaySet` useMemo 추가**

`MonthCalendar` 함수 본문에서 `cells` useMemo 바로 아래에 추가한다. 현재 코드에서 `cells` useMemo 다음에 `weeks` useMemo가 있다:

```tsx
// 기존 cells useMemo (변경 없음)
const cells = useMemo(() => getMonthDays(year, month), [year, month]);

// 아래 holidaySet useMemo 추가
const holidaySet = useMemo(() => {
  const set = new Set<string>();
  for (const cell of cells) {
    if (isHoliday(cell.date)) set.add(cell.iso);
  }
  return set;
}, [cells]);

// 기존 weeks useMemo (변경 없음)
const weeks = useMemo(() => {
  ...
}, [cells]);
```

- [ ] **Step 3: DayCell에 `isSaturday`, `isHoliday` 전달**

`MonthCalendar.tsx`의 `<DayCell>` JSX에서 기존 `isSunday={colIdx === 0}` 아래에 두 줄을 추가한다:

```tsx
<DayCell
  key={cell.iso}
  date={cell.date}
  iso={cell.iso}
  inMonth={cell.inMonth}
  isToday={cell.iso === todayISO}
  isSelected={cell.iso === selectedDate}
  isSunday={colIdx === 0}
  isSaturday={colIdx === 6}
  isHoliday={holidaySet.has(cell.iso)}
  hasMark={markedDates?.has(cell.iso) ?? false}
  overflowCount={overflowByIso[cell.iso] ?? 0}
  disabled={(minDate !== undefined && cell.iso < minDate) || (maxDate !== undefined && cell.iso > maxDate)}
  cycleType={cycleDateSet.has(cell.iso) ? "recorded" : null}
  onClick={() => onSelectDate(cell.iso)}
/>
```

- [ ] **Step 4: 타입 검사 + 린트**

```bash
npm run type-check && npm run lint
```

Expected: 오류 0개.

- [ ] **Step 5: 빌드 검증**

```bash
npm run build
```

Expected: 빌드 성공.

- [ ] **Step 6: 커밋**

```bash
git add components/calendar/MonthCalendar.tsx
git commit -m "feat: 캘린더 공휴일·토요일 색상 표시 추가"
```

---

## 최종 확인 체크리스트

- [ ] 토요일 날짜가 `text-haru-accent` (스카이 블루) 로 표시되는지 확인
- [ ] 일요일 날짜가 기존과 동일하게 `text-haru-danger` (빨간색)으로 표시되는지 확인
- [ ] 공휴일(예: 광복절 8/15, 추석 연휴)이 빨간색으로 표시되는지 확인
- [ ] 공휴일이 토요일에 겹치는 경우 빨간색으로 표시되는지 확인
- [ ] isToday/isSelected 상태에서 색상 우선순위가 깨지지 않는지 확인
- [ ] 375px 모바일 기준 레이아웃 이상 없는지 확인
