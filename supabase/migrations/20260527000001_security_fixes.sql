-- ============================================================
-- 하루투두 보안/무결성 보완
-- ============================================================

-- ── Item 1: 한 유저는 하나의 커플에만 속함 (DB 레벨 강제) ──

CREATE UNIQUE INDEX couples_user1_unique ON couples(user1_id);
CREATE UNIQUE INDEX couples_user2_unique ON couples(user2_id);

-- ── Item 2: couples 직접 INSERT 차단 ────────────────────────

DROP POLICY "couples_insert" ON couples;

-- ── Item 3: todo_items user_id → created_by + assignee_id ──

ALTER TABLE todo_items RENAME COLUMN user_id TO created_by;

ALTER TABLE todo_items
  ADD COLUMN assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- INSERT 정책: created_by 기준으로 변경
DROP POLICY "todo_items_insert" ON todo_items;
CREATE POLICY "todo_items_insert" ON todo_items FOR INSERT WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM couples WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- ── Item 6: invite_codes 직접 INSERT 차단 ───────────────────

DROP POLICY "invite_codes_insert" ON invite_codes;

-- ── Item 7: custom_group이 같은 couple 소속인지 검증 ────────

CREATE OR REPLACE FUNCTION check_custom_group_couple()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.custom_group_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM custom_groups
      WHERE id = NEW.custom_group_id
        AND couple_id = NEW.couple_id
    ) THEN
      RAISE EXCEPTION 'custom_group_id must belong to the same couple';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public, pg_temp;

CREATE TRIGGER todo_items_custom_group_check
  BEFORE INSERT OR UPDATE ON todo_items
  FOR EACH ROW EXECUTE FUNCTION check_custom_group_couple();

-- ── Item 8: Realtime publication ────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE todo_items;
ALTER PUBLICATION supabase_realtime ADD TABLE couples;
ALTER PUBLICATION supabase_realtime ADD TABLE custom_groups;

-- ── Item 9: custom_groups update 정책 + CHECK 제약 ──────────

CREATE POLICY "custom_groups_update" ON custom_groups
  FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

ALTER TABLE custom_groups
  ADD CONSTRAINT custom_groups_name_not_empty CHECK (length(trim(name)) > 0),
  ADD CONSTRAINT custom_groups_name_length    CHECK (length(name) <= 50);

ALTER TABLE todo_items
  ADD CONSTRAINT todo_items_title_not_empty CHECK (length(trim(title)) > 0),
  ADD CONSTRAINT todo_items_title_length    CHECK (length(title) <= 200);

-- ── Item 4+5: use_invite_code() 재작성 ──────────────────────
-- 동시성 안전: UPDATE...RETURNING으로 원자 처리
-- unique constraint 충돌 시 EXCEPTION으로 롤백
-- search_path 명시

CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite    RECORD;
  v_couple_id UUID;
BEGIN
  -- 원자적 코드 선점 (SELECT FOR UPDATE 없이 UPDATE RETURNING으로 처리)
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

  -- 커플 생성 — unique index가 양쪽 동시 연결 시도를 자동 차단
  INSERT INTO couples (user1_id, user2_id)
  VALUES (v_invite.user_id, auth.uid())
  RETURNING id INTO v_couple_id;

  RETURN json_build_object('success', true, 'couple_id', v_couple_id);

EXCEPTION
  WHEN unique_violation THEN
    -- 커플이 이미 있는 경우 코드 사용 취소 후 오류 반환
    UPDATE invite_codes SET used_at = NULL WHERE id = v_invite.id;
    RETURN json_build_object('success', false, 'error', 'already_connected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ── Item 5: 나머지 SECURITY DEFINER 함수 search_path 추가 ───

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION create_invite_code()
RETURNS JSON AS $$
DECLARE
  chars    TEXT    := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  v_code   TEXT    := '';
  attempts INTEGER := 0;
  i        INTEGER;
BEGIN
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

-- update_updated_at (SECURITY DEFINER 아니지만 search_path 일관성)
ALTER FUNCTION update_updated_at() SET search_path = public, pg_temp;
