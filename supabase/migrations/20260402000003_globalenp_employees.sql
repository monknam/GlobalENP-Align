-- ============================================================
-- 03_globalenp_employees.sql
-- 글로벌이앤피 직원 48명 시드 (기준일: 2026.03.24)
-- ============================================================

-- employees 테이블 스키마 보정 (구버전 컬럼 누락 시 추가)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS employee_no        TEXT,
  ADD COLUMN IF NOT EXISTS full_name          TEXT,
  ADD COLUMN IF NOT EXISTS gender             TEXT,
  ADD COLUMN IF NOT EXISTS department         TEXT,
  ADD COLUMN IF NOT EXISTS job_title          TEXT,
  ADD COLUMN IF NOT EXISTS job_role           TEXT,
  ADD COLUMN IF NOT EXISTS hire_date          DATE,
  ADD COLUMN IF NOT EXISTS birth_date         DATE,
  ADD COLUMN IF NOT EXISTS phone              TEXT,
  ADD COLUMN IF NOT EXISTS job_group          TEXT,
  ADD COLUMN IF NOT EXISTS is_department_head BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_active          BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS supervisor_id      UUID,
  ADD COLUMN IF NOT EXISTS profile_id         UUID,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();

-- 구버전 name 컬럼 NOT NULL 제약 제거 (앱은 full_name 사용)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'name' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE employees ALTER COLUMN name DROP NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'employees_employee_no_key'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_employee_no_key UNIQUE (employee_no);
  END IF;
END $$;

TRUNCATE eval_assignments, eval_instances, eval_submissions,
         eval_scores, eval_final_results RESTART IDENTITY CASCADE;
TRUNCATE employees RESTART IDENTITY CASCADE;

INSERT INTO employees
  (employee_no, full_name, gender, department, job_title, job_role,
   hire_date, birth_date, phone, job_group, is_department_head)
VALUES

-- ── 개발생산부 (10명) ─────────────────────────────────────────
('220303','김용옥','남','개발생산부','부장','부장',         '2022-03-14','1958-03-20','010-5181-3451','manufacturing',true),
('220802','이은진','여','개발생산부','과장','관리감독자',   '2022-08-08','1987-04-02','010-2345-3146','manufacturing',false),
('230903','최만호','남','개발생산부','과장','과장',         '2023-09-11','1963-07-02','010-5580-1685','manufacturing',false),
('240801','오진숙','여','개발생산부','주임','주임',         '2024-08-22','1974-10-23','010-9255-6784','manufacturing',false),
('241202','유중권','남','개발생산부','사원','사원',         '2024-12-09','2001-05-29','010-5853-0462','manufacturing',false),
('250402','조규정','남','개발생산부','과장','과장',         '2025-04-07','1969-09-24','010-2439-8450','manufacturing',false),
('250403','허성학','남','개발생산부','과장','과장',         '2025-04-14','1978-01-29','010-4451-4041','manufacturing',false),
('251001','김재영','남','개발생산부','사원',null,           '2025-10-13','2003-09-08','010-4900-9334','manufacturing',false),
('260104','김종수','남','개발생산부','과장',null,           '2026-01-26','1981-01-03','010-4746-2754','manufacturing',false),
('260105','조충신','남','개발생산부','과장',null,           '2026-01-26','1986-05-08','010-8062-9258','manufacturing',false),

-- ── 커미셔닝/현장관리부 (9명) ─────────────────────────────────
('161001','김인수','남','커미셔닝/현장관리부','차장',null,                  '2016-09-28','1992-07-17','010-6481-6581','field',true),
('231003','조규현','남','커미셔닝/현장관리부','대리','주임',                '2023-10-04','1996-03-15','010-9621-3285','field',false),
('240101','이동준','남','커미셔닝/현장관리부','과장','소방시설공사업',      '2024-01-02','1987-09-11','010-9999-6760','field',false),
('240102','김남현','남','커미셔닝/현장관리부','주임','사원',                '2024-01-08','1995-08-22','010-4163-0568','field',false),
('241101','김태우','남','커미셔닝/현장관리부','과장','과장',                '2024-11-01','1982-02-25','010-5217-8739','field',false),
('260102','정현창','남','커미셔닝/현장관리부','사원',null,                  '2026-01-05','1999-01-12','010-8521-6509','field',false),
('260103','이호준','남','커미셔닝/현장관리부','주임',null,                  '2026-01-05','1996-01-06','010-5110-5911','field',false),
('260201','조은우','남','커미셔닝/현장관리부','사원',null,                  '2026-02-02','1998-09-07','010-4660-3412','field',false),
('260202','최선량','남','커미셔닝/현장관리부','사원',null,                  '2026-02-10','1992-04-01','010-5272-5966','field',false),

-- ── 연구설계부 (10명) ─────────────────────────────────────────
('160301','이현진','여','연구설계부','부장','소방시설공사업',  '2016-03-07','1985-03-18','010-9966-9723','technical',false),
('210902','금진영','여','연구설계부','대리','대리',            '2021-09-06','1986-04-09','010-9966-8659','technical',false),
('220701','조형준','남','연구설계부','과장','대리',            '2022-07-04','1993-08-12','010-4510-8012','technical',false),
('231001','문수정','여','연구설계부','차장','소방시설설계업',  '2023-10-04','1987-02-17','010-6313-0217','technical',false),
('231101','김효은','여','연구설계부','대리','소방시설설계업',  '2023-11-01','1995-03-04','010-5108-9534','technical',false),
('240902','황성민','남','연구설계부','대리','소방시설설계업',  '2024-09-23','1993-07-24','010-8643-9559','technical',false),
('240903','정경석','남','연구설계부','주임','소방시설설계업',  '2024-09-23','1994-09-17','010-8238-3578','technical',false),
('250401','강주형','남','연구설계부','부사장','소방시설설계업','2025-04-01','1968-07-13','010-9151-0887','technical',true),
('250602','남무현','남','연구설계부','주임','소방시설설계업',  '2025-06-09','1993-02-27','010-9393-9579','technical',false),
('250701','용선영','여','연구설계부','대리','대리',            '2025-07-01','1989-07-07','010-9104-1410','technical',false),

-- ── 영업행정관리부 (5명) ──────────────────────────────────────
('180501','최경산','남','영업행정관리부','총괄부서장',null,  '2018-05-10','1959-10-06','010-5714-7613','admin',true),
('211101','손수민','여','영업행정관리부','대리','주임',      '2021-11-24','1995-03-27','010-4339-4892','admin',false),
('211201','염정란','여','영업행정관리부','과장','과장',      '2021-12-01','1984-03-22','010-9177-4072','admin',false),
('221201','정혜령','여','영업행정관리부','대리',null,        '2022-12-05','1985-12-08','010-8867-5890','admin',false),
('260301','장훈기','남','영업행정관리부','이사',null,        '2026-03-03','1977-01-01','010-5252-4461','admin',false),

-- ── 경영지원부 (1명) ──────────────────────────────────────────
('191203','박진영','여','경영지원부','대리','안전보건관리자','2019-12-03','1992-10-14','010-8683-2878','admin',false),

-- ── 연구개발부 (9명) ──────────────────────────────────────────
('220601','김주현','남','연구개발부','과장','과장',    '2022-06-02','1987-05-05','010-9742-3331','technical',false),
('230902','조홍모','남','연구개발부','연구소장',null,  '2023-09-11','1979-10-27','010-7721-1907','technical',true),
('241102','지앙',  '남','연구개발부','사원','사원',    '2024-11-12','1995-07-22','010-5946-1610','technical',false),
('241103','카이',  '남','연구개발부','사원','사원',    '2024-11-12','2000-10-12','010-7619-5332','technical',false),
('250202','홍춘우','남','연구개발부','주임','주임',    '2025-02-03','1993-07-23','010-8664-6093','technical',false),
('250203','박정원','남','연구개발부','사원','소방시설설계업','2025-02-03','1999-03-29','010-5503-8947','technical',false),
('250801','김홍규','남','연구개발부','고문',null,      '2025-08-01','1961-12-30','010-8289-9935','technical',false),
('250901','임충섭','남','연구개발부','차장',null,      '2025-09-01','1982-11-02','010-3109-9884','technical',false),
('251201','이재홍','남','연구개발부','차장',null,      '2025-12-29','1983-11-09','010-9425-5345','technical',false),

-- ── 임원/기타 (4명) ───────────────────────────────────────────
('130801','박재현','남',null,'대표이사',null,                              '2017-04-10','1950-03-30','010-9030-8174','executive',false),
('130802','최윤교','여',null,'이사',null,                                  '2019-11-07','1956-02-15','010-2471-8174','executive',false),
('180101','박정휘','남',null,'부사장','소방/승강기안전관리자',             '2018-01-04','1982-02-14','010-3430-3991','executive',false),
('240402','박정은','여',null,'등기이사',null,                              '2024-04-09','1980-03-01',null,            'executive',false);

-- ── supervisor_id 연결 ────────────────────────────────────────
-- 개발생산부: 김용옥(220303)이 부서장
UPDATE employees SET supervisor_id = (SELECT id FROM employees WHERE employee_no = '220303')
WHERE department = '개발생산부' AND employee_no != '220303';

-- 커미셔닝/현장관리부: 김인수(161001)가 부서장
UPDATE employees SET supervisor_id = (SELECT id FROM employees WHERE employee_no = '161001')
WHERE department = '커미셔닝/현장관리부' AND employee_no != '161001';

-- 연구설계부: 강주형(250401)이 부서장
UPDATE employees SET supervisor_id = (SELECT id FROM employees WHERE employee_no = '250401')
WHERE department = '연구설계부' AND employee_no != '250401';

-- 영업행정관리부: 최경산(180501)이 부서장
UPDATE employees SET supervisor_id = (SELECT id FROM employees WHERE employee_no = '180501')
WHERE department = '영업행정관리부' AND employee_no != '180501';

-- 경영지원부: 박정휘(180101)가 담당 부사장 (임원이지만 직속 상사)
UPDATE employees SET supervisor_id = (SELECT id FROM employees WHERE employee_no = '180101')
WHERE department = '경영지원부';

-- 연구개발부: 조홍모(230902)가 부서장
UPDATE employees SET supervisor_id = (SELECT id FROM employees WHERE employee_no = '230902')
WHERE department = '연구개발부' AND employee_no != '230902';

-- 확인
SELECT department, count(*) as cnt,
       sum(CASE WHEN is_department_head THEN 1 ELSE 0 END) as heads
FROM employees
GROUP BY department
ORDER BY department;
