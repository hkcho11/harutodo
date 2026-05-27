-- ============================================================
-- 하루투두 초기 스키마
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 공통 트리거: updated_at 자동 갱신 ───────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 테이블 ──────────────────────────────────────────────────

-- profiles: auth.users 확장 (회원가입 시 자동 생성)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- couples: 커플 연결
CREATE TABLE couples (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT couples_unique        UNIQUE (user1_id, user2_id),
  CONSTRAINT couples_different_users CHECK (user1_id != user2_id)
);

-- invite_codes: 초대 코드 (24시간 유효)
CREATE TABLE invite_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  code       TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX invite_codes_code_idx    ON invite_codes(code);
CREATE INDEX invite_codes_user_id_idx ON invite_codes(user_id);

-- todo_group enum
CREATE TYPE todo_group AS ENUM ('together', 'individual', 'other', 'custom');

-- custom_groups: 커스텀 투두 그룹
CREATE TABLE custom_groups (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id  UUID        NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX custom_groups_couple_id_idx ON custom_groups(couple_id);

-- todo_items: 투두
CREATE TABLE todo_items (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id       UUID        NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  date            DATE,
  "group"         todo_group  NOT NULL DEFAULT 'other',
  custom_group_id UUID        REFERENCES custom_groups(id) ON DELETE SET NULL,
  is_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX todo_items_couple_id_idx   ON todo_items(couple_id);
CREATE INDEX todo_items_date_idx        ON todo_items(date);
CREATE INDEX todo_items_couple_date_idx ON todo_items(couple_id, date);

CREATE TRIGGER todo_items_updated_at
  BEFORE UPDATE ON todo_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS 활성화 ───────────────────────────────────────────────

ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE todo_items   ENABLE ROW LEVEL SECURITY;

-- ── RLS 정책 ────────────────────────────────────────────────

-- profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM couples
    WHERE (user1_id = auth.uid() AND user2_id = id)
       OR (user2_id = auth.uid() AND user1_id = id)
  )
);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- couples
CREATE POLICY "couples_select" ON couples FOR SELECT USING (
  auth.uid() = user1_id OR auth.uid() = user2_id
);
CREATE POLICY "couples_insert" ON couples FOR INSERT WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- invite_codes: 자신의 코드만 조회/생성 (사용은 SECURITY DEFINER 함수로)
CREATE POLICY "invite_codes_select" ON invite_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "invite_codes_insert" ON invite_codes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- custom_groups: 커플 멤버만 접근
CREATE POLICY "custom_groups_select" ON custom_groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM couples WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);
CREATE POLICY "custom_groups_insert" ON custom_groups FOR INSERT WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1 FROM couples WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);
CREATE POLICY "custom_groups_delete" ON custom_groups FOR DELETE USING (auth.uid() = created_by);

-- todo_items: 커플 멤버 모두 CRUD
CREATE POLICY "todo_items_select" ON todo_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM couples WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);
CREATE POLICY "todo_items_insert" ON todo_items FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM couples WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);
CREATE POLICY "todo_items_update" ON todo_items FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM couples WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);
CREATE POLICY "todo_items_delete" ON todo_items FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM couples WHERE id = couple_id
      AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

-- ── 애플리케이션 함수 ────────────────────────────────────────

-- 회원가입 시 profile 자동 생성
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 초대 코드 생성 (8자리, O/0 제외)
CREATE OR REPLACE FUNCTION create_invite_code()
RETURNS JSON AS $$
DECLARE
  chars    TEXT    := 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789';
  v_code   TEXT    := '';
  attempts INTEGER := 0;
  i        INTEGER;
BEGIN
  -- 기존 만료/사용된 코드 정리
  DELETE FROM invite_codes
  WHERE user_id = auth.uid()
    AND (used_at IS NOT NULL OR expires_at < NOW());

  -- 유니크 코드 생성
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 초대 코드 사용 (커플 연결)
CREATE OR REPLACE FUNCTION use_invite_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite   RECORD;
  v_couple_id UUID;
BEGIN
  -- 유효한 코드 조회 (자신의 코드 제외)
  SELECT * INTO v_invite
  FROM invite_codes
  WHERE code = p_code
    AND used_at IS NULL
    AND expires_at > NOW()
    AND user_id != auth.uid();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  -- 이미 커플 연결된 경우
  IF EXISTS (
    SELECT 1 FROM couples
    WHERE user1_id = auth.uid() OR user2_id = auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_connected');
  END IF;

  -- 커플 생성
  INSERT INTO couples (user1_id, user2_id)
  VALUES (v_invite.user_id, auth.uid())
  RETURNING id INTO v_couple_id;

  -- 코드 사용 처리
  UPDATE invite_codes SET used_at = NOW() WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'couple_id', v_couple_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
