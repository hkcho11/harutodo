-- ============================================================
-- 기존 유저 notification_settings 일괄 생성
-- ============================================================
-- 트리거는 신규 가입자에만 동작하므로 기존 유저는 수동 backfill 필요.
-- INSERT 정책 추가로 클라이언트 fallback도 허용.

INSERT INTO notification_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 유저가 본인 설정을 직접 생성할 수 있도록 허용 (트리거 누락 시 fallback)
CREATE POLICY "notif_settings_insert" ON notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
