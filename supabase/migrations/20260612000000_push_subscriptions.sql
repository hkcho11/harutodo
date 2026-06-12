-- ============================================================
-- push_subscriptions: Web Push 구독 정보 저장
-- ============================================================
-- 유저당 여러 기기(브라우저)를 지원하기 위해 subscription JSON을 행으로 저장.
-- Edge Function이 service_role로 조회하므로 SELECT 정책은 본인만 허용.

CREATE TABLE push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subscription)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subs_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subs_select" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_subs_delete" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);
