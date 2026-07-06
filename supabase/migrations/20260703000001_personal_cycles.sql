-- ============================================================
-- 내 주기(personal_cycles) 테이블 추가
-- ============================================================

-- profiles 테이블에 기능 활성화 플래그 추가
ALTER TABLE profiles
  ADD COLUMN cycle_enabled BOOLEAN NOT NULL DEFAULT false;

-- personal_cycles 테이블 생성
CREATE TABLE personal_cycles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id     UUID        NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date    DATE        NOT NULL,
  end_date      DATE,
  symptom_tags  TEXT[]      NOT NULL DEFAULT '{}',
  note          TEXT,
  share_level   TEXT        NOT NULL DEFAULT 'private'
                            CHECK (share_level IN ('private','period_only','period_and_condition')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX personal_cycles_couple_id_idx ON personal_cycles(couple_id);
CREATE INDEX personal_cycles_user_id_idx   ON personal_cycles(user_id);
CREATE INDEX personal_cycles_start_date_idx ON personal_cycles(start_date);

-- Realtime DELETE 이벤트에서 old row 전체 참조
ALTER TABLE personal_cycles REPLICA IDENTITY FULL;

-- updated_at 자동 갱신
CREATE TRIGGER personal_cycles_updated_at
  BEFORE UPDATE ON personal_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS 활성화
ALTER TABLE personal_cycles ENABLE ROW LEVEL SECURITY;

-- 본인: 전체 CRUD
CREATE POLICY "personal_cycles_owner_all"
  ON personal_cycles
  FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM couples
      WHERE id = couple_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- 파트너: share_level이 private가 아닌 행만 SELECT
CREATE POLICY "personal_cycles_partner_select"
  ON personal_cycles
  FOR SELECT
  USING (
    user_id != auth.uid()
    AND couple_id IN (
      SELECT id FROM couples
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
    AND share_level != 'private'
  );

-- personal_cycles를 Realtime 게시물에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE personal_cycles;
