-- ================================================================
-- ㈜글로벌이앤피 간이 성과 평가 시스템 — DB 마이그레이션 + 시드
-- Supabase SQL Editor에서 순서대로 실행하세요.
-- ================================================================

-- ── 1. 테이블 생성 ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS evaluation_seasons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year       INT  NOT NULL,
  name       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'closed'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id   UUID REFERENCES evaluation_seasons(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  job_group   TEXT,            -- NULL = 전 직군 공통
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grade_anchors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  criteria_id  UUID REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
  grade        TEXT NOT NULL,  -- 'S' | 'A' | 'B' | 'C' | 'D'
  anchor_text  TEXT NOT NULL,
  salary_note  TEXT
);

CREATE TABLE IF NOT EXISTS simple_evaluations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     UUID REFERENCES evaluation_seasons(id) ON DELETE CASCADE,
  evaluatee_id  UUID REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id  UUID NOT NULL,   -- auth.users.id
  status        TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'submitted'
  submitted_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(season_id, evaluatee_id)
);

CREATE TABLE IF NOT EXISTS simple_evaluation_scores (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  UUID REFERENCES simple_evaluations(id) ON DELETE CASCADE,
  criteria_id    UUID REFERENCES evaluation_criteria(id) ON DELETE CASCADE,
  selected_grade TEXT,  -- 'S' | 'A' | 'B' | 'C' | 'D'
  UNIQUE(evaluation_id, criteria_id)
);

CREATE TABLE IF NOT EXISTS simple_evaluation_texts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id  UUID REFERENCES simple_evaluations(id) ON DELETE CASCADE,
  item_key       TEXT NOT NULL,  -- 'strength' | 'improvement'
  content        TEXT,
  UNIQUE(evaluation_id, item_key)
);

-- ── 2. RLS 정책 ─────────────────────────────────────────────────
-- (개발 단계: 전체 허용. 운영 전 역할 기반 정책으로 교체할 것)

ALTER TABLE evaluation_seasons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_criteria      ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_anchors            ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_evaluations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE simple_evaluation_texts  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_seasons"        ON evaluation_seasons       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_criteria"       ON evaluation_criteria      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_anchors"        ON grade_anchors            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_evals"          ON simple_evaluations       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_scores"         ON simple_evaluation_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_all_texts"          ON simple_evaluation_texts  FOR ALL USING (true) WITH CHECK (true);

-- ── 3. 시드: 2025년 평가 시즌 + 전체 기준 항목 + 행동 앵커 ────────

DO $$
DECLARE
  v_season_id UUID;

  -- 공통 기준
  c_work_complete  UUID;
  c_org_contrib    UUID;
  c_growth         UUID;

  -- 설계직
  d_design_qual    UUID;
  d_order_contrib  UUID;
  d_deadline       UUID;

  -- 연구개발직
  r_tech_dev       UUID;
  r_patent         UUID;
  r_self_verify    UUID;

  -- 커미셔닝직
  k_site_done      UUID;
  k_quality        UUID;
  k_safety         UUID;

  -- 생산직
  p_target         UUID;
  p_qual_mgmt      UUID;
  p_skill          UUID;

  -- 사무직
  s_accuracy       UUID;
  s_response       UUID;
  s_autonomous     UUID;

BEGIN

-- 2025 시즌 생성
INSERT INTO evaluation_seasons (year, name, status)
VALUES (2025, '2025년 간이 성과평가', 'open')
RETURNING id INTO v_season_id;

-- ── 공통 항목 ────────────────────────────────────────────────────

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'common_1', NULL, '업무 완수도', '맡은 업무를 기한 내, 기대 수준 이상의 품질로 완료하는가', 1)
RETURNING id INTO c_work_complete;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (c_work_complete, 'S', '기한 전 완료가 일상적. 품질 이슈 없음. 다른 팀원 업무까지 자발적으로 지원', '최우선 인상 검토'),
  (c_work_complete, 'A', '기한 내 완료. 품질이 안정적으로 기대 이상. 문제 발생 시 선제적으로 보고', '인상 적극 검토'),
  (c_work_complete, 'B', '기한 내 완료. 품질은 무난. 별도 독촉 없이 스스로 마무리', '기본 인상 검토'),
  (c_work_complete, 'C', '기한 지연이 반복되거나 품질 재작업이 2회 이상 발생', '인상 보류 또는 최소'),
  (c_work_complete, 'D', '기한 내 완료가 어렵거나 리더 개입 없이 업무가 진행되지 않는 상황', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'common_2', NULL, '조직 기여도', '팀 내 협업, 소통, 타부서 협조에서 긍정적 영향을 주는가', 2)
RETURNING id INTO c_org_contrib;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (c_org_contrib, 'S', '팀 분위기를 실질적으로 주도. 갈등을 중재하거나 팀 역량을 끌어올리는 역할', '최우선 인상 검토'),
  (c_org_contrib, 'A', '소통이 원활하고 협업 시 신뢰를 받음. 주변에서 먼저 찾는 사람', '인상 적극 검토'),
  (c_org_contrib, 'B', '기본적인 협업은 잘 됨. 특별히 마찰 없이 팀에 동화됨', '기본 인상 검토'),
  (c_org_contrib, 'C', '소통 부재나 협업 거부 상황이 간헐적으로 발생. 팀에 불편을 주는 경우 있음', '인상 보류 또는 최소'),
  (c_org_contrib, 'D', '갈등을 유발하거나 팀워크를 저해하는 행동이 명확히 관찰됨', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'common_3', NULL, '성장 가능성', '올해 대비 내년의 기대치. 스스로 배우고 역량을 키우려는 의지', 3)
RETURNING id INTO c_growth;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (c_growth, 'S', '지속적으로 새 역량을 습득하고 팀에 전파. 내년 한 단계 도약이 기대됨', '최우선 인상 검토'),
  (c_growth, 'A', '자기 주도 학습이 관찰됨. 피드백을 빠르게 반영하고 개선 속도가 빠름', '인상 적극 검토'),
  (c_growth, 'B', '성장 의지는 있으나 실행 속도가 느림. 현재 수준 유지는 안정적', '기본 인상 검토'),
  (c_growth, 'C', '피드백을 반영하지 않거나 성장을 위한 노력이 잘 보이지 않음', '인상 보류 또는 최소'),
  (c_growth, 'D', '현 수준 유지도 어렵거나 역량이 후퇴하고 있는 것이 관찰됨', '인상 없음 / 별도 면담');

-- ── 설계직 ─────────────────────────────────────────────────────

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'design_4', '설계직', '설계 품질', '도면 오류 빈도, 재작업 발생 건수, 검토 지적 수준', 4)
RETURNING id INTO d_design_qual;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (d_design_qual, 'S', '연간 재작업 0건에 가까움. 검토 단계 지적이 거의 없음. 다른 설계자 검수 역할도 함', '최우선 인상 검토'),
  (d_design_qual, 'A', '재작업이 드물고 발생해도 즉시 수정 완료. 품질 기준을 일관성 있게 유지', '인상 적극 검토'),
  (d_design_qual, 'B', '통상 수준의 오류 발생. 재작업 요청 시 수용적으로 처리', '기본 인상 검토'),
  (d_design_qual, 'C', '같은 종류의 오류가 반복됨. 재작업 요청이 3회 이상 발생', '인상 보류 또는 최소'),
  (d_design_qual, 'D', '오류가 빈번하여 다른 팀원 업무에 영향. 납기 지연의 주된 원인이 됨', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'design_5', '설계직', '수주 기여도', '영업 동행, 담당자 접점 활동, 설계 기술로 수주에 기여한 정도', 5)
RETURNING id INTO d_order_contrib;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (d_order_contrib, 'S', '직접 영업 활동에 참여해 수주에 결정적 역할. 고객이 이 사람을 지명하는 수준', '최우선 인상 검토'),
  (d_order_contrib, 'A', '영업 동행 시 기술 신뢰를 높임. 제안서·설명 등에서 수주 기여가 명확', '인상 적극 검토'),
  (d_order_contrib, 'B', '요청 시 영업 지원은 함. 수주에 직접 기여했다고 보기는 어려움', '기본 인상 검토'),
  (d_order_contrib, 'C', '영업 동행을 피하거나 고객 접점 활동에 소극적', '인상 보류 또는 최소'),
  (d_order_contrib, 'D', '고객 응대에서 부정적 인상을 남기거나 수주에 방해가 되는 상황 발생', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'design_6', '설계직', '납기 준수율', '설계 납기 준수 여부. 일정 지연 시 사전 보고 여부', 6)
RETURNING id INTO d_deadline;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (d_deadline, 'S', '납기를 항상 지킴. 일정 변동 가능성을 사전에 파악하고 선제적으로 공유', '최우선 인상 검토'),
  (d_deadline, 'A', '납기를 대부분 준수. 불가피한 지연 시 즉시 보고하고 대안을 가져옴', '인상 적극 검토'),
  (d_deadline, 'B', '큰 지연 없이 납기 유지. 간헐적 지연은 있으나 팀에 영향은 제한적', '기본 인상 검토'),
  (d_deadline, 'C', '납기 지연이 반복됨. 사전 보고 없이 지연이 확인되는 경우 있음', '인상 보류 또는 최소'),
  (d_deadline, 'D', '납기 미준수가 팀 전체 일정에 영향. 후속 처리도 느림', '인상 없음 / 별도 면담');

-- ── 연구개발직 ──────────────────────────────────────────────────

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'rd_4', '연구개발직', '기술 개발 기여도', '신제품, 공정 개선, 기술 아이디어 도출에 기여한 정도', 4)
RETURNING id INTO r_tech_dev;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (r_tech_dev, 'S', '연간 1건 이상의 실질적 신기술·신제품 아이디어를 구체화하거나 완성', '최우선 인상 검토'),
  (r_tech_dev, 'A', '아이디어를 제안하고 실험·검증까지 직접 진행. 채택 여부와 무관하게 완성도 있음', '인상 적극 검토'),
  (r_tech_dev, 'B', '지시된 개발 과제를 수행. 자발적 제안은 적지만 주어진 역할에 충실', '기본 인상 검토'),
  (r_tech_dev, 'C', '개발 과제 진행이 느리거나 결과물 완성도가 기대에 미치지 못함', '인상 보류 또는 최소'),
  (r_tech_dev, 'D', '개발 과제가 반복적으로 중단되거나 완료되지 않음', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'rd_5', '연구개발직', '특허·문서화', '특허 출원 기여, 기술 문서 작성 수준, 지식 공유 활동', 5)
RETURNING id INTO r_patent;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (r_patent, 'S', '특허 출원에 직접 기여. 기술 문서를 체계적으로 작성하고 팀 내 공유', '최우선 인상 검토'),
  (r_patent, 'A', '기술 문서를 꾸준히 작성. 특허 출원 지원 또는 관련 활동에 참여', '인상 적극 검토'),
  (r_patent, 'B', '요청 시 문서화 수행. 품질은 보통 수준', '기본 인상 검토'),
  (r_patent, 'C', '문서화가 누락되거나 기록이 불충분. 재요청이 필요한 경우 반복', '인상 보류 또는 최소'),
  (r_patent, 'D', '문서화 없이 개발이 진행되어 추후 재현·인수인계가 어려운 상태', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'rd_6', '연구개발직', '자기 주도 검증', '실험·시험 계획을 스스로 수립하고 완료하는 수준', 6)
RETURNING id INTO r_self_verify;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (r_self_verify, 'S', '시험 계획 수립부터 결과 분석까지 전 과정을 독립적으로 완수. 예상 외 문제도 스스로 해결', '최우선 인상 검토'),
  (r_self_verify, 'A', '계획 수립 후 독립 수행 가능. 예외 상황에서 적절한 시점에 보고하고 협의', '인상 적극 검토'),
  (r_self_verify, 'B', '계획 수립 시 지원이 필요. 수행은 안정적으로 완료', '기본 인상 검토'),
  (r_self_verify, 'C', '검증 계획 없이 진행하거나 중간에 자주 막혀 리더 개입이 필요', '인상 보류 또는 최소'),
  (r_self_verify, 'D', '독립적 검증 수행이 어렵고 결과에 대한 신뢰도가 낮음', '인상 없음 / 별도 면담');

-- ── 커미셔닝직 ─────────────────────────────────────────────────

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'comm_4', '커미셔닝직', '현장 완료율', '시운전·TAB 등 현장 과제의 완료 건수, 납기 준수 여부', 4)
RETURNING id INTO k_site_done;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (k_site_done, 'S', '담당 현장을 모두 기한 내 완료. 다른 현장 지원까지 자발적으로 수행', '최우선 인상 검토'),
  (k_site_done, 'A', '담당 현장 완료율 높음. 일정 변동 시 사전 보고하고 대안 제시', '인상 적극 검토'),
  (k_site_done, 'B', '담당 현장을 큰 문제 없이 완료. 간헐적 지연 있으나 범위 내', '기본 인상 검토'),
  (k_site_done, 'C', '지연이 반복되거나 완료 후 재방문이 필요한 상황 발생', '인상 보류 또는 최소'),
  (k_site_done, 'D', '현장 완료율이 낮아 팀 전체 일정에 영향. 클레임으로 이어지는 경우 있음', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'comm_5', '커미셔닝직', '품질 (재방문·클레임)', '시공·검증 결과의 완성도. 재방문·고객 클레임 발생 빈도', 5)
RETURNING id INTO k_quality;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (k_quality, 'S', '연간 재방문·클레임 0건. 고객 인계 시 별도 지적 없이 완료', '최우선 인상 검토'),
  (k_quality, 'A', '재방문이 드묾. 발생 시 즉각 처리하고 근본 원인 공유', '인상 적극 검토'),
  (k_quality, 'B', '통상 수준의 재방문 발생. 처리 과정에서 특별한 문제 없음', '기본 인상 검토'),
  (k_quality, 'C', '동일 원인의 클레임이 반복됨. 처리가 느리거나 고객 불만 접수됨', '인상 보류 또는 최소'),
  (k_quality, 'D', '클레임이 빈번하여 회사 신뢰에 영향. 현장 재배치 검토 필요 수준', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'comm_6', '커미셔닝직', '안전 준수', '현장 안전 규정 이행, 위험 요소 사전 인지 및 보고', 6)
RETURNING id INTO k_safety;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (k_safety, 'S', '안전 규정을 완벽히 준수하고 팀 내 안전 의식을 높이는 역할도 수행', '최우선 인상 검토'),
  (k_safety, 'A', '안전 규정을 철저히 지킴. 위험 요소를 사전에 파악하고 보고', '인상 적극 검토'),
  (k_safety, 'B', '기본 안전 규정 준수. 지적 사항 없이 현장 진행', '기본 인상 검토'),
  (k_safety, 'C', '안전 규정을 간헐적으로 무시하거나 위험 요소 보고가 늦는 경우 있음', '인상 보류 또는 최소'),
  (k_safety, 'D', '안전 규정 위반이 명확하거나 팀 전체 현장 안전에 위협이 되는 행동', '인상 없음 / 별도 면담');

-- ── 생산직 ──────────────────────────────────────────────────────

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'prod_4', '생산직', '생산 목표 달성', '생산량·납기 목표 대비 실제 달성률', 4)
RETURNING id INTO p_target;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (p_target, 'S', '목표를 일관성 있게 초과 달성. 긴급 물량 발생 시에도 자발적으로 대응', '최우선 인상 검토'),
  (p_target, 'A', '목표를 안정적으로 달성. 문제 발생 시 대안을 가져와 해결', '인상 적극 검토'),
  (p_target, 'B', '목표 달성은 하되 여유 없이 간신히 맞추는 경우가 많음', '기본 인상 검토'),
  (p_target, 'C', '목표 미달이 반복됨. 원인 파악이나 개선 시도가 부족', '인상 보류 또는 최소'),
  (p_target, 'D', '목표 달성이 어렵고 타 공정이나 납기에 직접 영향을 줌', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'prod_5', '생산직', '품질 관리', '불량률, 검수 통과율, 품질 이슈 발생 시 대응 수준', 5)
RETURNING id INTO p_qual_mgmt;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (p_qual_mgmt, 'S', '불량이 거의 없고 스스로 품질 기준을 끌어올리는 제안을 함', '최우선 인상 검토'),
  (p_qual_mgmt, 'A', '불량률이 낮음. 품질 이슈 발생 시 즉각 원인을 찾고 재발 방지', '인상 적극 검토'),
  (p_qual_mgmt, 'B', '통상 수준의 불량 발생. 검수 지적 시 수용적으로 수정', '기본 인상 검토'),
  (p_qual_mgmt, 'C', '같은 불량이 반복됨. 품질 기준에 대한 인식이 낮음', '인상 보류 또는 최소'),
  (p_qual_mgmt, 'D', '불량이 빈번하여 후공정에 영향을 주거나 클레임 원인이 됨', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'prod_6', '생산직', '직위 대비 숙련도', '현재 직위 수준에 맞는 기술 숙련도를 갖추고 있는가', 6)
RETURNING id INTO p_skill;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (p_skill, 'S', '현 직위를 명확히 초과하는 숙련도. 상위 직위 역할도 수행 가능', '최우선 인상 검토'),
  (p_skill, 'A', '현 직위 수준에 충분히 부합. 장비·공정을 능숙하게 다룸', '인상 적극 검토'),
  (p_skill, 'B', '기본 업무는 수행 가능. 일부 공정에서 지도가 필요한 경우 있음', '기본 인상 검토'),
  (p_skill, 'C', '현 직위 수준에 미치지 못하는 기술 격차가 관찰됨', '인상 보류 또는 최소'),
  (p_skill, 'D', '기본 공정 수행도 어렵거나 안전 사고 우려가 있는 숙련도 수준', '인상 없음 / 별도 면담');

-- ── 사무직 ──────────────────────────────────────────────────────

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'office_4', '사무직', '업무 정확도', '서류·데이터 오류 빈도, 재처리 발생 건수', 4)
RETURNING id INTO s_accuracy;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (s_accuracy, 'S', '오류가 거의 없고 다른 직원의 실수를 사전에 발견해 주는 역할도 함', '최우선 인상 검토'),
  (s_accuracy, 'A', '오류 빈도 매우 낮음. 오류 발생 시 즉각 수정하고 재발 방지', '인상 적극 검토'),
  (s_accuracy, 'B', '통상 수준의 오류 발생. 재처리 요청 시 수용적으로 처리', '기본 인상 검토'),
  (s_accuracy, 'C', '같은 종류의 오류가 반복됨. 확인 절차 없이 처리하는 경향', '인상 보류 또는 최소'),
  (s_accuracy, 'D', '오류가 빈번하여 다른 부서 업무나 고객 응대에 직접 영향을 줌', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'office_5', '사무직', '응대 품질', '고객·내부 문의 응대의 신속성과 완성도', 5)
RETURNING id INTO s_response;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (s_response, 'S', '응대가 신속·정확하고 상대방이 추가 확인 없이 신뢰함. 어려운 민원도 능숙하게 처리', '최우선 인상 검토'),
  (s_response, 'A', '응대 속도와 품질 모두 안정적. 복잡한 요청도 스스로 처리 완료', '인상 적극 검토'),
  (s_response, 'B', '기본 응대는 무난. 복잡한 케이스에서 간헐적으로 지원 필요', '기본 인상 검토'),
  (s_response, 'C', '응대가 느리거나 불완전한 경우 반복. 상대방이 재문의하는 상황 발생', '인상 보류 또는 최소'),
  (s_response, 'D', '응대 실수로 민원이나 클레임이 발생. 고객 관계에 부정적 영향', '인상 없음 / 별도 면담');

INSERT INTO evaluation_criteria (season_id, code, job_group, name, description, sort_order)
VALUES (v_season_id, 'office_6', '사무직', '자율 처리 수준', '지시 없이 선제적으로 업무를 파악하고 처리하는 수준', 6)
RETURNING id INTO s_autonomous;

INSERT INTO grade_anchors (criteria_id, grade, anchor_text, salary_note) VALUES
  (s_autonomous, 'S', '리더가 요청하기 전에 먼저 파악하고 처리. 업무의 빈틈을 스스로 메움', '최우선 인상 검토'),
  (s_autonomous, 'A', '대부분의 반복 업무를 자율 처리. 새로운 상황에서도 판단하고 행동', '인상 적극 검토'),
  (s_autonomous, 'B', '명확한 지시 하에 잘 처리. 자발적 선제 행동은 드물지만 안정적', '기본 인상 검토'),
  (s_autonomous, 'C', '지시가 없으면 움직임이 없음. 리더가 지속적으로 확인해야 하는 상황', '인상 보류 또는 최소'),
  (s_autonomous, 'D', '기본 반복 업무도 지시가 필요하거나 리더의 시간을 과도하게 소모', '인상 없음 / 별도 면담');

END $$;
