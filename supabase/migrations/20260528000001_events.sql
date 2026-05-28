-- ============================================================
-- events: 캘린더 일정 (todo와 별개 모델)
-- ============================================================
-- 할 일(todo_items)은 완료 여부가 핵심, 일정(events)은 시간이 핵심.
-- 둘을 한 테이블에 섞지 않고 분리한다.

CREATE TABLE events (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  couple_id   UUID         NOT NULL REFERENCES couples(id) ON DELETE CASCADE,
  created_by  UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignee_id UUID         REFERENCES profiles(id) ON DELETE SET NULL, -- null = 함께
  title       TEXT         NOT NULL,
  date        DATE         NOT NULL,
  start_time  TIME,        -- null이고 end_time도 null이면 종일 일정
  end_time    TIME,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT events_title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT events_title_length    CHECK (length(title) <= 200),
  CONSTRAINT events_time_order      CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

CREATE INDEX events_couple_date_idx ON events(couple_id, date);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select" ON events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM couples
    WHERE couples.id = events.couple_id
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "events_insert" ON events
FOR INSERT
WITH CHECK (
  auth.uid() = events.created_by
  AND EXISTS (
    SELECT 1 FROM couples
    WHERE couples.id = events.couple_id
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "events_update" ON events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM couples
    WHERE couples.id = events.couple_id
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

CREATE POLICY "events_delete" ON events
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM couples
    WHERE couples.id = events.couple_id
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);

-- ── Realtime publication (#6에서 사용) ──────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE events;
