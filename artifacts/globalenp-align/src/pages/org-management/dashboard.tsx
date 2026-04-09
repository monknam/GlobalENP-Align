import React from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useDepartmentOrgChart } from "@/hooks/use-org-management";
import type { EmployeeWithTasks, TOPosition } from "@/hooks/use-org-management";
import { Building2, Users2, Target, Plus, Clock } from "lucide-react";

// ── 직급별 색상 ────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  대표이사:   "bg-rose-800",
  이사:       "bg-rose-600",
  부사장:     "bg-rose-600",
  등기이사:   "bg-rose-500",
  연구소장:   "bg-purple-600",
  고문:       "bg-amber-600",
  총괄부서장: "bg-slate-700",
  부장:       "bg-slate-700",
  차장:       "bg-slate-600",
  과장:       "bg-blue-600",
  대리:       "bg-blue-500",
  주임:       "bg-teal-500",
  사원:       "bg-teal-400",
};
const DEFAULT_COLOR = "bg-slate-300";

const TO_STATUS: Record<string, { dot: string; text: string }> = {
  채용중:      { dot: "bg-green-400 animate-pulse", text: "text-green-700" },
  "입사 예정": { dot: "bg-blue-400",                text: "text-blue-700" },
  공석:        { dot: "bg-red-400 animate-pulse",   text: "text-red-700" },
  보류:        { dot: "bg-amber-400",               text: "text-amber-700" },
  "-":         { dot: "bg-slate-300",               text: "text-slate-400" },
};

// ── 임원 카드 (크게) ───────────────────────────────────────────
function ExecCard({
  emp,
  size = "md",
}: {
  emp: EmployeeWithTasks | null;
  size?: "lg" | "md" | "sm";
}) {
  if (!emp) return null;
  const color = GRADE_COLOR[emp.job_title ?? ""] ?? DEFAULT_COLOR;
  const initials = emp.full_name?.slice(0, 1) ?? "?";

  if (size === "lg") {
    return (
      <div className="inline-flex flex-col items-center">
        <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center text-white text-lg font-bold shadow mb-1`}>
          {initials}
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-900 leading-tight">{emp.full_name}</p>
          <p className="text-[10px] text-slate-500">{emp.job_title}</p>
        </div>
      </div>
    );
  }
  if (size === "sm") {
    return (
      <div className="inline-flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold shadow mb-0.5`}>
          {initials}
        </div>
        <div className="text-center">
          <p className="text-[11px] font-bold text-slate-800 leading-tight">{emp.full_name}</p>
          <p className="text-[9px] text-slate-400">{emp.job_title}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="inline-flex flex-col items-center">
      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-bold shadow mb-1`}>
        {initials}
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-slate-900 leading-tight">{emp.full_name}</p>
        <p className="text-[10px] text-slate-500">{emp.job_title}</p>
      </div>
    </div>
  );
}

// ── 플레이스홀더 직원 (DB 미등록) ─────────────────────────────
function PlaceholderCard({ name, title }: { name: string; title: string }) {
  const color = GRADE_COLOR[title] ?? DEFAULT_COLOR;
  const initials = name.slice(0, 1);
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-dashed border-slate-200">
      <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
        {initials}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-700 leading-tight">{name}</p>
        <p className="text-[9px] text-slate-400">{title}</p>
      </div>
    </div>
  );
}

// ── 직원 행 ────────────────────────────────────────────────────
function EmpRow({ emp }: { emp: EmployeeWithTasks }) {
  const color = GRADE_COLOR[emp.job_title ?? ""] ?? DEFAULT_COLOR;
  const initials = emp.full_name?.slice(0, 1) ?? "?";
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors">
      <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-800 leading-tight truncate">{emp.full_name}</p>
        <p className="text-[9px] text-slate-400 truncate">{emp.job_title}</p>
      </div>
    </div>
  );
}

// ── TO 행 ──────────────────────────────────────────────────────
function TORow({ pos }: { pos: TOPosition }) {
  const s = TO_STATUS[pos.recruit_status] ?? TO_STATUS["-"];
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-dashed border-primary/30 bg-primary/5 mt-0.5">
      <div className="w-5 h-5 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center shrink-0">
        <Plus className="w-2.5 h-2.5 text-primary/50" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-primary truncate">{pos.position_name}</p>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          <span className={`text-[9px] ${s.text}`}>{pos.recruit_status}</span>
        </div>
      </div>
    </div>
  );
}

// ── 수직 연결선 ────────────────────────────────────────────────
function VLine({ h = 5 }: { h?: number }) {
  return <div className="flex justify-center"><div className={`w-px bg-slate-300`} style={{ height: `${h * 4}px` }} /></div>;
}

// ── 부서 컬럼 ──────────────────────────────────────────────────
function DeptCol({
  name,
  employees,
  toPositions,
  excludeNames = [],
}: {
  name: string;
  employees: EmployeeWithTasks[];
  toPositions: TOPosition[];
  excludeNames?: string[];
}) {
  const filtered = employees
    .filter((e) => !excludeNames.includes(e.full_name ?? ""))
    .sort((a, b) => {
      if (a.is_department_head && !b.is_department_head) return -1;
      if (!a.is_department_head && b.is_department_head) return 1;
      return 0;
    });

  const total = filtered.length + toPositions.length;
  const fillRate = total > 0 ? Math.round((filtered.length / total) * 100) : 100;
  const fillColor =
    fillRate === 100 ? "bg-green-400" :
    fillRate >= 75   ? "bg-blue-400"  :
    fillRate >= 50   ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex flex-col" style={{ flex: "1 1 0", minWidth: "130px" }}>
      {/* 연결선 위 */}
      <VLine h={4} />

      {/* 부서 헤더 */}
      <div className="mx-1 rounded-xl border-2 border-slate-200 bg-white shadow-sm px-2 py-2 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
          <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{name}</p>
        </div>
        <div className="flex justify-center gap-2 text-[9px] text-slate-400 mb-1">
          <span>PO <b className="text-slate-600">{filtered.length}</b></span>
          {toPositions.length > 0 && (
            <span className="text-primary">TO <b>{toPositions.length}</b></span>
          )}
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${fillRate}%` }} />
        </div>
      </div>

      {/* 연결선 아래 */}
      <VLine h={3} />

      {/* 직원 목록 */}
      <div className="mx-1 rounded-xl border border-slate-100 bg-white shadow-sm p-1.5 space-y-0.5 flex-1">
        {filtered.map((emp) => <EmpRow key={emp.id} emp={emp} />)}
        {toPositions.map((pos) => <TORow key={pos.id} pos={pos} />)}
        {filtered.length === 0 && toPositions.length === 0 && (
          <p className="text-[10px] text-slate-400 text-center py-3">구성원 없음</p>
        )}
      </div>
    </div>
  );
}

// ── 메인 ───────────────────────────────────────────────────────
export default function OrgDashboard() {
  const { data: departments, isLoading, isError } = useDepartmentOrgChart();

  const totalPO = departments?.reduce((a, d) => a + d.employees.length, 0) ?? 0;
  const totalTO = departments?.reduce((a, d) => a + d.toPositions.length, 0) ?? 0;
  const overallFill =
    totalPO + totalTO > 0 ? Math.round((totalPO / (totalPO + totalTO)) * 100) : 100;

  // 전체 직원 플랫 맵
  const allEmp = React.useMemo(() => {
    const map = new Map<string, EmployeeWithTasks>();
    departments?.forEach((d) => d.employees.forEach((e) => map.set(e.full_name ?? "", e)));
    return map;
  }, [departments]);

  const find = (name: string) => allEmp.get(name) ?? null;

  // 부서 데이터 찾기
  const getDept = (name: string) =>
    departments?.find((d) => d.departmentName === name) ?? {
      departmentName: name,
      employees: [],
      toPositions: [],
    };

  if (isLoading) {
    return (
      <Shell>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Shell>
    );
  }

  if (isError) {
    return (
      <Shell>
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">
          로딩 중 오류가 발생했습니다.
        </div>
      </Shell>
    );
  }

  const ceo      = find("박재현");
  const vp       = find("박정휘");
  const board1   = find("최윤교");
  const board2   = find("박정은");

  const deptYeongup    = getDept("영업행정관리부");
  const deptField      = getDept("커미셔닝/현장관리부");
  const deptDev        = getDept("개발생산부");
  const deptDesign     = getDept("연구설계부");
  const deptRnD        = getDept("연구개발부");
  const deptMgmt       = getDept("경영지원부");

  // 임원진은 부서 컬럼에서 제외
  const execNames = ["박재현", "최윤교", "박정휘", "박정은"];

  return (
    <Shell>
      <div className="space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight">전사 조직 현황</h1>
            <p className="text-muted-foreground text-xs mt-0.5">현원(PO)과 충원 목표(TO) 통합 조직도</p>
          </div>
          <Link href="/org-management/to-request">
            <button className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" />
              TO 충원 신청
            </button>
          </Link>
        </div>

        {/* 요약 */}
        <div className="grid gap-3 grid-cols-3">
          <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg shrink-0"><Building2 className="w-4 h-4 text-slate-600" /></div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">부서 수</p>
              <p className="text-xl font-bold">{departments?.length ?? 0}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg shrink-0"><Users2 className="w-4 h-4 text-slate-600" /></div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">총 현원(PO)</p>
              <p className="text-xl font-bold">{totalPO}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0"><Target className="w-4 h-4 text-primary" /></div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">TO / 충원율</p>
              <div className="flex items-end gap-1.5">
                <p className="text-xl font-bold text-primary">{totalTO}개</p>
                <p className="text-xs font-semibold text-slate-500 pb-0.5">{overallFill}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── 전사 조직도 ──────────────────────────────────────── */}
        <div className="bg-[#f8f9fb] rounded-2xl border shadow-sm p-5 overflow-x-auto">
          <div style={{ minWidth: "900px" }}>

            {/* ── Row 1: 대표이사 + 이사진 ── */}
            <div className="flex items-start justify-center gap-8">
              {/* 회사 + CEO */}
              <div className="flex flex-col items-center">
                <div className="bg-slate-800 text-white rounded-2xl shadow-lg px-6 py-3 text-center inline-flex flex-col items-center min-w-[180px]">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Global ENP</p>
                  <p className="text-sm font-bold leading-tight">글로벌이앤피</p>
                  {ceo && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-600 w-full justify-center">
                      <div className="w-7 h-7 rounded-full bg-rose-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {ceo.full_name?.slice(0, 1)}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white leading-tight">{ceo.full_name}</p>
                        <p className="text-[9px] text-slate-400">{ceo.job_title}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 이사진 (별도 조직) */}
              <div className="flex flex-col items-center mt-3">
                <p className="text-[9px] text-slate-400 mb-2 font-semibold uppercase tracking-wider">이사진</p>
                <div className="flex gap-4 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
                  {board1 && <ExecCard emp={board1} size="sm" />}
                  {board2 && <ExecCard emp={board2} size="sm" />}
                </div>
              </div>
            </div>

            {/* ── CEO → VP 연결선 ── */}
            <VLine h={5} />

            {/* ── Row 2: 부사장 ── */}
            <div className="flex justify-center">
              {vp ? (
                <div className="bg-white rounded-xl border-2 border-rose-200 shadow-sm px-5 py-3 text-center inline-flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-rose-600 flex items-center justify-center text-white font-bold mb-1 shadow">
                    {vp.full_name?.slice(0, 1)}
                  </div>
                  <p className="text-xs font-bold text-slate-900">{vp.full_name}</p>
                  <p className="text-[10px] text-slate-500">{vp.job_title}</p>
                </div>
              ) : (
                <div className="text-xs text-slate-400">부사장 데이터 없음</div>
              )}
            </div>

            {/* ── VP → 부서 분기선 ── */}
            <VLine h={4} />
            <div className="w-full h-px bg-slate-300" />

            {/* ── Row 3: 부서 컬럼들 ── */}
            <div className="flex items-start gap-1">

              {/* 관리부 그룹 */}
              <div className="flex flex-col" style={{ flex: "2 1 0" }}>
                {/* 연결선 + 그룹 헤더 */}
                <VLine h={3} />
                <div className="mx-1 bg-slate-100 rounded-xl border border-slate-200 px-3 py-1.5 text-center">
                  <p className="text-[11px] font-bold text-slate-600">관리부</p>
                </div>
                {/* 관리부 → 2개 부서 분기 */}
                <div className="flex mt-0">
                  <DeptCol
                    name="영업행정관리부"
                    employees={deptYeongup.employees}
                    toPositions={deptYeongup.toPositions}
                    excludeNames={execNames}
                  />
                  <DeptCol
                    name="커미셔닝/현장관리부"
                    employees={deptField.employees}
                    toPositions={deptField.toPositions}
                    excludeNames={execNames}
                  />
                </div>
              </div>

              {/* 개발생산부 */}
              <DeptCol
                name="개발생산부"
                employees={deptDev.employees}
                toPositions={deptDev.toPositions}
                excludeNames={execNames}
              />

              {/* 연구설계부 */}
              <DeptCol
                name="연구설계부"
                employees={deptDesign.employees}
                toPositions={deptDesign.toPositions}
                excludeNames={execNames}
              />

              {/* 연구개발부 */}
              <DeptCol
                name="연구개발부"
                employees={deptRnD.employees}
                toPositions={deptRnD.toPositions}
                excludeNames={execNames}
              />

              {/* 경영관리부 */}
              <div className="flex flex-col" style={{ flex: "1 1 0", minWidth: "130px" }}>
                <VLine h={4} />
                <div className="mx-1 rounded-xl border-2 border-slate-200 bg-white shadow-sm px-2 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <p className="text-[11px] font-bold text-slate-800">경영관리부</p>
                  </div>
                </div>
                <VLine h={3} />
                <div className="mx-1 rounded-xl border border-slate-100 bg-white shadow-sm p-1.5 space-y-0.5 flex-1">
                  {/* 남기용: DB 미등록 → placeholder */}
                  <PlaceholderCard name="남기용" title="부장" />
                  {/* 박진영: 경영지원부에서 가져옴 */}
                  {deptMgmt.employees
                    .filter((e) => !execNames.includes(e.full_name ?? ""))
                    .map((e) => <EmpRow key={e.id} emp={e} />)}
                  {deptMgmt.toPositions.map((p) => <TORow key={p.id} pos={p} />)}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-700 inline-block" /> 임원</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-700 inline-block" /> 부장/차장</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> 과장/대리</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-teal-400 inline-block" /> 주임/사원</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-dashed border-primary/50 inline-block" /> TO(공석)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-dashed border-slate-300 inline-block" /> 미등록(임시)</span>
        </div>
      </div>
    </Shell>
  );
}
