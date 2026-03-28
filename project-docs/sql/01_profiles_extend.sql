-- ============================================================
-- SQL 01: profiles 테이블 확장 + auth.users 데이터 동기화
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 1. profiles 테이블에 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_group       VARCHAR(30),     -- 예: 'dev', 'non_dev', 'management', 'executive'
  ADD COLUMN IF NOT EXISTS tenure_group    VARCHAR(20),     -- 예: '1년 미만', '1~3년', '3~5년', '5년 이상'
  ADD COLUMN IF NOT EXISTS department_name VARCHAR(100),    -- 소속 부서명 (비정규화 캐시)
  ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active',  -- active | inactive | leave
  ADD COLUMN IF NOT EXISTS employee_group  VARCHAR(20),     -- dev | non_dev | management
  ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT FALSE;  -- 대표이사 권한

-- 2. auth.users → profiles 동기화 (없는 계정만 INSERT)
--    이미 존재하면 SKIP
INSERT INTO profiles (id, full_name, email, created_at)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', u.email),
  u.email,
  u.created_at
FROM auth.users u
ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email     = COALESCE(EXCLUDED.email, profiles.email);

-- 결과 확인
SELECT id, full_name, email, job_group, tenure_group, department_id
FROM profiles
ORDER BY full_name;
