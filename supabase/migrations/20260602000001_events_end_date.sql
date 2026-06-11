-- ============================================================
-- events 테이블에 end_date 컬럼 추가 (다일 일정 지원)
-- ============================================================
-- end_date가 NULL이면 단일일 일정.
-- end_date >= date 제약으로 역순 방지.

ALTER TABLE events
  ADD COLUMN end_date DATE;

ALTER TABLE events
  ADD CONSTRAINT events_end_date_order CHECK (end_date IS NULL OR end_date >= date);
