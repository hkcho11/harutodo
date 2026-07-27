-- 네이버 캘린더 연동 제거
-- 저장된 OAuth 토큰과 해당 테이블의 RLS 정책을 함께 제거한다.
DROP TABLE IF EXISTS public.naver_calendar_tokens;
