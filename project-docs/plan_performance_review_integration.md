# 성과평가 리뷰 대시보드 Align 통합 계획서

> 작성일: 2026-03-24
> 대상: GAS(Google Apps Script) 인사평가 리뷰 대시보드 → Thingspire Align 통합

---

## 1. 목적 및 배경

현재 2025 인사평가 리뷰 대시보드는 Google Sheets + Apps Script로 운용 중입니다.
이를 Align(Thingspire Flow)의 **성과평가 모듈**로 완전히 흡수하여:

- GAS/Google Sheets 의존성 제거
- Align 디자인 가이드 적용
- Supabase Auth 기반의 권한 관리로 교체 (PIN → Role 기반)
- 향후 설문 데이터, 목표관리 데이터와의 연계 기반 마련

---

## 접근 권한 정책

| 역할 | 접근 | CEO 조정 입력 |
|------|------|--------------|
| member / leader | 접근 불가 (자동 리다이렉트) | 불가 |
| admin (일반 관리자) | 열람 가능 | 불가 |
| **admin + is_system_admin = true (대표이사)** | **열람 가능** | **가능** |

- 성과평가 모듈은 `/admin/performance/...` 경로 — `admin` 역할만 진입 허용
- CEO 조정/확정 기능은 `is_system_admin = true` 계정만 활성화
- `profiles` 테이블의 기존 `is_system_admin` 컬럼을 대표이사 게이트로 사용
- 현재 대표이사 계정(조광재): Supabase에서 `is_system_admin = true` 설정 필요

---

## 2. 현재 GAS 시스템 분석

### 2-1. 화면 구성

| 화면 | 내용 |
|------|------|
| 목록 화면 | 전체 직원 평가 현황 테이블 (23명, 진행률 91.3%) |
| 상세 화면 | 개인별 항목별 점수 + CEO 조정 + 업무 성과 기재 |

### 2-2. 목록 화면 컬럼

- 조직 / 성명 / 재직연수
- 24년 평가 / 연봉
- 25년 평가 (본인/팀장/상위자 평균)
- 조정 점수 (CEO 입력)
- CEO 확정 여부
- 진행 상태
- CEO Grade

### 2-3. 상세 화면 구성

- 인적 정보 헤더 (조직, 성명, 재직연수, 직책)
- 항목별 점수 테이블:
  - 평가 항목 / 본인 점수 / 팀장 점수 / 상위자 점수 / CEO 조정
- 업무 성과 기재 내용 (텍스트)
- 저장 버튼 (CEO 조정 점수, 등급, 코멘트 입력)

### 2-4. 현재 인증 방식

- PIN 번호 `0355` 입력 → 세션 토큰 발급
- → **Align 통합 시 Supabase Auth + `admin` Role로 교체**

### 2-5. 데이터 소스

| 시트명 | 내용 |
|--------|------|
| 인적정보_DB | 직원 기본 정보 (조직, 성명, 재직연수, 직책, 연봉 등) |
| 팀원평가_DB | 팀장이 팀원에 대해 평가한 항목별 점수 |
| 직책자평가_DB | 상위자가 직책자에 대해 평가한 항목별 점수 |

---

## 3. Supabase 데이터 모델 설계

### 3-1. 신규 테이블

```sql
-- 평가 사이클 (예: 2025년 정기 인사평가)
CREATE TABLE evaluation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id),
  title TEXT NOT NULL,               -- "2025 정기 인사평가"
  year INT NOT NULL,
  status TEXT DEFAULT 'active',      -- active | closed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 피평가자 목록 (1행 = 1인)
CREATE TABLE employee_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID REFERENCES evaluation_cycles(id),
  profile_id UUID REFERENCES profiles(id),
  department TEXT,
  tenure_years NUMERIC,
  salary_prev INT,                    -- 24년 연봉
  score_self NUMERIC,                 -- 본인 평가 평균
  score_peer NUMERIC,                 -- 팀장 평가 평균
  score_upper NUMERIC,                -- 상위자 평가 평균
  score_prev_year NUMERIC,            -- 24년 최종 평가
  score_ceo_adjusted NUMERIC,         -- CEO 조정 점수
  grade_ceo TEXT,                     -- CEO Grade (S/A/B/C 등)
  is_confirmed BOOLEAN DEFAULT FALSE, -- CEO 확정 여부
  progress_status TEXT DEFAULT 'pending', -- pending | reviewing | confirmed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 항목별 평가 점수 상세
CREATE TABLE evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_eval_id UUID REFERENCES employee_evaluations(id),
  category TEXT NOT NULL,            -- 평가 항목명
  score_self NUMERIC,
  score_peer NUMERIC,
  score_upper NUMERIC,
  score_ceo_adjusted NUMERIC,
  display_order INT DEFAULT 0
);

-- CEO 코멘트 및 업무 성과 메모
CREATE TABLE evaluation_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_eval_id UUID REFERENCES employee_evaluations(id),
  commenter_id UUID REFERENCES profiles(id),
  comment_type TEXT,                 -- 'ceo_note' | 'performance_desc' | 'self_note'
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3-2. RLS 정책

```sql
-- admin만 평가 데이터 읽기/쓰기
ALTER TABLE evaluation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_only" ON evaluation_cycles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
-- (나머지 테이블 동일 패턴)
```

---

## 4. React 화면 설계

### 4-1. 라우팅 구조

```
/admin/performance                  → 평가 사이클 목록
/admin/performance/:cycleId         → 직원 평가 현황 목록 (현재 GAS 화면 1)
/admin/performance/:cycleId/:evalId → 개인 상세 리뷰 (현재 GAS 화면 2)
```

### 4-2. 화면 1 — 평가 현황 목록 (`/admin/performance/:cycleId`)

**컴포넌트 구성:**
```
PerformanceList
├── 헤더 (사이클명, 진행률 배지, 총 인원수)
├── 요약 통계 바 (확정 완료 / 검토 중 / 대기)
├── EmployeeTable
│   ├── 컬럼: 조직 / 성명 / 재직연수 / 24년 평가 / 연봉 / 25년 평가(평균) / 조정점수 / Grade / 진행상태 / 액션
│   └── EmployeeRow × N
│       └── 행 클릭 → 상세 화면 이동
└── 엑셀 내보내기 버튼 (선택 구현)
```

**디자인 가이드 적용:**
- 테이블 컨테이너: `ts-card p-0`
- 헤더 행: `bg-[hsl(var(--neutral-50))]`, `text-xs font-semibold text-[hsl(var(--neutral-500))]`
- Grade 배지: `StatusBadge` 패턴 재활용 (S=primary, A=green, B=neutral, C=red)
- 진행 상태: 기존 `StatusBadge` 컴포넌트 재사용

### 4-3. 화면 2 — 개인 상세 리뷰 (`/admin/performance/:cycleId/:evalId`)

**컴포넌트 구성:**
```
PerformanceDetail
├── 뒤로 가기 + 헤더 (이름, 조직, 재직연수, 직책)
├── ScoreTable (항목별 점수)
│   ├── 컬럼: 평가항목 / 본인 / 팀장 / 상위자 / CEO 조정(편집 가능)
│   └── 점수 시각화 (선택: 미니 바 차트)
├── PerformanceNotes (업무 성과 기재 내용 — 읽기 전용 표시)
├── CeoReviewForm
│   ├── 조정 점수 input
│   ├── Grade 드롭다운 (S / A / B / C / D)
│   ├── CEO 코멘트 textarea
│   └── 저장 / 확정 버튼
└── 확정 토글 (is_confirmed)
```

**디자인 가이드 적용:**
- 섹션 카드: `ts-card p-6 space-y-4`
- 편집 input: Radix UI `Input` 컴포넌트 (`ts-input` 클래스)
- 저장 버튼: `ts-btn-primary`
- 확정 버튼: 비활성 → `ts-btn-secondary`, 확정 → 초록 배지

---

## 5. Hooks 설계

```typescript
// src/hooks/use-performance.ts

// 사이클 목록
useGetEvaluationCycles()

// 직원 평가 목록 (화면 1 데이터)
useGetEmployeeEvaluations(cycleId: string)

// 개인 상세 (화면 2 데이터)
useGetEvaluationDetail(evalId: string)
useGetEvaluationScores(evalId: string)
useGetEvaluationComments(evalId: string)

// CEO 조정 저장
useSaveCeoReview()   // score_ceo_adjusted, grade_ceo, comment, is_confirmed 업데이트
```

---

## 6. 데이터 마이그레이션 전략

### 6-1. Google Sheets → Supabase CSV 가져오기

1. Google Sheets 3개 시트를 CSV로 내보내기
2. Supabase 대시보드 **Table Editor → Import CSV** 기능으로 임시 테이블 적재
3. SQL `INSERT INTO employee_evaluations SELECT ...` 로 정규화된 테이블로 이관

### 6-2. 마이그레이션 SQL 파일 경로

```
project-docs/sql/04_evaluation_tables.sql    ← 테이블 생성 + RLS
project-docs/sql/05_evaluation_seed.sql      ← CSV 데이터 → 정규화 이관
```

### 6-3. 평가 항목 목록 (GAS 현행 항목 그대로 유지)

GAS 코드에서 확인된 평가 항목들을 `evaluation_scores.category` 값으로 그대로 사용합니다.
실제 항목명은 마이그레이션 시 Google Sheets에서 확인 후 확정합니다.

---

## 7. 구현 단계

| 단계 | 내용 | 우선순위 |
|------|------|----------|
| **Phase 1** | SQL 04 실행 (테이블 생성 + RLS) | 필수 |
| **Phase 1** | use-performance.ts hooks 작성 | 필수 |
| **Phase 1** | 평가 현황 목록 화면 (`/admin/performance/:cycleId`) | 필수 |
| **Phase 1** | 개인 상세 리뷰 화면 + CEO 저장 기능 | 필수 |
| **Phase 1** | Shell.tsx 네비 "성과평가 > 조직평가" 링크 활성화 | 필수 |
| **Phase 2** | CSV 마이그레이션 + 데이터 검증 | 데이터 준비 후 |
| **Phase 2** | 평가 사이클 생성/관리 admin UI | 선택 |
| **Phase 3** | 엑셀 내보내기 (xlsx 라이브러리) | 선택 |
| **Phase 3** | 설문 데이터와 교차 분석 연계 | 향후 |

---

## 8. 네비게이션 연결

현재 Shell.tsx의 "성과평가 > 조직평가" 항목은 `comingSoon: true` 상태입니다.
Phase 1 구현 완료 후 아래와 같이 변경합니다:

```typescript
// Shell.tsx
{ href: "/admin/performance", label: "조직평가", adminOnly: true }
```

일반 구성원은 성과평가 모듈에 접근 불가 (admin 전용).

---

## 9. 미결 사항

| 항목 | 내용 |
|------|------|
| 평가 항목 목록 | GAS/Google Sheets에서 실제 항목명 확인 필요 |
| 자기평가 데이터 | GAS에서 본인 점수 입력 경로 확인 필요 |
| 이전 연도 평가 히스토리 보관 여부 | 2024년 데이터도 같이 넣을지 결정 필요 |
| 엑셀 내보내기 포맷 | 현재 GAS 엑셀 출력물과 동일하게 맞출지 여부 |
| 연봉 데이터 보안 | Supabase RLS에서 admin만 열람 가능하도록 컬럼 레벨 정책 검토 |

---

## 10. 작업 시작 방법

계획서 검토 후 실제 구현 시작은 다음 명령으로 요청:

> "성과평가 모듈 Phase 1 구현 시작해줘"

이 경우 다음 순서로 진행합니다:
1. `project-docs/sql/04_evaluation_tables.sql` 생성
2. Supabase SQL Editor 실행 안내
3. `src/hooks/use-performance.ts` 작성
4. `src/pages/admin/performance/` 디렉토리 + 화면 컴포넌트 작성
5. Shell.tsx 네비 업데이트
6. work_log 업데이트
