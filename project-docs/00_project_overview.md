# Project Overview

## Project

**GlobalENP Align** is a modular HR and organizational operations system built for 글로벌이앤피 (GlobalENP), a fire suppression systems company.

The system is designed to support: organizational culture surveys, performance evaluation, goal alignment, and task management — as separate modules within one integrated platform.

## Active Modules

- **인사평가 (Performance Evaluation)** — multi-step workflow: 자기평가 → 1차 상사평가 → (2차 상사평가) → 커미티 확정
- **조직진단 설문 (Org Culture Survey)** — previously the primary module

## Tech Stack

- Frontend: React 19 + Vite, TanStack Query, Tailwind CSS, shadcn/ui, Wouter routing
- Auth: Supabase Auth (employee emails pending — test mode via localStorage actor)
- Database: Supabase PostgreSQL
- Deployment: Vercel

## Codebase Shape

- Frontend: `artifacts/globalenp-align/src/`
  - `pages/evaluation/` — 인사평가 모듈
  - `pages/surveys/` — 조직진단 설문
  - `hooks/use-evaluation.ts` — 평가 워크플로우 훅
  - `components/layout/Shell.tsx` — 사이드바 레이아웃 (guestMode 지원)
- Migrations: `supabase/migrations/`

## Employee Data

48명 시드 데이터 적재 완료 (6개 부서 + 임원):
- 개발생산부, 커미셔닝/현장관리부, 연구설계부, 영업행정관리부, 경영지원부, 연구개발부

## Working Assumption

- 직원 이메일 미확보 → Supabase Auth 연결 전까지 localStorage 테스트 액터로 운영
- 새 기능은 독립적인 모듈로 추가 (기존 설문 모듈 영향 없음)
