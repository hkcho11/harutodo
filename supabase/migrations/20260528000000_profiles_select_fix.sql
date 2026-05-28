-- ============================================================
-- profiles_select RLS 정책: 컬럼 참조 모호성 수정
-- ============================================================
-- 기존 정책의 서브쿼리 안 `user2_id = id`에서 `id`가 PostgreSQL의
-- 컬럼 해석 규칙에 따라 `profiles.id`(외부 스코프)가 아니라
-- `couples.id`(서브쿼리의 PK)로 바인딩됨. 결과적으로 파트너 검사 절이
-- 항상 false → 본인 프로필만 통과. 모든 참조를 명시적으로 한정한다.

DROP POLICY IF EXISTS "profiles_select" ON profiles;

CREATE POLICY "profiles_select" ON profiles
FOR SELECT
USING (
  auth.uid() = profiles.id
  OR EXISTS (
    SELECT 1
    FROM couples
    WHERE (
      couples.user1_id = auth.uid()
      AND couples.user2_id = profiles.id
    )
    OR (
      couples.user2_id = auth.uid()
      AND couples.user1_id = profiles.id
    )
  )
);
