-- ============================================================
-- 20260409000001_to_management.sql
-- TO/PO Management System Tables
-- ============================================================

-- ① 직원의 개별 담당 업무 테이블 (조직도 상세 보기 시 활용)
CREATE TABLE employee_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  task_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ② 각 조직별 예정/진행중인 TO 포지션 슬롯 관리 (빈자리 표시용)
CREATE TABLE to_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,          -- employees.department 와 매칭
  position_name TEXT NOT NULL,       -- 직무명 (예: 설계 파트장, 시공 관리자 등)
  title TEXT,                        -- 직급 (예: 과장, 대리)
  target_count INTEGER DEFAULT 1,    -- 필요 인원 수
  recruit_status TEXT DEFAULT '-' CHECK (recruit_status IN ('채용중','입사 예정','공석','보류','-')),
  approval_status TEXT DEFAULT '🟡 검토중' CHECK (approval_status IN ('🟡 검토중','🔵 승인완료','🔄 채용중','✅ 완료','❌ 반려','⏸ 보류')),
  target_hire_date DATE,
  required_tasks TEXT[],             -- 이 TO 포지션이 맡게 될 예정 업무 리스트
  is_target BOOLEAN DEFAULT false,
  linked_to_doc_no TEXT,             -- 연관된 TO 요청서 문서 번호
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ③ 현업에서 트리거하는 TO(인력 충원) 상세 요청 폼 (5-step 데이터 보관)
CREATE TABLE to_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no TEXT UNIQUE NOT NULL,       -- 문서번호 예: TO-2026-001
  requested_at DATE NOT NULL DEFAULT CURRENT_DATE,
  department TEXT NOT NULL,          
  requester_name TEXT NOT NULL,
  target_rank TEXT NOT NULL,
  headcount INTEGER NOT NULL DEFAULT 1,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('정규직','계약직','파견')),
  contract_start DATE,
  contract_end DATE,
  reasons TEXT[],                    -- 충원 사유 (복수 선택)
  reason_detail TEXT,
  project_info TEXT,                 -- 연관 프로젝트 정보
  current_team_work JSONB,           -- 요청 당시 팀원들의 현재 업무 현황 스냅샷
  new_work_jd TEXT,                  -- 신규 TO가 수행할 구체적 직무 기술 (JD)
  required_licenses TEXT[],          -- 자격증 요건
  experience_req TEXT,               -- 경력 요건
  preferred_cond TEXT,               -- 우대 조건
  budget_status TEXT CHECK (budget_status IN ('기확보','신규 요청')),
  is_urgent BOOLEAN DEFAULT false,
  desired_hire_date DATE,
  posting_date DATE,
  deadline_date DATE,
  interview_period TEXT,
  interviewer_name TEXT,
  remarks TEXT,
  approval_status TEXT DEFAULT '🟡 검토중' CHECK (approval_status IN ('🟡 검토중','🔵 승인완료','🔄 채용중','✅ 완료','❌ 반려','⏸ 보류')),
  hr_assignee TEXT,                  -- 경영지원부 배정 담당자
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ④ TO 요청에 대한 상태 변경/결재 이력
CREATE TABLE to_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES to_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT,
  changed_by UUID REFERENCES auth.users(id),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes 
CREATE INDEX idx_employee_tasks_emp ON employee_tasks(employee_id);
CREATE INDEX idx_to_positions_dept ON to_positions(department);
CREATE INDEX idx_to_requests_dept ON to_requests(department);
CREATE INDEX idx_to_requests_status ON to_requests(approval_status);

-- RLS 정책 설정 (우선 인증된 모든 사용자가 접근 가능하도록 열어둡니다)
ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_tasks_authenticated" ON employee_tasks FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "to_positions_authenticated" ON to_positions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "to_requests_authenticated" ON to_requests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "to_request_logs_authenticated" ON to_request_logs FOR ALL USING (auth.role() = 'authenticated');

-- 테스트(guestMode 로컬) 환경을 위해 로컬에서는 일단 모든 익명접근도 허용(선택적)
CREATE POLICY "employee_tasks_anon" ON employee_tasks FOR ALL USING (true);
CREATE POLICY "to_positions_anon" ON to_positions FOR ALL USING (true);
CREATE POLICY "to_requests_anon" ON to_requests FOR ALL USING (true);
CREATE POLICY "to_request_logs_anon" ON to_request_logs FOR ALL USING (true);
