-- ============================================================
-- analytics_events: 클라이언트 행동 추적 (push_clicked 등)
-- ============================================================
-- 인증 유저가 본인 이벤트를 INSERT. SELECT는 service_role만.

CREATE TABLE analytics_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name   TEXT        NOT NULL,
  properties   JSONB       NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON analytics_events (user_id, event_name, occurred_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_insert" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
