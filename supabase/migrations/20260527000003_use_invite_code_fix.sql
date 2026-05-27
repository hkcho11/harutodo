-- ============================================================
-- use_invite_code(): 커플 중복 예외 명시적 처리
-- ============================================================

CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite    RECORD;
  v_couple_id UUID;
BEGIN
  -- 수락자(auth.uid())가 이미 커플인지 사전 확인
  IF EXISTS (
    SELECT 1 FROM couples
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_connected');
  END IF;

  -- 원자적 코드 선점
  UPDATE invite_codes
  SET used_at = NOW()
  WHERE code       = p_code
    AND used_at    IS NULL
    AND expires_at > NOW()
    AND user_id   != auth.uid()
  RETURNING * INTO v_invite;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- 초대자(v_invite.user_id)도 코드 선점 이후 시점에서 재확인
  IF EXISTS (
    SELECT 1 FROM couples
    WHERE user1_id = v_invite.user_id OR user2_id = v_invite.user_id
  ) THEN
    UPDATE invite_codes SET used_at = NULL WHERE id = v_invite.id;
    RETURN json_build_object('success', false, 'error', 'already_connected');
  END IF;

  -- 커플 생성
  INSERT INTO couples (user1_id, user2_id)
  VALUES (v_invite.user_id, auth.uid())
  RETURNING id INTO v_couple_id;

  RETURN json_build_object('success', true, 'couple_id', v_couple_id);

EXCEPTION
  WHEN unique_violation THEN
    UPDATE invite_codes SET used_at = NULL WHERE id = v_invite.id;
    RETURN json_build_object('success', false, 'error', 'already_connected');
  WHEN OTHERS THEN
    -- check_single_couple_membership 트리거가 던지는 user_already_in_couple 포함
    IF v_invite.id IS NOT NULL THEN
      UPDATE invite_codes SET used_at = NULL WHERE id = v_invite.id;
    END IF;
    IF SQLERRM = 'user_already_in_couple' THEN
      RETURN json_build_object('success', false, 'error', 'already_connected');
    END IF;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
