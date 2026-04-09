-- ============================================================
-- profiles RLS 단순화
-- 재귀 정책 제거, 인증 사용자 전체 허용으로 교체
-- ============================================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "profiles_self_read"  ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all"  ON profiles;

-- 개발 기간: 인증된 사용자는 모든 프로필 읽기 가능
CREATE POLICY "profiles_read_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 본인 프로필 수정 가능
CREATE POLICY "profiles_update_self"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- service_role 로 INSERT 허용 (초기 동기화용)
CREATE POLICY "profiles_insert_service"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);
