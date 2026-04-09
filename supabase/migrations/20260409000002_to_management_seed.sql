-- ============================================================
-- 20260409000002_to_management_seed.sql
-- TO/PO Dashboard 조회를 위한 초기 더미/시드(Seed) 데이터
-- ============================================================

-- 1. employee_tasks 초기 예시 (기존 평가자 일부에게 임의 매핑)
INSERT INTO employee_tasks (employee_id, task_name, description)
SELECT id, '소방설비설계 1팀 리드', '주요 설계 프로젝트 리딩 및 리뷰'
FROM employees WHERE employee_no = '160301'; -- 이현진(연구설계부)

INSERT INTO employee_tasks (employee_id, task_name, description)
SELECT id, '방화댐퍼 성능 시험 검증', '연구소 내 방화댐퍼 규격 시험 총괄'
FROM employees WHERE employee_no = '220601'; -- 김주현(연구개발부)

INSERT INTO employee_tasks (employee_id, task_name, description)
SELECT id, '현장 커미셔닝 담당 (A구역)', '건설 현장 소방/제연 설비 테스트'
FROM employees WHERE employee_no = '240101'; -- 이동준(커미셔닝)

-- 2. to_positions (공석/채용중 TO 빈자리 예시)
INSERT INTO to_positions 
  (department, position_name, title, target_count, recruit_status, approval_status, target_hire_date, required_tasks, is_target, notes)
VALUES
  ('연구설계부', '소방 도면 설계원', '사원', 1, '채용중', '🔵 승인완료', '2026-05-01', ARRAY['AutoCAD 소방 도면 설계', '인허가 서류 보조'], false, '최근 인력 이탈에 따른 대체 인력'),
  ('개발생산부', '생산 관리 스태프', '주임', 1, '공석', '🟡 검토중', '2026-06-01', ARRAY['생산 라인 일정 조율', '자재 재고 파악'], false, '상반기 발주 물량 증가'),
  ('커미셔닝/현장관리부', '현장 PM (시니어)', '차장', 1, '보류', '⏸ 보류', '2026-07-01', ARRAY['대형 건설 현장 감리 및 커미셔닝 책임', '본사-현장 간 커뮤니케이션'], true, '고급 인력 타겟 채용 - 헤드헌터 활용 검토중');
