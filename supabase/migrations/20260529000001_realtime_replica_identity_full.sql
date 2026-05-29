-- ============================================================
-- Realtime DELETE 동기화 fix — REPLICA IDENTITY FULL
-- ============================================================
-- Supabase Realtime의 DELETE 이벤트는 클라이언트로 전달되기 전에 RLS SELECT
-- 정책으로 필터링된다. 그러나 기본 REPLICA IDENTITY DEFAULT 하에서는 DELETE
-- payload의 `old`에 PK만 노출되므로, RLS 정책의 `couple_id` 평가가 불가능해
-- 이벤트가 누락된다(추가/수정은 new에 전체 row가 있어 통과됨).
--
-- 해당 테이블들을 FULL로 변경하면 DELETE payload의 old에 전체 row가 실려
-- RLS 정책이 정상 평가되고, 파트너 클라이언트에도 DELETE 이벤트가 도달한다.

ALTER TABLE todo_items REPLICA IDENTITY FULL;
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE custom_groups REPLICA IDENTITY FULL;
