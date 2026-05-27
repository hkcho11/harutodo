-- ============================================================
-- 커플 무결성 강화
-- ============================================================

-- ── Item 1: 한 유저가 두 커플에 걸치는 cross-column 문제 차단 ──

CREATE OR REPLACE FUNCTION check_single_couple_membership()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM couples
    WHERE user1_id = NEW.user1_id OR user2_id = NEW.user1_id
       OR user1_id = NEW.user2_id OR user2_id = NEW.user2_id
  ) THEN
    RAISE EXCEPTION 'user_already_in_couple';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER couples_single_membership_check
  BEFORE INSERT ON couples
  FOR EACH ROW EXECUTE FUNCTION check_single_couple_membership();

-- ── Item 2: 이미 커플인 유저는 초대코드 생성 차단 ──────────────

CREATE OR REPLACE FUNCTION create_invite_code()
RETURNS JSON AS $$
DECLARE
  chars    TEXT    := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  v_code   TEXT    := '';
  attempts INTEGER := 0;
  i        INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1 FROM couples
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_connected');
  END IF;

  DELETE FROM invite_codes
  WHERE user_id = auth.uid()
    AND (used_at IS NOT NULL OR expires_at < NOW());

  LOOP
    v_code := '';
    FOR i IN 1..8 LOOP
      v_code := v_code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM invite_codes WHERE code = v_code AND used_at IS NULL);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'invite_code_generation_failed';
    END IF;
  END LOOP;

  INSERT INTO invite_codes (user_id, code, expires_at)
  VALUES (auth.uid(), v_code, NOW() + INTERVAL '24 hours');

  RETURN json_build_object(
    'code', v_code,
    'expires_at', (NOW() + INTERVAL '24 hours')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ── Item 3: assignee_id가 해당 커플 멤버인지 검증 ──────────────

CREATE OR REPLACE FUNCTION check_assignee_couple_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignee_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM couples
      WHERE id = NEW.couple_id
        AND (user1_id = NEW.assignee_id OR user2_id = NEW.assignee_id)
    ) THEN
      RAISE EXCEPTION 'assignee_id must be a member of the couple';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER todo_items_assignee_check
  BEFORE INSERT OR UPDATE ON todo_items
  FOR EACH ROW EXECUTE FUNCTION check_assignee_couple_member();

-- ── Item 4: todo_items.created_by / couple_id 불변 강제 ─────────

CREATE OR REPLACE FUNCTION prevent_todo_items_immutable_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by != OLD.created_by THEN
    RAISE EXCEPTION 'todo_items.created_by is immutable';
  END IF;
  IF NEW.couple_id != OLD.couple_id THEN
    RAISE EXCEPTION 'todo_items.couple_id is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER todo_items_immutable_check
  BEFORE UPDATE ON todo_items
  FOR EACH ROW EXECUTE FUNCTION prevent_todo_items_immutable_changes();

-- ── Item 5: custom_groups.couple_id / created_by 불변 강제 ──────

CREATE OR REPLACE FUNCTION prevent_custom_groups_immutable_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.couple_id != OLD.couple_id THEN
    RAISE EXCEPTION 'custom_groups.couple_id is immutable';
  END IF;
  IF NEW.created_by != OLD.created_by THEN
    RAISE EXCEPTION 'custom_groups.created_by is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER custom_groups_immutable_check
  BEFORE UPDATE ON custom_groups
  FOR EACH ROW EXECUTE FUNCTION prevent_custom_groups_immutable_changes();
