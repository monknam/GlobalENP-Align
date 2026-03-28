-- ============================================================
-- SQL 03: 프로필 유형 설문 문항 비활성화
-- "직무", "근무연수" 등 자유 기입 프로필 질문을 비활성화합니다.
-- 해당 데이터는 이제 profiles 테이블(admin이 관리)에서 가져옵니다.
-- Supabase SQL Editor에서 실행
-- ============================================================

-- 현재 short_text 질문 목록 확인 (실행 전 검토용)
SELECT sq.id, sq.question_no, sq.question_text, sq.question_type, sq.is_active,
       ss.name as section_name
FROM survey_questions sq
JOIN survey_sections ss ON sq.survey_section_id = ss.id
WHERE sq.question_type = 'short_text'
ORDER BY sq.question_no;

-- 프로필 성격 질문 비활성화 (직무/근무연수 관련)
-- question_text에 해당 키워드가 포함된 경우 자동 매칭
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

-- 비활성화 결과 확인
SELECT id, question_no, question_text, is_active
FROM survey_questions
WHERE question_type = 'short_text'
ORDER BY question_no;
