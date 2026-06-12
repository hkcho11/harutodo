-- ============================================================
-- notification_logs: 발송된 알림 기록
-- ============================================================
-- Edge Function이 service_role로 INSERT/UPDATE.
-- 클라이언트는 SELECT only (클릭 여부 확인용).

CREATE TABLE notification_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type              TEXT        NOT NULL,  -- 'morning' | 'evening' | 'event'
  notification_id   UUID        NOT NULL DEFAULT gen_random_uuid(),
  scheduled_date    DATE        NOT NULL,
  status            TEXT        NOT NULL,  -- 'sent' | 'failed' | 'skipped'
  error_message     TEXT,
  clicked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, type, scheduled_date)
);

CREATE INDEX ON notification_logs (user_id, created_at DESC);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_logs_select" ON notification_logs
  FOR SELECT USING (auth.uid() = user_id);
