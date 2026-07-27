# 포트폴리오 데모 CRUD 시나리오

## 목적

운영 개인정보를 사용하지 않고 실제 하루투두의 Auth, RLS, CRUD 경로와
모바일 UI를 재현한다. 화면 목업이 아니라 개발 Supabase에 격리된 데모
커플을 생성하고 실제 브라우저에서 로그인해 촬영한다.

## 데모 인물

- 민서: 본인 역할
- 지호: 파트너 역할

이름과 모든 일정은 가상의 포트폴리오 전용 데이터다.

## 기본 데이터

### 오늘 투두

- 함께: 주말 장보기 목록 확인
- 민서: 여행 숙소 예약 확인
- 지호: 저녁 식당 후보 찾아보기
- 그 외: 공용 생활비 정리
- 여행 준비: 렌터카 예약 조건 비교

### 지난 미완료

- 여행 준비물 체크

### 일정

- 운동 수업
- 주말 데이트
- 친구 모임
- 여름 여행

## 실제 실행한 CRUD

1. 로그인 후 오늘 화면 조회
2. `세탁물 찾아오기` 생성
3. `세탁물 찾아오고 옷장 정리`로 제목 수정
4. 완료 상태로 변경
5. 삭제 확인 다이얼로그 진입
6. 삭제 확정
7. 캘린더에서 다음 날 `운동 수업` 상세 조회
8. 일정 추가 화면에서 `주말 브런치` 입력
9. `성수 카페` 장소 검색
10. 검색 결과를 선택해 장소와 지도 미리보기 확인
11. 마이페이지에서 커플 프로필·그룹·알림 설정 조회

## 결과 이미지

- `product-home-read.webp`
- `product-todo-create.webp`
- `product-todo-created.webp`
- `product-todo-update.webp`
- `product-todo-completed.webp`
- `product-todo-delete.webp`
- `product-calendar.webp`
- `product-calendar-create.webp`
- `product-calendar-location-search.webp`
- `product-calendar-location-selected.webp`
- `product-mypage.webp`

모든 이미지는 390 × 844 CSS viewport, device scale factor 2로 캡처하고
WebP 품질 86으로 변환했다. 현재 파일은 모두 50KB 미만이다.

## 재생성 방법

```bash
node scripts/create-portfolio-demo.mjs
node scripts/capture-portfolio-demo.mjs
```

첫 번째 스크립트는 다음 안전장치를 가진다.

- 연결 URL에 개발 프로젝트 ref가 없으면 즉시 중단
- `portfolio.demo.` 이메일 prefix의 이전 데모 사용자만 삭제
- 기존 개발 사용자와 커플은 수정하지 않음
- 운영 프로젝트에는 실행 불가

두 번째 스크립트는 임시 비밀번호를 로그에 출력하지 않으며 캡처 종료 후
Chrome 프로필을 삭제한다. `.tmp-portfolio/`는 Git에서 제외한다.

## 포트폴리오 표기

이미지 근처에 다음 사실을 명시한다.

> 개발 환경의 포트폴리오 전용 데모 데이터로 실제 서비스 UI와 CRUD 흐름을
> 재현했습니다.

운영 사용자 데이터나 실제 성과 데이터로 소개하지 않는다.
