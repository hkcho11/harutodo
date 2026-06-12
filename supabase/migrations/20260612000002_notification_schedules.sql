-- ============================================================
-- notification_schedules: 일정 알림 예약 관리
-- ============================================================
-- DB 트리거가 events CRUD 시 자동으로 예약/취소.
-- Edge Function (event-reminder)이 service_role로 scheduled_at 도달 시 발송.

CREATE TABLE notification_schedules (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id      UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  sent_at       TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 미발송 예약 조회 최적화 (event-reminder cron 쿼리)
CREATE INDEX ON notification_schedules (scheduled_at)
  WHERE sent_at IS NULL AND cancelled_at IS NULL;

ALTER TABLE notification_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_schedules_select" ON notification_schedules
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 트리거: events INSERT/UPDATE 시 알림 예약 동기화
-- ============================================================
-- DELETE는 FK ON DELETE CASCADE가 처리하므로 트리거 불필요.

CREATE OR REPLACE FUNCTION public.sync_event_notification_schedules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_couple        record;
  v_user_ids      UUID[];
  v_recipient     UUID;
  v_settings      notification_settings%ROWTYPE;
  v_event_utc     TIMESTAMPTZ;
  v_scheduled_at  TIMESTAMPTZ;
BEGIN
  -- UPDATE 시 기존 미발송 예약 취소 후 재생성
  IF TG_OP = 'UPDATE' THEN
    UPDATE notification_schedules
    SET cancelled_at = NOW()
    WHERE event_id = NEW.id
      AND sent_at IS NULL
      AND cancelled_at IS NULL;
  END IF;

  -- 시작 시간 없는 종일 일정은 알림 예약 불필요
  IF NEW.start_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- 일정 시작 시각을 UTC로 변환 (date + start_time을 KST로 해석)
  v_event_utc := (NEW.date::date + NEW.start_time::time) AT TIME ZONE 'Asia/Seoul';

  -- 커플 멤버 조회
  SELECT user1_id, user2_id INTO v_couple
  FROM couples WHERE id = NEW.couple_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_user_ids := ARRAY[v_couple.user1_id, v_couple.user2_id];

  FOREACH v_recipient IN ARRAY v_user_ids
  LOOP
    -- assignee_id가 지정된 경우 해당 유저만 알림
    IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id != v_recipient THEN
      CONTINUE;
    END IF;

    -- 유저 알림 설정 조회
    SELECT * INTO v_settings
    FROM notification_settings WHERE user_id = v_recipient;

    IF NOT FOUND OR NOT v_settings.event_enabled THEN
      CONTINUE;
    END IF;

    v_scheduled_at := v_event_utc - (v_settings.event_lead_min || ' minutes')::INTERVAL;

    -- 과거 시각이면 예약 생략
    IF v_scheduled_at <= NOW() THEN
      CONTINUE;
    END IF;

    INSERT INTO notification_schedules (user_id, event_id, scheduled_at)
    VALUES (v_recipient, NEW.id, v_scheduled_at);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_event_notif_schedules
  AFTER INSERT OR UPDATE ON events
  FOR EACH ROW EXECUTE PROCEDURE public.sync_event_notification_schedules();
