-- ============================================================
-- couples DELETE RLS 정책 추가
-- ============================================================
-- 커플 연결 해제: 커플 멤버 중 한 명이 삭제 가능.
-- 삭제 시 ON DELETE CASCADE로 todo_items, events, custom_groups 전부 삭제됨.

CREATE POLICY "couples_delete" ON couples
FOR DELETE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);
