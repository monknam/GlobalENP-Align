-- ============================================================
-- SQL 02: action_items 테이블 생성 + RLS
-- Supabase SQL Editor에서 실행
-- ============================================================

CREATE TABLE IF NOT EXISTS action_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_cycle_id  UUID REFERENCES survey_cycles(id) ON DELETE SET NULL,
  category         VARCHAR(30) NOT NULL
                     CHECK (category IN ('company_wide', 'team_leader', 'management', 'executive')),
  title            TEXT NOT NULL,
  description      TEXT,
  owner            VARCHAR(200),
  priority         VARCHAR(10) NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('high', 'medium', 'low')),
  status           VARCHAR(20) NOT NULL DEFAULT 'todo'
                     CHECK (status IN ('todo', 'in_progress', 'done')),
  due_date         DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

-- admin/leader 만 읽기 가능
CREATE POLICY "action_items_read"
  ON action_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'leader')
    )
  );

-- admin 만 쓰기 가능
CREATE POLICY "action_items_write"
  ON action_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
