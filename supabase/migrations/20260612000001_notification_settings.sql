-- ============================================================
-- notification_settings: 사용자별 알림 설정
-- ============================================================

CREATE TABLE notification_settings (
  id               UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID      NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  morning_enabled  BOOLEAN   NOT NULL DEFAULT true,
  morning_time     TIME      NOT NULL DEFAULT '08:00',
  event_enabled    BOOLEAN   NOT NULL DEFAULT true,
  event_lead_min   SMALLINT  NOT NULL DEFAULT 30,
  evening_enabled  BOOLEAN   NOT NULL DEFAULT false,
  evening_time     TIME      NOT NULL DEFAULT '20:00',
  partner_enabled  BOOLEAN   NOT NULL DEFAULT true,
  show_content     BOOLEAN   NOT NULL DEFAULT false,
  timezone         TEXT      NOT NULL DEFAULT 'Asia/Seoul',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_settings_select" ON notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notif_settings_update" ON notification_settings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 회원가입 시 기본 설정 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_settings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_notification_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_notification_settings();
