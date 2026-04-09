-- ============================================================
-- SQL 03: 프로필 유형 설문 문항 비활성화
-- survey_questions 테이블이 없는 경우 안전하게 건너뜁니다.
-- ============================================================

-- survey_questions 기본 테이블 (없을 경우 생성)
CREATE TABLE IF NOT EXISTS survey_sections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id    UUID REFERENCES survey_cycles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_section_id UUID REFERENCES survey_sections(id) ON DELETE CASCADE,
  question_no       INT,
  question_text     TEXT NOT NULL,
  question_type     TEXT NOT NULL DEFAULT 'rating',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 프로필 성격 질문 비활성화 (직무/근무연수 관련)
UPDATE survey_questions
SET is_active = false
WHERE question_type = 'short_text'
  AND (
    question_text ILIKE '%직무%'
    OR question_text ILIKE '%근무%'
    OR question_text ILIKE '%연차%'
    OR question_text ILIKE '%직책%'
    OR question_text ILIKE '%부서%'
    OR question_text ILIKE '%직급%'
  );
