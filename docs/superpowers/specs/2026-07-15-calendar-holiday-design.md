# 캘린더 공휴일 표시 — 디자인 스펙

## 배경

현재 캘린더는 일요일만 빨간색으로 표시하고 토요일·공휴일은 구분이 없다. 한국 달력 표준에 맞게 토요일(파란색), 공휴일(빨간색)을 추가한다.

## 목표

- 일요일: 기존과 동일 (`text-haru-danger`)
- 공휴일: 빨간색 (`text-haru-danger`) — 일요일과 동일 처리
- 토요일: 파란색 (`text-haru-accent`)
- 공휴일이 토요일에 겹치면 빨간색 우선
- 외부 API 없이 오프라인에서도 동작

## 패키지

`holiday-kr@0.1.5` (MIT, 의존성 없음)

- `isHoliday(date: Date): boolean` — 양력·음력 공휴일 모두 지원
- 설날·추석 등 음력 기반 공휴일 자동 계산

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `holiday-kr` 의존성 추가 |
| `components/calendar/DayCell.tsx` | `isSaturday`, `isHoliday` prop 추가 및 색상 분기 |
| `components/calendar/MonthCalendar.tsx` | 공휴일 Set 계산 후 DayCell에 전달, `isSaturday` 전달 |

## DayCell 색상 우선순위

```
isHoliday || isSunday  →  text-haru-danger  (빨간색)
isSaturday             →  text-haru-accent  (스카이 블루 #B8DCE8)
그 외                  →  text-haru-text    (기존 동일)
```

## MonthCalendar 공휴일 계산

- `useMemo`로 `cells` 변경 시 재계산
- 화면에 표시된 모든 날짜(이전달·다음달 포함)에 대해 `isHoliday(cell.date)` 호출
- 결과를 `Set<string>` (ISO 날짜 문자열)으로 관리
- `isSaturday`: `colIdx === 6`
- `isSunday`: `colIdx === 0` (기존 유지)

## 유지되는 것

- `isSunday` prop 및 기존 빨간색 처리 로직
- `cycleType`, `hasMark`, `isToday`, `isSelected` 등 기존 DayCell 동작
- calendar page.tsx 변경 없음 (MonthCalendar 내부에서 처리)
