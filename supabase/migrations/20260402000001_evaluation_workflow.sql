-- ============================================================
-- 01_evaluation_workflow.sql
-- GlobalENP 인사평가 워크플로우 스키마
-- Supabase SQL Editor 또는 supabase db push 로 실행
-- ============================================================

-- ── 기존 Thingspire 평가 테이블 제거 ──────────────────────────
DROP TABLE IF EXISTS evaluation_comments   CASCADE;
DROP TABLE IF EXISTS evaluation_scores     CASCADE;
DROP TABLE IF EXISTS employee_evaluations  CASCADE;
DROP TABLE IF EXISTS evaluation_cycles     CASCADE;

-- ── 1. 직원 테이블 (Auth 독립 — 이메일 확보 후 profile_id 연결) ──
CREATE TABLE IF NOT EXISTS employees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_no         TEXT UNIQUE NOT NULL,
  full_name           TEXT NOT NULL,
  gender              TEXT CHECK (gender IN ('남', '여')),
  department          TEXT,
  job_title           TEXT,
  job_role            TEXT,
  hire_date           DATE,
  birth_date          DATE,
  phone               TEXT,
  job_group           TEXT NOT NULL
    CHECK (job_group IN ('manufacturing','field','technical','admin','executive')),
  is_department_head  BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  supervisor_id       UUID REFERENCES employees(id) ON DELETE SET NULL,
  profile_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. 평가 사이클 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eval_cycles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title               TEXT NOT NULL,
  year                INT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','closed')),
  self_eval_start     DATE,
  self_eval_end       DATE,
  first_eval_start    DATE,
  first_eval_end      DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. 평가 항목 정의 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eval_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_group       TEXT NOT NULL
    CHECK (job_group IN ('common','manufacturing','field','technical','admin')),
  item_key        TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  item_description TEXT,
  item_type       TEXT NOT NULL CHECK (item_type IN ('attitude','performance')),
  display_order   INT NOT NULL DEFAULT 0,
  has_evidence    BOOLEAN DEFAULT FALSE,
  level_5_desc    TEXT,
  level_4_desc    TEXT,
  level_3_desc    TEXT,
  level_2_desc    TEXT,
  level_1_desc    TEXT,
  UNIQUE(job_group, item_key)
);

-- ── 4. 직원별 평가 인스턴스 (직원 × 사이클) ───────────────────
CREATE TABLE IF NOT EXISTS eval_instances (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id              UUID NOT NULL REFERENCES eval_cycles(id) ON DELETE CASCADE,
  employee_id           UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  workflow_status       TEXT NOT NULL DEFAULT 'pending_self'
    CHECK (workflow_status IN (
      'pending_self','pending_first','pending_committee',
      'pending_second','confirmed'
    )),
  second_eval_required  BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, employee_id)
);

-- ── 5. 평가자 배정 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eval_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id        UUID NOT NULL REFERENCES eval_cycles(id) ON DELETE CASCADE,
  evaluatee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_role  TEXT NOT NULL CHECK (evaluator_role IN ('first','second')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, evaluatee_id, evaluator_role)
);

-- ── 6. 단계별 평가 제출 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS eval_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id     UUID NOT NULL REFERENCES eval_instances(id) ON DELETE CASCADE,
  evaluator_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  step            TEXT NOT NULL
    CHECK (step IN ('self','first','second','committee')),
  status          TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted')),
  overall_comment TEXT,
  submitted_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(instance_id, step)
);

-- ── 7. 항목별 점수 ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eval_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id   UUID NOT NULL REFERENCES eval_submissions(id) ON DELETE CASCADE,
  item_id         UUID NOT NULL REFERENCES eval_items(id),
  score           INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  evidence_text   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, item_id)
);

-- ── 8. 커미티 최종 결과 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS eval_final_results (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id         UUID NOT NULL UNIQUE REFERENCES eval_instances(id) ON DELETE CASCADE,
  score_self_avg      NUMERIC(4,2),
  score_first_avg     NUMERIC(4,2),
  score_second_avg    NUMERIC(4,2),
  final_score         NUMERIC(4,2),
  final_grade         TEXT CHECK (final_grade IN ('S','A','B','C','D')),
  committee_comment   TEXT,
  confirmed_by        UUID REFERENCES employees(id),
  confirmed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS (개발 기간: 인증된 사용자 전체 허용) ─────────────────────
ALTER TABLE employees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_cycles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_instances      ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE eval_final_results  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all" ON employees          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON eval_cycles        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON eval_items         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON eval_instances     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON eval_assignments   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON eval_submissions   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON eval_scores        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all" ON eval_final_results FOR ALL USING (true) WITH CHECK (true);
