# Current Goal

## Active Goal

1. 인사평가 모듈 완성 및 실제 사용 가능한 상태로 만들기.
2. TO/PO 조직 관리 모듈(조직도 기반 TO 현황판 + 충원결재플로우) 연동 및 테스트.

## Immediate Objectives

1. Supabase migration 적용 (`supabase db push --linked`) - 인사평가 및 TO/PO 모듈 스키마 적용
2. 인사평가 E2E 테스트: 사이클 생성 → 활성화 → 자기평가 → 1차평가 → 커미티 확정
3. 직원 이메일 확보 후 Supabase Auth 연결 (로그인 기능 완성)
4. 관리자 대시보드 내 TO/PO 모듈 조직도 위젯 반영 및 폼 테스트

## Completed in This Phase

- employees 테이블 + 48명 시드 (supervisor_id 연결)
- 평가 워크플로우 전체 테이블 설계 + RLS (dev: USING true)
- 평가 항목 14개 (행동지표 5단계 포함)
- 평가 관리 페이지 (`/evaluation`) — 사이클 관리 + 인스턴스 테이블
- 평가 작성 폼 (`/evaluation/form/:instanceId/:step`)
- 커미티 리뷰 페이지 (`/evaluation/:cycleId/:instanceId/committee`)
- 평가 결과 보기 페이지 (`/evaluation/:cycleId/:instanceId/result`)
- Shell guestMode (인증 없이 평가 페이지 접근)
- CycleDetail 액션 버튼 워크플로우 상태별 분기
- useConfirmEvaluation 평균 점수 자동 계산 (DB에서 직접 fetch + 평균 산출)

## Not In Scope Right Now

- Express API 서버 관련 작업
- 설문 모듈 변경
- Next.js 마이그레이션
