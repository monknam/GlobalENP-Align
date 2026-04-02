# Current Goal

## Active Goal

인사평가 모듈 완성 및 실제 사용 가능한 상태로 만들기.

## Immediate Objectives

1. Supabase migration 3개 적용 (`supabase db push --linked`)
2. E2E 테스트: 사이클 생성 → 활성화 → 자기평가 → 1차평가 → 커미티 확정
3. 직원 이메일 확보 후 Supabase Auth 연결 (로그인 기능 완성)
4. 대시보드에 인사평가 현황 위젯 추가

## Completed in This Phase

- employees 테이블 + 48명 시드 (supervisor_id 연결)
- 평가 워크플로우 전체 테이블 설계 + RLS (dev: USING true)
- 평가 항목 14개 (행동지표 5단계 포함)
- 평가 관리 페이지 (`/evaluation`)
- 평가 작성 폼 (`/evaluation/form/:instanceId/:step`)
- 커미티 리뷰 페이지 (`/evaluation/:cycleId/:instanceId/committee`)
- Shell guestMode (인증 없이 평가 페이지 접근)

## Not In Scope Right Now

- Express API 서버 관련 작업
- 설문 모듈 변경
- Next.js 마이그레이션
