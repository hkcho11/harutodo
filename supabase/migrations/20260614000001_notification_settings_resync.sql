-- ============================================================
-- notification_settings 변경 시 event 알림 예약 재동기화
-- event_enabled / event_lead_min 변경 시에만 실행
-- ============================================================

CREATE OR REPLACE FUNCTION public.resync_user_event_notification_schedules()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event  RECORD;
  v_sched  TIMESTAMPTZ;
BEGIN
  -- event 관련 설정 변경 없으면 스킵
  IF OLD.event_enabled = NEW.event_enabled AND OLD.event_lead_min = NEW.event_lead_min THEN
    RETURN NEW;
  END IF;

  -- 기존 미발송 예약 모두 취소
  UPDATE notification_schedules
  SET cancelled_at = NOW()
  WHERE user_id = NEW.user_id
    AND sent_at IS NULL
    AND cancelled_at IS NULL;

  -- event_enabled OFF면 재생성 없이 종료
  IF NOT NEW.event_enabled THEN
    RETURN NEW;
  END IF;

  -- 이 유저가 수신 대상인 미래 일정에 대해 재예약
  FOR v_event IN
    SELECT e.id, e.date, e.start_time
    FROM events e
    JOIN couples c ON c.id = e.couple_id
    WHERE (c.user1_id = NEW.user_id OR c.user2_id = NEW.user_id)
      AND e.start_time IS NOT NULL
      AND (e.assignee_id IS NULL OR e.assignee_id = NEW.user_id)
  LOOP
    v_sched := (v_event.date::date + v_event.start_time::time) AT TIME ZONE 'Asia/Seoul'
               - (NEW.event_lead_min || ' minutes')::INTERVAL;

    -- 과거 시각이면 스킵
    IF v_sched <= NOW() THEN
      CONTINUE;
    END IF;

    INSERT INTO notification_schedules (user_id, event_id, scheduled_at)
    VALUES (NEW.user_id, v_event.id, v_sched);
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER resync_event_notif_on_settings_update
  AFTER UPDATE OF event_enabled, event_lead_min ON notification_settings
  FOR EACH ROW EXECUTE PROCEDURE public.resync_user_event_notification_schedules();
