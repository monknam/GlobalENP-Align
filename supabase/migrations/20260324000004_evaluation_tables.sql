-- ============================================================
-- 04_evaluation_tables.sql
-- 성과평가 모듈: 테이블 생성 + RLS
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================

-- 1. 평가 사이클 (예: 2025 정기 인사평가)
CREATE TABLE IF NOT EXISTS evaluation_cycles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID,    -- organizations(id) 참조 (테이블 존재 시 선택적 사용)
  title         TEXT NOT NULL,
  year          INT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',  -- active | closed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 피평가자 목록 (1행 = 1인 × 1사이클)
CREATE TABLE IF NOT EXISTS employee_evaluations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id            UUID NOT NULL REFERENCES evaluation_cycles(id) ON DELETE CASCADE,
  profile_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name           TEXT NOT NULL,
  department          TEXT,
  job_title           TEXT,
  tenure_years        NUMERIC,
  salary_prev         INT,                        -- 전년도 연봉 (만원)
  score_self          NUMERIC,                    -- 본인 평가 평균
  score_peer          NUMERIC,                    -- 팀장 평가 평균
  score_upper         NUMERIC,                    -- 상위자 평가 평균
  score_prev_year     NUMERIC,                    -- 전년도 최종 평가
  score_ceo_adjusted  NUMERIC,                    -- CEO 조정 점수
  grade_ceo           TEXT,                       -- S / A / B / C / D
  is_confirmed        BOOLEAN NOT NULL DEFAULT FALSE,
  progress_status     TEXT NOT NULL DEFAULT 'pending',  -- pending | reviewing | confirmed
  notes               TEXT,                       -- 업무 성과 기재 (자유 텍스트)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 항목별 평가 점수 상세
CREATE TABLE IF NOT EXISTS evaluation_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_eval_id    UUID NOT NULL REFERENCES employee_evaluations(id) ON DELETE CASCADE,
  category            TEXT NOT NULL,              -- 평가 항목명
  score_self          NUMERIC,
  score_peer          NUMERIC,
  score_upper         NUMERIC,
  score_ceo_adjusted  NUMERIC,
  display_order       INT NOT NULL DEFAULT 0
);

-- 4. CEO 코멘트
CREATE TABLE IF NOT EXISTS evaluation_comments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_eval_id    UUID NOT NULL REFERENCES employee_evaluations(id) ON DELETE CASCADE,
  commenter_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  comment_type        TEXT NOT NULL DEFAULT 'ceo_note',  -- ceo_note | performance_desc
  content             TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS ────────────────────────────────────────────────────

ALTER TABLE evaluation_cycles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_evaluations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scores      ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_comments    ENABLE ROW LEVEL SECURITY;

-- evaluation_cycles: admin 읽기, is_system_admin 쓰기
DROP POLICY IF EXISTS "eval_cycles_read_admin" ON evaluation_cycles;
CREATE POLICY "eval_cycles_read_admin" ON evaluation_cycles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "eval_cycles_write_ceo" ON evaluation_cycles;
CREATE POLICY "eval_cycles_write_ceo" ON evaluation_cycles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_system_admin = TRUE)
  );

-- employee_evaluations: admin 읽기, is_system_admin 쓰기
DROP POLICY IF EXISTS "emp_eval_read_admin" ON employee_evaluations;
CREATE POLICY "emp_eval_read_admin" ON employee_evaluations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "emp_eval_write_ceo" ON employee_evaluations;
CREATE POLICY "emp_eval_write_ceo" ON employee_evaluations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_system_admin = TRUE)
  );

DROP POLICY IF EXISTS "emp_eval_insert_ceo" ON employee_evaluations;
CREATE POLICY "emp_eval_insert_ceo" ON employee_evaluations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_system_admin = TRUE)
  );

-- evaluation_scores: admin 읽기, is_system_admin 쓰기
DROP POLICY IF EXISTS "eval_scores_read_admin" ON evaluation_scores;
CREATE POLICY "eval_scores_read_admin" ON evaluation_scores
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "eval_scores_write_ceo" ON evaluation_scores;
CREATE POLICY "eval_scores_write_ceo" ON evaluation_scores
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_system_admin = TRUE)
  );

-- evaluation_comments: admin 읽기, is_system_admin 쓰기
DROP POLICY IF EXISTS "eval_comments_read_admin" ON evaluation_comments;
CREATE POLICY "eval_comments_read_admin" ON evaluation_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "eval_comments_write_ceo" ON evaluation_comments;
CREATE POLICY "eval_comments_write_ceo" ON evaluation_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND is_system_admin = TRUE)
  );

-- ── 대표이사 계정 설정 ──────────────────────────────────────
-- 아래 쿼리도 함께 실행하여 대표이사 권한 부여

UPDATE profiles
SET is_system_admin = TRUE
WHERE email = 'kwangjaecho@thingspire.com';

-- 확인
SELECT id, full_name, email, role, is_system_admin
FROM profiles
WHERE email = 'kwangjaecho@thingspire.com';
