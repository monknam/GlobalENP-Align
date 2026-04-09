# TO 관리 모듈 인수인계 문서
## GlobalENP-Align 프로젝트 통합용

---

## 1. 컨텍스트 요약

**회사**: ㈜글로벌이앤피 — 소방 방화 설비(방화댐퍼, 제연 설비) 설계·제조·시공·커미셔닝  
**목적**: 현업 부서장이 신규 인력 충원(TO)을 신청하는 웹폼 + 전사 TO/PO 관리 시스템  
**이 문서의 역할**: 별도 Claude 세션(GAS 프로토타입)에서 완성된 설계와 코드를 GlobalENP-Align 프로젝트에 통합하기 위한 인수인계

---

## 2. 이미 완성된 것들

### 2-1. 요구정의서 (PRD)
- 파일명: `GENP_TO_관리시스템_요구정의서_v1.0.docx`
- 위치: 사용자 로컬 (다운로드됨)
- 내용: 9챕터 + 부록 2개, 전체 시스템 설계 상세 명세

### 2-2. GAS 프로토타입 코드 (`GENP_TO_GAS.zip`)
다음 파일들이 완성됨:

```
gas_to_request/
├── Code.gs          ← 서버사이드 (제출처리, 시트기록, 이메일알림)
├── index.html       ← 웹앱 진입점
├── style.html       ← DESIGN.md 기반 CSS 전체
├── header.html      ← 로고 + 스텝바
├── form.html        ← 5-Step 폼 본문 (팀원 테이블 포함)
├── script.html      ← 클라이언트 JS + google.script.run 연동
└── README.md        ← GAS 배포 가이드
```

### 2-3. 디자인 시스템 (`DESIGN.md` — 사용자 제공)
**The Kinetic Authority** 원칙:
- Primary `#00619c` / Secondary `#3d5d9e`
- Background `#f7f9fc` (cool-tone off-white)
- **No-Line Rule**: 섹션 구분은 배경 톤 전환으로만 (border 금지)
- **Ghost Border**: `outline-variant 15% opacity`만 허용
- 폰트: Manrope (헤더/숫자) + Inter (바디/라벨)
- 버튼: Pill 형태 (`border-radius: 9999px`) + gradient fill
- Glassmorphism: 토프바, 액션바 `backdrop-filter: blur(20px)`
- Chips: `secondary-container` 배경, 완전한 pill roundness

### 2-4. 화면 스펙 (ENP 내부 시스템 UI 패턴 기반)
스크린샷으로 확인된 실제 ENP 내부 시스템 레이아웃:
- 좌측 사이드바 150px + 상단 토프바 46px + 스텝바 52px
- 콘텐츠 영역: max-width 820px, background #f2f5f9
- 하단 진행률 바 고정
- 패널 카드 구조 (패널 헤더 bg: #f0f5fb, 패널 바디: 흰색)

---

## 3. 핵심 도메인 데이터

### 3-1. 부서 구조 (2026.03 기준)

```typescript
const DEPARTMENTS = {
  '개발생산부':           { total: 10, mgr: 1, mid: 5, junior: 1, staff: 2, field: 4 },
  '연구설계부':           { total: 10, mgr: 2, mid: 2, junior: 3, staff: 0, field: 0 },
  '연구개발부':           { total: 9,  mgr: 1, mid: 2, junior: 2, staff: 3, field: 0 },
  '커미셔닝/현장관리부':  { total: 8,  mgr: 1, mid: 2, junior: 2, staff: 3, field: 6 },
  '영업행정관리부':       { total: 5,  mgr: 1, mid: 1, junior: 2, staff: 0, field: 0 },
  '경영지원부':           { total: 1,  mgr: 0, mid: 0, junior: 1, staff: 0, field: 0 },
};
```

### 3-2. 팀원 데이터 (인사대장 기준, 부서별)

```typescript
const MEMBERS: Record<string, Member[]> = {
  '개발생산부': [
    { name: '김용옥', rank: '부장',    title: '부장',        years: '4.0년' },
    { name: '이은진', rank: '과장',    title: '관리감독자',   years: '3.6년' },
    { name: '최만호', rank: '과장',    title: '과장',        years: '2.5년' },
    { name: '오진숙', rank: '주임',    title: '주임',        years: '1.6년' },
    { name: '유중권', rank: '사원',    title: '사원',        years: '1.3년' },
    { name: '조규정', rank: '과장',    title: '과장',        years: '1.0년' },
    { name: '허성학', rank: '과장',    title: '과장',        years: '0.9년' },
    { name: '김재영', rank: '사원',    title: '',            years: '0.4년' },
    { name: '김종수', rank: '과장',    title: '',            years: '0.2년' },
    { name: '조충신', rank: '과장',    title: '',            years: '0.2년' },
  ],
  '연구설계부': [
    { name: '이현진', rank: '부장',    title: '소방시설공사업', years: '10.0년' },
    { name: '금진영', rank: '대리',    title: '대리',          years: '4.5년' },
    { name: '조형준', rank: '과장',    title: '대리',          years: '3.7년' },
    { name: '문수정', rank: '차장',    title: '소방시설설계업', years: '2.5년' },
    { name: '김효은', rank: '대리',    title: '소방시설설계업', years: '2.4년' },
    { name: '황성민', rank: '대리',    title: '소방시설설계업', years: '1.5년' },
    { name: '정경석', rank: '주임',    title: '소방시설설계업', years: '1.5년' },
    { name: '강주형', rank: '부사장',  title: '소방시설설계업', years: '1.0년' },
    { name: '남무현', rank: '주임',    title: '소방시설설계업', years: '0.8년' },
    { name: '용선영', rank: '대리',    title: '대리',          years: '0.7년' },
  ],
  '연구개발부': [
    { name: '김주현', rank: '과장',     title: '과장',          years: '3.8년' },
    { name: '조홍모', rank: '연구소장', title: '',              years: '2.5년' },
    { name: '지앙',   rank: '사원',     title: '사원',          years: '1.4년' },
    { name: '카이',   rank: '사원',     title: '사원',          years: '1.4년' },
    { name: '홍춘우', rank: '주임',     title: '주임',          years: '1.1년' },
    { name: '박정원', rank: '사원',     title: '소방시설설계업', years: '1.1년' },
    { name: '김홍규', rank: '고문',     title: '',              years: '0.6년' },
    { name: '임충섭', rank: '차장',     title: '',              years: '0.6년' },
    { name: '이재홍', rank: '차장',     title: '',              years: '0.2년' },
  ],
  '커미셔닝/현장관리부': [
    { name: '김인수', rank: '차장',    title: '팀장',          years: '9.5년' },
    { name: '조규현', rank: '대리',    title: '주임',          years: '2.5년' },
    { name: '이동준', rank: '과장',    title: '소방시설공사업', years: '2.2년' },
    { name: '김남현', rank: '주임',    title: '사원',          years: '2.2년' },
    { name: '김태우', rank: '과장',    title: '과장',          years: '1.4년' },
    { name: '정현창', rank: '사원',    title: '',              years: '0.2년' },
    { name: '조은우', rank: '사원',    title: '',              years: '0.1년' },
    { name: '최선량', rank: '사원',    title: '',              years: '0.1년' },
  ],
  '영업행정관리부': [
    { name: '최경산', rank: '총괄부서장', title: '',   years: '7.9년' },
    { name: '손수민', rank: '대리',       title: '대리', years: '4.3년' },
    { name: '염정란', rank: '과장',       title: '과장', years: '4.3년' },
    { name: '정혜령', rank: '대리',       title: '',   years: '3.3년' },
    { name: '장훈기', rank: '이사',       title: '',   years: '0.1년' },
  ],
  '경영지원부': [
    { name: '박진영', rank: '대리', title: '안전보건관리자', years: '6.3년' },
  ],
};
```

### 3-3. 임원 (부서 미배정)
```typescript
const EXECUTIVES = [
  { name: '박재현', rank: '대표이사', years: '9.0년' },
  { name: '최윤교', rank: '이사',     years: '6.4년' },
  { name: '박정휘', rank: '부사장',   title: '소방/승강기안전관리자', years: '8.2년' },
  { name: '박정은', rank: '등기이사', years: '2.0년' },
];
```

---

## 4. DB 스키마 제안 (Supabase PostgreSQL)

GAS 프로토타입의 Google Sheets 구조를 Supabase로 전환:

```sql
-- ① 부서 마스터
CREATE TABLE departments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  parent_id   UUID REFERENCES departments(id),
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ② 직원 (인사대장)
CREATE TABLE employees (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_no        TEXT UNIQUE,           -- 사원번호
  name          TEXT NOT NULL,
  gender        TEXT CHECK (gender IN ('남','여')),
  dept_id       UUID REFERENCES departments(id),
  rank          TEXT,                  -- 직위 (사원/주임/대리/과장/차장/부장)
  title         TEXT,                  -- 직책 (팀장/관리감독자 등)
  joined_at     DATE,
  birth_date    DATE,
  licenses      TEXT[],               -- 자격증 배열
  status        TEXT DEFAULT 'active' CHECK (status IN ('active','leave','resigned')),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ③ TO/PO 현황 (조직별 포지션)
CREATE TABLE to_positions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_id           UUID REFERENCES departments(id),
  position_name     TEXT,              -- 포지션명
  title             TEXT,              -- 직책
  to_count          INTEGER DEFAULT 1, -- 승인된 TO 수
  recruit_status    TEXT DEFAULT '-'
                    CHECK (recruit_status IN ('채용중','입사 예정','공석','보류','-')),
  approval_status   TEXT DEFAULT '🟡 검토중'
                    CHECK (approval_status IN (
                      '🟡 검토중','🔵 승인완료','🔄 채용중','✅ 완료','❌ 반려','⏸ 보류'
                    )),
  target_hire_date  DATE,
  candidate_name    TEXT,
  is_target         BOOLEAN DEFAULT false, -- Target 채용 여부
  linked_to_doc_no  TEXT,               -- 연결 TO 문서번호
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ④ TO 신청 이력 (핵심 테이블)
CREATE TABLE to_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no              TEXT UNIQUE NOT NULL,  -- TO-2026-001
  requested_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  dept_id             UUID REFERENCES departments(id),
  requester_name      TEXT NOT NULL,
  target_rank         TEXT NOT NULL,
  headcount           INTEGER NOT NULL DEFAULT 1,
  employment_type     TEXT NOT NULL CHECK (employment_type IN ('정규직','계약직','파견')),
  contract_start      DATE,
  contract_end        DATE,
  -- 충원 사유
  reasons             TEXT[],               -- 복수 선택
  reason_detail       TEXT,
  project_info        TEXT,
  -- 팀원 현황 (JSONB)
  current_team_work   JSONB,
  -- 신규 업무
  new_work_jd         TEXT,
  required_licenses   TEXT[],
  experience_req      TEXT,
  preferred_cond      TEXT,
  -- 예산/일정
  budget_status       TEXT CHECK (budget_status IN ('기확보','신규 요청')),
  is_urgent           BOOLEAN DEFAULT false,
  desired_hire_date   DATE,
  posting_date        DATE,
  deadline_date       DATE,
  interview_period    TEXT,
  interviewer_name    TEXT,
  remarks             TEXT,
  -- 결재
  approval_status     TEXT DEFAULT '🟡 검토중',
  hr_assignee         TEXT,
  -- 메타
  submitted_by        UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- ⑤ 결재 이력 로그
CREATE TABLE to_request_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID REFERENCES to_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT,
  changed_by  UUID REFERENCES auth.users(id),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_to_requests_dept    ON to_requests(dept_id);
CREATE INDEX idx_to_requests_status  ON to_requests(approval_status);
CREATE INDEX idx_to_requests_urgent  ON to_requests(is_urgent) WHERE is_urgent = true;
CREATE INDEX idx_employees_dept      ON employees(dept_id);
CREATE INDEX idx_employees_status    ON employees(status);

-- RLS
ALTER TABLE to_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees     ENABLE ROW LEVEL SECURITY;
ALTER TABLE to_positions  ENABLE ROW LEVEL SECURITY;

-- 기본 정책: 인증된 사용자만 읽기/쓰기 (추후 role 기반으로 세분화)
CREATE POLICY "authenticated_read"  ON to_requests  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_write" ON to_requests  FOR INSERT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read"  ON employees    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read"  ON to_positions FOR SELECT USING (auth.role() = 'authenticated');
```

---

## 5. 프론트엔드 컴포넌트 구조 제안

Align 프로젝트 기존 구조에 맞춰 아래 경로로 통합 권장:

```
apps/web/src/
└── features/
    └── to-management/
        ├── components/
        │   ├── TORequestWizard.tsx      ← 5-Step 메인 폼 (핵심)
        │   ├── steps/
        │   │   ├── Step1BasicInfo.tsx
        │   │   ├── Step2Reasons.tsx
        │   │   ├── Step3TeamStatus.tsx  ← 팀원 업무 현황 테이블
        │   │   ├── Step4NewWork.tsx
        │   │   └── Step5Review.tsx      ← 탭: 일정/예산 + 최종확인
        │   ├── TOPositionDashboard.tsx  ← TO/PO 현황 대시보드
        │   ├── TORequestHistory.tsx     ← 요청 이력 리스트
        │   └── MemberWorkTable.tsx      ← 팀원 업무 기재 테이블
        ├── hooks/
        │   ├── useTORequest.ts          ← 폼 상태 + 제출 로직
        │   ├── useDepartmentMembers.ts  ← 부서별 팀원 조회
        │   └── useTOPositions.ts        ← TO/PO 현황 조회
        ├── lib/
        │   ├── constants.ts             ← MEMBERS, DEPARTMENTS 데이터
        │   ├── schema.ts                ← Zod 폼 검증 스키마
        │   └── utils.ts                 ← 문서번호 생성 등
        └── types/
            └── index.ts                 ← TORequest, Employee, TOPosition 타입
```

---

## 6. 핵심 UX 플로우 (5-Step Wizard)

```
Step 1: 기본 정보
  → 신청 부서 선택 시 Step 3 팀원 자동 로드 트리거
  → 계약직 선택 시 계약기간 입력 조건부 노출

Step 2: 충원 사유
  → 체크박스 칩 (복수 선택)
  → '법정의무인력' 선택 시 ⚡ Fast-track 배너 노출
  → 커미셔닝/개발생산부 선택 시 수주현황 필수(*)

Step 3: 현재 팀원 업무 현황  ← 이 시스템의 핵심 차별점
  → 부서 선택 시 MEMBERS 데이터에서 팀원 목록 자동 로드
  → 각 팀원 행에 textarea로 현재 담당 업무 직접 기재
  → 최소 1명 기재 시 다음 단계 진행 가능
  → current_team_work JSONB: [{ name, rank, work }]

Step 4: 신규 TO 담당 업무
  → JD 초안 textarea (채용공고에 직접 활용)
  → 자격면허 체크박스 칩
  → 경력조건 라디오 칩

Step 5: 검토·제출
  → 탭: [일정·예산] / [최종 확인]
  → 최종 확인 탭: 전체 입력 요약 + 팀원 업무 현황 테이블
  → 제출 → Supabase to_requests INSERT + 이메일 알림
```

---

## 7. TO/PO 현황 대시보드 컬럼 구조

참조: FASSTO 채용 TO 및 현황 스프레드시트 이미지

| 컬럼 | 설명 |
|------|------|
| 조직 | 대분류 부서명 |
| TO (조직별) | 승인된 총 인원 목표 수 |
| PO (현재원) | 실제 재직 인원 (employees 테이블 COUNT) |
| TO Gap | TO - PO (양수=공석, 음수=과원) |
| 하위팀/리드 | 팀명 + 팀장 성명 |
| 포지션 | 포지션명 |
| 직책 | 팀장/PM 등 |
| 채용 진행 여부 | 채용중 / 입사 예정 / 공석 / 보류 |
| 결재 상태 | 🟡검토중 / 🔵승인완료 / 🔄채용중 / ✅완료 / ❌반려 |
| 대상자 | 확정 채용 대상자 성명 |
| 입사 예정일 | yyyy-mm-dd |
| Target 채용 | O / X |

---

## 8. 이메일 알림 스펙

**트리거**: TO 신청서 제출 시  
**수신**: 경영지원부 담당자 (설정에서 변경 가능)  
**제목 패턴**:
- 일반: `[TO 요청] TO-2026-005 — 개발생산부 과장 1명`
- 긴급: `[긴급] [TO 요청] TO-2026-005 — 커미셔닝/현장관리부 차장 1명`

**본문 포함 항목**: 문서번호, 부서, 직위/인원, 고용형태, 충원사유, 희망입사일, 예산확보여부, 팀원 업무 현황 요약

---

## 9. 결재 상태값 정의

```typescript
type ApprovalStatus =
  | '🟡 검토중'    // 제출 직후 초기값
  | '🔵 승인완료'  // 경영진 승인
  | '🔄 채용중'    // 채용 절차 진행 중
  | '✅ 완료'      // 입사 완료
  | '❌ 반려'      // 반려 (사유 logs 테이블에 기록)
  | '⏸ 보류';     // 일시 보류
```

---

## 10. 회사 로고 (Base64)

ENP 로고 Base64 (JPEG, 9720 bytes):

```
/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCABkAZADASIAAhEBAxEB/8QAHQABAAIDAQEBAQAAAAAAAAAAAAYHAwUIBAIBCf/EAEsQAAEDAwEEBAgICwYHAAAAAAEAAgMEBQYRBxIhMRNBUWEIFCJxgZGT0RUyQkOSobHBIzNERVJygpSy0uEXNVNUVWIWJCVjZMLw...
```

> 전체 Base64 문자열은 `header.html` 파일의 `<img src="data:image/jpeg;base64,...">` 태그에서 확인  
> 다크 배경에서는 `filter: brightness(0) invert(1)` CSS 적용

---

## 11. 참고: DESIGN.md 핵심 규칙 요약

Align 프로젝트에서 TO 관리 화면 개발 시 반드시 준수:

1. **No-Line Rule** — `border` 사용 금지. 배경색 전환으로만 영역 구분
2. **Ghost Border** — 꼭 필요 시 `outline-variant 15% opacity`만
3. **텍스트 색상** — 순수 `#000000` 금지. `#191c1e` (on-surface) 사용
4. **버튼** — 반드시 `border-radius: 9999px` (pill) + gradient fill
5. **Divider 금지** — list item 간 선 금지. 24px whitespace 또는 alternating bg
6. **Typography** — Manrope (숫자, 헤더), Inter (바디, 라벨). 라벨은 uppercase + letter-spacing .05em
7. **Shadow** — `0 16px 32px rgba(25,28,30,0.06)` ambient만 허용. heavy shadow 금지
8. **Glassmorphism** — 네비게이션/오버레이에만 `backdrop-filter: blur(20px)`

---

*이 문서는 GlobalENP-Align 프로젝트의 TO 관리 모듈 통합을 위한 인수인계 목적으로 작성되었습니다.*  
*PRD 전체 내용: `GENP_TO_관리시스템_요구정의서_v1.0.docx` 참조*
