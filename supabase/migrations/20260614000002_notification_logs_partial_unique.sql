-- ============================================================
-- notification_logs UNIQUE 제약 완화
-- morning/evening은 하루 1건 제한 유지
-- event_reminder는 하루 여러 건 허용 (일정이 여러 개일 수 있음)
-- ============================================================

ALTER TABLE notification_logs
  DROP CONSTRAINT IF EXISTS notification_logs_user_id_type_scheduled_date_key;

CREATE UNIQUE INDEX notification_logs_morning_evening_unique
  ON notification_logs (user_id, type, scheduled_date)
  WHERE type IN ('morning', 'evening');
