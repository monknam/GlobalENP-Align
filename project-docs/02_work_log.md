# Work Log

## 2026-04-02 (Session 6) — GlobalENP 인사평가 시스템 구축

### Completed

- **프로젝트 전환**: Thingspire Flow → GlobalENP Align
  - 회사명 변경 및 평가 시스템 신규 설계
  - 기존 Thingspire 평가 테이블 DROP CASCADE 후 재설계

- **DB 마이그레이션 3종** (`supabase/migrations/2026040200000{1,2,3}_*.sql`)
  - `000001_evaluation_workflow.sql`: employees, eval_cycles, eval_items, eval_instances, eval_assignments, eval_submissions, eval_scores, eval_final_results 테이블 생성 + RLS (dev: USING true)
  - `000002_eval_items_seed.sql`: 평가 항목 14개 — 공통 2개(책임감·성실성, 협업·소통) + 직군별 3개씩(manufacturing/field/technical/admin), 5단계 행동지표 포함
  - `000003_globalenp_employees.sql`: 글로벌이앤피 직원 48명 시드 (6개 부서 + 임원/기타) + supervisor_id 연결

- **Frontend: 인사평가 모듈 신규 구축** (`artifacts/globalenp-align/src/`)
  - `hooks/use-evaluation.ts`: 전체 평가 워크플로우 훅 (Employee/EvalCycle/EvalItem/EvalInstance/EvalSubmission/EvalScore/EvalFinalResult 타입 + Supabase 쿼리 13종)
    - localStorage 기반 테스트 액터 (`eval_test_actor_id`)
    - `useCreateCycleInstances`: 사이클 활성화 + 인스턴스/배정 일괄 생성
    - `useSaveEvaluation`: 제출+점수 upsert + 워크플로우 자동 진행
    - `useConfirmEvaluation`: final_results 저장 + 상태 confirmed 전환
  - `pages/evaluation/index.tsx`: 평가 관리 메인 — 사이클 목록/상세, 인스턴스 테이블, TestActorSelector 배너, 워크플로우 배지
  - `pages/evaluation/form.tsx`: 평가 작성 폼 — 항목별 점수 선택(5단계 컬러 코딩), 행동지표 토글, 사례 기재란, 자동 워크플로우 진행
  - `pages/evaluation/committee.tsx`: 커미티 리뷰 — 단계별 점수 비교(self/first/second), 2차 평가자 배정, 최종 등급(S/A/B/C/D) 확정
  - `App.tsx`: `/evaluation`, `/evaluation/:cycleId`, `/evaluation/form/:instanceId/:step`, `/evaluation/:cycleId/:instanceId/committee` 라우트 추가
  - `components/layout/Shell.tsx`: 성과평가 섹션 → "인사평가" (`/evaluation`, 전체 공개)

### Workflow State Machine

```
pending_self → pending_first → pending_committee ↔ pending_second → confirmed
```
- 자기평가 제출 → pending_first
- 1차/2차 평가 제출 → pending_committee
- 커미티에서 2차 요청 → pending_second
- 커미티 최종 확정 → confirmed

### 직군 구성

| job_group | 부서 |
|---|---|
| manufacturing | 개발생산부 |
| field | 커미셔닝/현장관리부 |
| technical | 연구설계부, 연구개발부 |
| admin | 영업행정관리부, 경영지원부 |
| executive | 임원/기타 (평가 제외) |

### 테스트 방법

1. Supabase에 migration 3개 실행 (`supabase db push --linked`)
2. `/evaluation` 접속
3. 상단 "테스트 액터" 배너에서 직원 선택
4. 평가 사이클 생성 → 활성화 → 자기평가 작성

### Remaining Issues

- Supabase migration 3개 아직 실행 전 (로컬 실행 필요)
- 로그인/인증 연결 미완료 (이메일 정보 없음 → localStorage 테스트 액터로 임시 운영)
- 커미티 페이지의 평균 점수 자동 계산 미구현 (scoreSelfAvg 등 null 저장 중)
- 실제 사용자 이메일 확보 후 Supabase Auth 연결 필요

### Recommended Next Task

1. `supabase db push --linked` 실행하여 migration 적용
2. `/evaluation` 페이지 E2E 테스트 (사이클 생성 → 활성화 → 자기평가 → 1차평가 → 커미티 확정)
3. 커미티 페이지 점수 평균 자동 계산 (useGetScores 병렬 fetch + avg 계산 후 useConfirmEvaluation에 전달)

---

## 2026-03-24 (Session 5)

### Completed

- **2025 정기 인사평가 데이터 Supabase 임포트 완료**
  - CSV 3개 파일 파싱 (인적정보_DB.csv, 직책자평가_DB.csv, 팀원평가_DB.csv) → Python 스크립트로 변환
  - `project-docs/sql/05_evaluation_seed.sql` 생성 (790줄):
    - evaluation_cycles: "2025 정기 인사평가" 사이클 1건
    - employee_evaluations: 32명 전원 (CEO조정점수·등급·진행상태·업무성과 포함)
    - evaluation_scores: 직책자 7명 × 7항목 (목표달성, 업무기여, 완성도, 리더십, 성과관리, 소통, 기업관) 수치 점수
    - evaluation_scores: 팀원 18명 × 9항목 (근태, 교육, 책임감, 협조성, 성실성, 판단력, 기획력, 전문성, 성과KPI) 문자등급(S/A+/A-/B+/B-) → 수치(5.0~1.5) 변환
  - 등급 매핑: 고성과자→A, 일반→B, 저성과자→D
  - `supabase/migrations/20260324000005_evaluation_seed.sql`로 등록 → `supabase db push --linked`로 원격 DB 적용 완료
  - TypeScript 타입 오류 없음 확인

### Remaining Issues

- **profiles.job_group 데이터** 미입력 — 그룹 비교 탭 빈 상태 유지 중
- **배포 앱 E2E 테스트** 미완료

### Recommended Next Task

1. 배포된 앱 E2E 테스트: /admin/performance 접속 → 인사평가 목록 → 개인 상세 → CEO 조정 저장
2. profiles.job_group 데이터 입력 (직군별 비교 기능 활성화)

---

## 2026-03-24 (Session 4)

### Completed

- **미완 이슈 코드 수정**
  - `01_profiles_extend.sql`: `is_system_admin`, `department_name`, `employment_status`, `employee_group` 컬럼 추가 — `use-auth.ts`에서 SELECT하는 모든 컬럼이 누락되어 있었음
  - `04_evaluation_tables.sql`: `evaluation_cycles.org_id`의 `REFERENCES organizations(id)` FK 제거 — Supabase에 `organizations` 테이블이 없을 경우 SQL 실행 실패하는 문제 수정, nullable UUID로 변경
  - `artifacts/thingspire-flow/src/pages/admin/performance/index.tsx`: URL 파라미터 `cycleId` 무시 버그 수정 — `/admin/performance/:cycleId` 라우트 진입 시 URL의 cycleId가 초기 선택 값으로 반영되도록 `Props` 인터페이스 및 `params` 수신 추가

- **Supabase CLI 설치 + migration 실행 완료** (supabase db push --linked)
  - `supabase/migrations/` 디렉토리 신설 + SQL 01~04 migration 파일 등록
  - 01: profiles 컬럼 확장 (이미 적용됨 확인)
  - 02: action_items 테이블 + RLS (테이블 이미 존재, 정책 재적용 완료)
  - 03: 프로필 성격 설문 질문 비활성화
  - 04: 성과평가 테이블 (evaluation_cycles, employee_evaluations, evaluation_scores, evaluation_comments) + RLS 생성
  - 대표이사 계정(kwangjaecho@thingspire.com) is_system_admin = TRUE 설정 완료

### Remaining Issues

- **Google Sheets 데이터 → Supabase 마이그레이션** 미완료 (Phase 2)
  - Google Sheets 3개 시트 CSV 내보내기 → Supabase `employee_evaluations`, `evaluation_scores` 임포트
- **profiles.job_group 데이터** 미입력 — 그룹 비교 탭 빈 상태 유지 중
- **배포 앱 E2E 테스트** 미완료

### Recommended Next Task

1. Google Sheets 3개 시트 CSV 내보내기 → Supabase 임포트
2. 배포된 앱 E2E 테스트 (로그인 → 설문 참여 → 성과평가 열람)

---

## 2026-03-24 (Session 3)

### Completed

- **성과평가 모듈 Phase 1 구현** (GAS → Align 통합)
  - `src/hooks/use-performance.ts`: EvaluationCycle, EmployeeEvaluation, EvaluationScore Supabase 훅
  - `src/pages/admin/performance/index.tsx`: 직원 평가 현황 목록 화면 (요약 통계 + 진행률 바 + 테이블)
  - `src/pages/admin/performance/detail.tsx`: 개인 상세 리뷰 화면 (항목별 점수 + CEO 조정 폼)
  - `App.tsx`: `/admin/performance`, `/admin/performance/:cycleId`, `/admin/performance/:cycleId/:evalId` 라우트 등록
  - `Shell.tsx`: 성과평가 > 인사평가 리뷰 메뉴 활성화 (admin 전용)
- **권한 분리**
  - admin: 전체 열람 가능
  - is_system_admin = true (대표이사, kwangjaecho@thingspire.com): CEO 조정 점수·Grade·확정 입력 가능
- **SQL 04_evaluation_tables.sql** 준비 (Supabase 실행 대기 중)
  - evaluation_cycles, employee_evaluations, evaluation_scores, evaluation_comments 테이블
  - RLS: admin 읽기, is_system_admin 쓰기
  - 대표이사 계정 is_system_admin = true 설정 포함
- **계획서 작성**: `project-docs/plan_performance_review_integration.md`
- **Git 태그**: `v0.5.0` — Align 리브랜딩 + 네비 개편 완료 기준점

### Remaining Issues

- Supabase SQL 04 아직 미실행 — 테이블 없이 화면 접근 시 빈 상태로 표시됨
- Google Sheets 데이터 → Supabase 마이그레이션 미완료 (Phase 2)
- 평가 항목(evaluation_scores) 실제 데이터 입력 필요

### Recommended Next Task

1. Supabase SQL Editor에서 `04_evaluation_tables.sql` 실행
2. Google Sheets 3개 시트 CSV 내보내기 → Supabase 임포트
3. 데이터 확인 후 E2E 테스트

---

## 2026-03-21

### Completed

- Reviewed the current Replit-based monorepo structure
- Identified migration blockers:
  - session auth
  - Replit runtime assumptions
  - mixed frontend data access
  - role/permission mismatches
- Added `MIGRATION_PLAN.md`
- Added `SUPABASE_AUTH_MIGRATION.md`
- Added frontend Supabase bootstrap:
  - `artifacts/thingspire-flow/src/lib/supabase.ts`
- Replaced frontend auth hook internals with Supabase-oriented session/profile loading:
  - `artifacts/thingspire-flow/src/hooks/use-auth.ts`
- Added frontend env scaffolding:
  - `artifacts/thingspire-flow/.env.example`
  - `artifacts/thingspire-flow/src/vite-env.d.ts`
- Added `project-docs` operating docs and handoff template
- Added profile schema groundwork:
  - `lib/db/src/schema/profiles.ts`
  - `lib/db/src/schema/index.ts`
- Refactored backend current-user lookup to resolve `profiles` first and fall back to legacy `users`
  - `artifacts/api-server/src/lib/session.ts`
- Updated admin user routes to read merged `profiles/users` data and dual-write transitional updates
  - `artifacts/api-server/src/routes/users.ts`
- Added root-level agent workflow entrypoint
  - `AGENTS.md`
- Strengthened repo rules to require documentation updates after meaningful work
  - `project-docs/03_rules.md`
  - `project-docs/agent_handoff_template.md`
  - `project-docs/01_current_goal.md`
- Relaxed frontend Vite config so local boot no longer requires Replit-only `PORT` and `BASE_PATH`
  - `artifacts/thingspire-flow/vite.config.ts`
- Fixed frontend null-safety issues that were still present in actual source files
  - `artifacts/thingspire-flow/src/components/layout/Shell.tsx`
  - `artifacts/thingspire-flow/src/pages/dashboard.tsx`
- Made Supabase bootstrap/auth handling degrade safely when env vars are missing instead of crashing at import time
  - `artifacts/thingspire-flow/src/lib/supabase.ts`
  - `artifacts/thingspire-flow/src/hooks/use-auth.ts`
- Installed workspace dependencies locally and added missing native packages required to boot Vite on macOS ARM
  - `pnpm install`
  - `@rollup/rollup-darwin-arm64`
  - `lightningcss-darwin-arm64`
  - `@tailwindcss/oxide-darwin-arm64`
- Started the frontend dev server successfully
  - local URL: `http://localhost:5174/`
- Added a local development auth fallback so login can still work without Supabase env or a running backend
  - `artifacts/thingspire-flow/src/hooks/use-auth.ts`
- Added dashboard mock overview data for local frontend-only development when API calls fail
  - `artifacts/thingspire-flow/src/pages/dashboard.tsx`
- Updated generated API fetch behavior to include credentials by default for legacy session-based routes
  - `lib/api-client-react/src/custom-fetch.ts`

### In Progress

- Refactor remaining backend identity and permissions logic toward `profiles`

### Known Gaps

- `profiles` table is not yet wired into backend routes
- Most backend analytics queries still read from legacy `usersTable`
- Legacy Express auth still exists in the backend
- Frontend still references legacy generated API hooks in other areas
- A full runtime verification still has not been performed in this environment
- Full typecheck/build verification has still not been run after installing dependencies

### Recommended Next Task

- Refactor dashboard and auth routes away from legacy `usersTable` assumptions

## 2026-03-21

### Completed

- Removed the frontend's unsafe local admin auth backdoor
  - `artifacts/thingspire-flow/src/hooks/use-auth.ts`
- Removed dashboard mock metric fallback and replaced it with an explicit error state
  - `artifacts/thingspire-flow/src/pages/dashboard.tsx`
- Fixed the broken admin CTA so it now routes to the real survey management page
  - `artifacts/thingspire-flow/src/pages/dashboard.tsx`
- Aligned permissions in the UI with backend policy
  - leaders can still view the user admin page but can no longer open edit controls
  - leaders can still view action items but can no longer see delete controls
  - `artifacts/thingspire-flow/src/pages/admin/users.tsx`
  - `artifacts/thingspire-flow/src/pages/results/dashboard.tsx`
- Fixed backend route flow/type issues and restored full workspace typecheck
  - added explicit returns in route handlers
  - validated `sectionId` access in nested question routes
  - `artifacts/api-server/src/routes/auth.ts`
  - `artifacts/api-server/src/routes/dashboard.ts`
  - `artifacts/api-server/src/routes/departments.ts`
  - `artifacts/api-server/src/routes/questions.ts`
  - `artifacts/api-server/src/routes/responses.ts`
  - `artifacts/api-server/src/routes/surveys.ts`
  - `artifacts/api-server/src/routes/users.ts`
- Fixed generated React Query hook usage so frontend typecheck passes
  - `artifacts/thingspire-flow/src/pages/admin/surveys/edit.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/intro.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/respond.tsx`
- Extended frontend env typing/examples for explicit dev flags
  - `artifacts/thingspire-flow/src/vite-env.d.ts`
  - `artifacts/thingspire-flow/.env.example`

### Verification

- Frontend build passed
  - `pnpm --prefix artifacts/thingspire-flow run build`
- Full workspace typecheck passed
  - `pnpm run typecheck`

### Remaining Risks

- Legacy Express auth still exists and still uses weak password hashing until Supabase auth fully replaces it
- Backend analytics and some admin flows still depend on legacy `usersTable` data
- No end-to-end browser regression sweep has been completed for every page after these fixes

### Recommended Next Task

- Do a route-by-route browser QA sweep and fix runtime issues that only appear with live data

## 2026-03-22

### Completed

- Changed survey profile-style questions from dropdown-style selection to clickable option buttons in the response UI
  - `직무 유형` now uses fixed options: `개발`, `기획 / PM`, `경영관리`
  - `근속 기간` uses fixed clickable tenure options
  - fallback parsing for inline `▸` choice text remains for other short-text prompts
  - `artifacts/thingspire-flow/src/pages/surveys/respond.tsx`
- Updated survey response UX so non-qualitative short-text questions can be answered via selection instead of free typing when the prompt embeds choice options
  - the response screen now parses inline options from question text after `▸`
  - objective/profile-style short-text prompts render as dropdown selects with a `선택해주세요` placeholder
  - long-form qualitative opinion fields remain free-text
  - `artifacts/thingspire-flow/src/pages/surveys/respond.tsx`
- Completed a broader frontend wording pass for internal-use positioning across admin and survey participation screens
  - admin user/department pages now read as internal operations screens rather than generic SaaS admin pages
  - survey intro/respond flows now emphasize internal diagnosis participation, confidentiality, and internal improvement use
  - `artifacts/thingspire-flow/src/pages/admin/users.tsx`
  - `artifacts/thingspire-flow/src/pages/admin/departments.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/intro.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/respond.tsx`
- Refined frontend wording further to reduce external SaaS tone and emphasize internal organizational use
  - login copy now reads as an internal system entry point
  - dashboard, survey list, and results wording now explicitly reference internal organizational use
  - upcoming module labels were adjusted to read less like generic SaaS navigation
  - `artifacts/thingspire-flow/src/pages/login.tsx`
  - `artifacts/thingspire-flow/src/components/layout/Shell.tsx`
  - `artifacts/thingspire-flow/src/pages/dashboard.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/index.tsx`
  - `artifacts/thingspire-flow/src/pages/results/dashboard.tsx`
- Updated core UI wording to align the product with an integrated organizational operations system instead of a survey-only tool
  - reframed login messaging around organizational diagnosis and improvement
  - renamed sidebar/navigation items toward diagnosis, operations, and execution language
  - updated dashboard and survey list copy to position surveys as organizational diagnosis workflows
  - updated results dashboard wording and added an explicit anonymity/non-punitive interpretation notice
  - `artifacts/thingspire-flow/src/pages/login.tsx`
  - `artifacts/thingspire-flow/src/components/layout/Shell.tsx`
  - `artifacts/thingspire-flow/src/pages/dashboard.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/index.tsx`
  - `artifacts/thingspire-flow/src/pages/results/dashboard.tsx`
- Pre-filled the login screen with the local admin credentials for faster local testing
  - default email: `admin@thingspire.com`
  - default password: `admin1234`
  - password field now receives autofocus so pressing Enter submits immediately
  - `artifacts/thingspire-flow/src/pages/login.tsx`
- Restored a localhost-only development auth fallback because the frontend was running without a backend or database
  - enabled only in Vite dev on `localhost`/`127.0.0.1`
  - gated by `VITE_ENABLE_LOCAL_DEV_AUTH=true`
  - persists a local dev session in browser storage for convenience
  - `artifacts/thingspire-flow/src/hooks/use-auth.ts`
  - `artifacts/thingspire-flow/.env.local`
- Hardened survey list pages against non-array API responses so the UI no longer crashes when `/api/surveys` returns an unexpected payload
  - `artifacts/thingspire-flow/src/pages/surveys/index.tsx`
  - `artifacts/thingspire-flow/src/pages/results/dashboard.tsx`
- Hardened admin list pages against non-array API responses
  - `artifacts/thingspire-flow/src/pages/admin/users.tsx`
  - `artifacts/thingspire-flow/src/pages/admin/departments.tsx`
- Updated brand click behavior and copy to better reflect an integrated system, not a survey-only app
  - mobile header brand mark now routes to `/`
  - login page brand block now routes to `/`
  - dashboard/login/survey module copy adjusted to position surveys as one module within the system
  - `artifacts/thingspire-flow/src/components/layout/Shell.tsx`
  - `artifacts/thingspire-flow/src/pages/login.tsx`
  - `artifacts/thingspire-flow/src/pages/dashboard.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/index.tsx`
- Replaced the temporary icon-based brand with a reusable company wordmark component based on the provided mark
  - `artifacts/thingspire-flow/src/components/brand/BrandLogo.tsx`
  - `artifacts/thingspire-flow/src/components/layout/Shell.tsx`
  - `artifacts/thingspire-flow/src/pages/login.tsx`
- Added a formal product vision document and updated agent/project rules so all future work treats survey as one module inside an integrated HR/organization platform
  - `project-docs/04_product_vision.md`
  - `AGENTS.md`
  - `project-docs/00_project_overview.md`
  - `project-docs/01_current_goal.md`
  - `project-docs/03_rules.md`
- Switched local frontend env from mock auth mode to Supabase mode using the provided project URL and publishable key
  - `artifacts/thingspire-flow/.env.local`

### Remaining Issues

- Some secondary pages may still contain survey-first or admin-centric wording
- Local development credential autofill behavior still exists even though the user-facing wording is now less demo-oriented
- The UI messaging now better reflects the product philosophy, but the backend architecture is still in a migration state

### Recommended Next Task

- Continue with a page-by-page wording and IA pass for survey intro/respond, admin screens, and remaining empty/error states

## 2026-03-22 (Session 2)

### Completed

- Supabase Auth 계정 생성 (Python Admin API로 32명 정규직)
- `nam@thingspire.com` 로그인 시 역할 선택 화면(`/role-select`) 구현
  - sessionStorage 기반 role override (관리자 / 리더 선택)
  - `artifacts/thingspire-flow/src/pages/role-select.tsx`
  - `artifacts/thingspire-flow/src/hooks/use-auth.ts`
  - `artifacts/thingspire-flow/src/App.tsx`
- 설문 DB 테이블 생성 (Supabase SQL): survey_cycles, survey_sections, survey_questions, survey_responses, survey_answers
- 2026 Q1 조직문화 진단 설문 시딩: 섹션 10개, 질문 57개 (likert_5 40개 + short_text 2개 + long_text 15개)
- Express API 서버 의존성 제거 — 설문/대시보드 API를 Supabase 직접 쿼리로 전환
  - `artifacts/thingspire-flow/src/hooks/use-surveys.ts` (신규)
  - `artifacts/thingspire-flow/src/hooks/use-dashboard.ts` (useGetDashboardOverview 추가)
  - `artifacts/thingspire-flow/src/pages/surveys/index.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/intro.tsx`
  - `artifacts/thingspire-flow/src/pages/surveys/respond.tsx`
  - `artifacts/thingspire-flow/src/pages/dashboard.tsx`
- Supabase RLS 정책 설정: 설문 테이블 전체에 인증 기반 접근 제어
- survey_responses FK를 users → profiles(auth.users) 참조로 변경
- Vercel 배포 완료 (GitHub main 브랜치 자동 배포)

### Current Architecture

- Frontend: Vercel (React 19 + Vite)
- Auth: Supabase Auth 직접 (JWT)
- Survey 데이터: Supabase 직접 쿼리 (Express 불필요)
- DB: Supabase PostgreSQL (wxtaepqveqrimjaauidd)
- 테이블: departments, profiles, users (legacy), survey_cycles, survey_sections, survey_questions, survey_responses, survey_answers

### Remaining Issues

- profiles 테이블에 실제 사용자 데이터가 채워졌는지 확인 필요 (auth.users 기반 populate 필요할 수 있음)
- 결과 분석 대시보드(admin/results)는 아직 Express API 호출 중 → 별도 Supabase 마이그레이션 필요
- admin 설문 관리 페이지(admin/surveys/edit)도 Express API 사용 중
- `nam@thingspire.com` 계정이 실제 Supabase auth에 존재하는지 확인 필요

### Recommended Next Task

- 배포된 앱에서 설문 참여 플로우 E2E 테스트 (로그인 → 설문 목록 → 소개 → 응답 → 제출)
- profiles 테이블에 auth.users 기반 데이터 populate SQL 실행 확인
- 결과 분석 대시보드를 Supabase 직접 쿼리로 전환

## 2026-03-22 (Session 3)

### Completed

- 버전 태깅 컨벤션 수립 및 첫 릴백 기준점 태그 생성
  - `git tag -a v0.3.0 -m "Supabase migration + survey flow + Vercel deploy"` (efadfba 커밋 기준)
  - 이후 배포 전 `git tag -a vX.Y.Z -m "..."` 로 관리
- 설문 UX: 프로필 성격 질문 (직무, 근무연수 등 자유 입력) 비활성화 전략 수립
  - `project-docs/sql/03_disable_profile_questions.sql` — short_text 프로필 질문 is_active=false UPDATE
  - profiles 테이블에 job_group / tenure_group 컬럼 추가 예정 → 어드민이 관리
  - 정성 long_text 질문(섹션 마지막부)은 유지 및 강화
- SQL 스크립트 정비 (project-docs/sql/ 디렉터리 신설)
  - `01_profiles_extend.sql` — profiles에 job_group/tenure_group 추가 + auth.users 동기화
  - `02_action_items_table.sql` — action_items 테이블 + RLS 생성
  - `03_disable_profile_questions.sql` — 프로필 질문 비활성화
- Express API 의존성 완전 제거 — 결과 대시보드 Supabase 전환
  - `useSurveyDashboard` → Supabase 직접 집계 (섹션·질문 avg, 부서별 응답률)
  - `useQualitative` → Supabase 직접 long_text 답변 수집
  - `useGroupComparison` → profiles.job_group 기반 그룹 집계 (Supabase)
  - `useActionItems`, `useCreateActionItem`, `useUpdateActionItem`, `useDeleteActionItem` → action_items 테이블 직접 CRUD
  - `artifacts/thingspire-flow/src/hooks/use-dashboard.ts`
- admin 설문 관리 페이지 Supabase 전환
  - `useUpdateSurvey`, `useActivateSurvey`, `useCloseSurvey`, `useCreateSection`, `useCreateQuestion` 훅 신규 추가
  - `artifacts/thingspire-flow/src/hooks/use-surveys.ts`
  - `artifacts/thingspire-flow/src/pages/admin/surveys/edit.tsx` — `@workspace/api-client-react` 의존성 완전 제거
- 결과 대시보드 useGetSurveys import 교체
  - `artifacts/thingspire-flow/src/pages/results/dashboard.tsx`
- 프론트엔드 typecheck 통과, production build 통과

### DB 작업 (Supabase SQL Editor에서 실행 필요)

아래 SQL을 **순서대로** Supabase SQL Editor에서 실행해야 기능이 정상 작동합니다:

1. `project-docs/sql/01_profiles_extend.sql` — profiles 확장 + auth.users 동기화
2. `project-docs/sql/02_action_items_table.sql` — action_items 테이블 생성
3. `project-docs/sql/03_disable_profile_questions.sql` — 설문 프로필 질문 비활성화

### Current Architecture

- Frontend: Vercel (React 19 + Vite), **Express API 의존성 없음**
- Auth: Supabase Auth (JWT)
- 모든 데이터: Supabase 직접 쿼리
- DB: Supabase PostgreSQL (wxtaepqveqrimjaauidd)

### Remaining Issues

- Supabase SQL 3개 파일 실행 대기 (로컬에서 직접 실행 필요)
- profiles.job_group 데이터가 없으면 그룹 비교 탭은 "데이터 없음" 상태로 표시됨
  - 어드민 UI에서 각 구성원의 job_group을 설정하거나 SQL로 일괄 업데이트 필요
- 배포된 앱 E2E 테스트 미완료

### Recommended Next Task

- Supabase SQL 3개 파일 순서대로 실행
- 배포된 앱 E2E 테스트 (로그인 → 설문 → 제출)
- profiles.job_group 데이터 일괄 업데이트 SQL 작성 (직군 분류 후)
- 어드민 사용자 관리 페이지에서 job_group 편집 기능 추가 검토
