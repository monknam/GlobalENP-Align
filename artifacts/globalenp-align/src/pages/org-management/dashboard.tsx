import React from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useDepartmentOrgChart } from "@/hooks/use-org-management";
import type { EmployeeWithTasks, TOPosition } from "@/hooks/use-org-management";
import { Building2, Users2, Target, Plus, Clock } from "lucide-react";

// ── 직급별 색상 ────────────────────────────────────────────────
const GRADE_COLOR: Record<string, string> = {
  대표이사:   "bg-rose-700",
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

// ── TO 상태 색상 ───────────────────────────────────────────────
const TO_STATUS: Record<string, { dot: string; text: string }> = {
  채용중:      { dot: "bg-green-400 animate-pulse", text: "text-green-700" },
  "입사 예정": { dot: "bg-blue-400",                text: "text-blue-700" },
  공석:        { dot: "bg-red-400 animate-pulse",   text: "text-red-700" },
  보류:        { dot: "bg-amber-400",               text: "text-amber-700" },
  "-":         { dot: "bg-slate-300",               text: "text-slate-400" },
};

// ── 직원 행 (compact) ──────────────────────────────────────────
function EmpRow({ emp }: { emp: EmployeeWithTasks }) {
  const color = GRADE_COLOR[emp.job_title ?? ""] ?? DEFAULT_COLOR;
  const initials = emp.full_name?.slice(0, 1) ?? "?";
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors group">
      <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-800 leading-tight truncate">{emp.full_name}</p>
        <p className="text-[9px] text-slate-400 truncate leading-tight">{emp.job_title}</p>
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
        <p className="text-[10px] font-semibold text-primary leading-tight truncate">{pos.position_name}</p>
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className={`text-[9px] ${s.text} truncate`}>{pos.recruit_status}</span>
          {pos.target_hire_date && (
            <span className="text-[9px] text-slate-400 truncate">· {pos.target_hire_date}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 부서 컬럼 ──────────────────────────────────────────────────
function DeptColumn({
  dept,
}: {
  dept: { departmentName: string; employees: EmployeeWithTasks[]; toPositions: TOPosition[] };
}) {
  const total = dept.employees.length + dept.toPositions.length;
  const fillRate = total > 0 ? Math.round((dept.employees.length / total) * 100) : 100;
  const fillColor =
    fillRate === 100 ? "bg-green-400" :
    fillRate >= 75   ? "bg-blue-400"  :
    fillRate >= 50   ? "bg-amber-400" : "bg-red-400";

  // 부서장 먼저, 나머지 이름순
  const sorted = [...dept.employees].sort((a, b) => {
    if (a.is_department_head && !b.is_department_head) return -1;
    if (!a.is_department_head && b.is_department_head) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col" style={{ minWidth: "150px", flex: "1 1 0" }}>
      {/* 위쪽 연결선 */}
      <div className="flex justify-center">
        <div className="w-px h-5 bg-slate-300" />
      </div>

      {/* 부서 카드 */}
      <div className="mx-1 rounded-xl border-2 border-slate-200 bg-white shadow-sm px-3 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
          <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{dept.departmentName}</p>
        </div>
        <div className="flex justify-center gap-2 text-[9px] text-slate-500 mb-1.5">
          <span>PO <b className="text-slate-700">{dept.employees.length}</b></span>
          {dept.toPositions.length > 0 && (
            <span className="text-primary font-semibold">TO <b>{dept.toPositions.length}</b></span>
          )}
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${fillRate}%` }} />
        </div>
      </div>

      {/* 아래쪽 연결선 */}
      <div className="flex justify-center">
        <div className="w-px h-4 bg-slate-300" />
      </div>

      {/* 직원 목록 */}
      <div className="mx-1 rounded-xl border border-slate-100 bg-white shadow-sm p-1.5 space-y-0.5 flex-1">
        {sorted.map((emp) => (
          <EmpRow key={emp.id} emp={emp} />
        ))}
        {dept.toPositions.map((pos) => (
          <TORow key={pos.id} pos={pos} />
        ))}
        {sorted.length === 0 && dept.toPositions.length === 0 && (
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
            <div className="p-2 bg-slate-100 rounded-lg shrink-0">
              <Building2 className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">부서 수</p>
              <p className="text-xl font-bold">{departments?.length ?? 0}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg shrink-0">
              <Users2 className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">총 현원(PO)</p>
              <p className="text-xl font-bold">{totalPO}</p>
            </div>
          </div>
          <div className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground">TO / 충원율</p>
              <div className="flex items-end gap-1.5">
                <p className="text-xl font-bold text-primary">{totalTO}개</p>
                <p className="text-xs font-semibold text-slate-500 pb-0.5">{overallFill}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 전사 조직도 */}
        {departments && departments.length > 0 ? (
          <div className="bg-[#f8f9fb] rounded-2xl border shadow-sm p-5">

            {/* 회사 루트 */}
            <div className="flex justify-center mb-0">
              <div className="bg-slate-800 text-white rounded-2xl shadow-lg px-8 py-3 text-center inline-flex flex-col items-center">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Global ENP</p>
                <p className="text-base font-bold leading-tight">글로벌이앤피</p>
                <div className="flex gap-4 mt-1 text-[10px] text-slate-400">
                  <span>현원 <b className="text-white">{totalPO}명</b></span>
                  <span>TO <b className="text-white">{totalTO}개</b></span>
                </div>
              </div>
            </div>

            {/* 회사 → 수평 분기선 */}
            <div className="relative flex flex-col items-center">
              {/* 수직선 */}
              <div className="w-px h-5 bg-slate-300" />
              {/* 수평선 */}
              <div className="w-full h-px bg-slate-300 relative" />
            </div>

            {/* 부서 컬럼들 */}
            <div className="flex items-start gap-0" style={{ alignItems: "flex-start" }}>
              {departments.map((dept) => (
                <DeptColumn key={dept.departmentName} dept={dept} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 border-2 border-dashed rounded-2xl">
            등록된 조직 데이터가 없습니다.
          </div>
        )}

        {/* 범례 */}
        <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-600 inline-block" /> 임원</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-slate-700 inline-block" /> 부장/차장</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> 과장/대리</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-teal-400 inline-block" /> 주임/사원</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border-2 border-dashed border-primary/50 inline-block" /> TO(공석)</span>
        </div>
      </div>
    </Shell>
  );
}
