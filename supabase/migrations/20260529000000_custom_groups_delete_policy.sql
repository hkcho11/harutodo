-- ============================================================
-- custom_groups 삭제 권한 정책 변경
-- ============================================================
-- 커스텀 그룹은 커플 공유 자원이므로 커플 멤버 누구나 삭제 가능하도록 변경.
-- 기존: auth.uid() = created_by (생성자만)
-- 변경: 커플 멤버 모두 (조회/생성 정책과 일관)

DROP POLICY IF EXISTS "custom_groups_delete" ON custom_groups;

CREATE POLICY "custom_groups_delete" ON custom_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM couples
    WHERE couples.id = custom_groups.couple_id
      AND (couples.user1_id = auth.uid() OR couples.user2_id = auth.uid())
  )
);
