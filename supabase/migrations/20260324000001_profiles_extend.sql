-- ============================================================
-- SQL 01: profiles 테이블 생성 + 확장 + auth.users 데이터 동기화
-- ============================================================

-- 0. profiles 테이블 최초 생성 (없을 경우)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'leader', 'member')),
  department_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_self_read'
  ) THEN
    CREATE POLICY "profiles_self_read" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_admin_all'
  ) THEN
    CREATE POLICY "profiles_admin_all" ON profiles FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    );
  END IF;
END $$;

-- 1. profiles 테이블에 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS job_group       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tenure_group    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS department_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS employment_status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS employee_group  VARCHAR(20),
  ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. auth.users → profiles 동기화 (없는 계정만 INSERT)
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
