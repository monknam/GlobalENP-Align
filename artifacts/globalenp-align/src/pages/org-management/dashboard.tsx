import React, { useState } from "react";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useDepartmentOrgChart } from "@/hooks/use-org-management";
import type { EmployeeWithTasks, TOPosition } from "@/hooks/use-org-management";
import { Building2, Users2, Target, Plus, ChevronDown, ChevronUp, Briefcase, Clock } from "lucide-react";

// ── PO 카드 (현원) ─────────────────────────────────────────────
function POCard({ emp }: { emp: EmployeeWithTasks }) {
  const initials = emp.full_name?.slice(0, 1) ?? "?";
  const colorMap: Record<string, string> = {
    부장: "bg-slate-700", 차장: "bg-slate-600", 과장: "bg-blue-600",
    대리: "bg-blue-500", 주임: "bg-teal-500", 사원: "bg-teal-400",
    연구소장: "bg-purple-600", 고문: "bg-amber-600", 이사: "bg-rose-600",
    대표이사: "bg-rose-700", 부사장: "bg-rose-600", 등기이사: "bg-rose-500",
  };
  const avatarBg = colorMap[emp.job_title ?? ""] ?? "bg-slate-500";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-150 overflow-hidden">
      {/* 상단 색상 바 */}
      <div className={`h-1 w-full ${avatarBg}`} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* 아바타 */}
          <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="font-bold text-slate-900 text-sm truncate">{emp.full_name}</p>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded shrink-0">PO</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{emp.job_title ?? "직함 없음"}</p>
            {emp.job_role && emp.job_role !== emp.job_title && (
              <p className="text-[11px] text-slate-400 truncate">{emp.job_role}</p>
            )}
          </div>
        </div>

        {/* 담당 업무 */}
        {emp.employee_tasks && emp.employee_tasks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">담당 업무</p>
            <ul className="space-y-1">
              {emp.employee_tasks.slice(0, 2).map((t) => (
                <li key={t.id} className="flex items-start gap-1.5">
                  <Briefcase className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-slate-600 line-clamp-1">{t.task_name}</span>
                </li>
              ))}
              {emp.employee_tasks.length > 2 && (
                <li className="text-[10px] text-slate-400 pl-4.5">+{emp.employee_tasks.length - 2}개 더</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TO 카드 (공석/충원 예정) ────────────────────────────────────
const STATUS_STYLE: Record<string, { dot: string; label: string; bg: string; text: string }> = {
  "채용중":    { dot: "bg-green-400 animate-pulse", label: "채용중",    bg: "bg-green-50",  text: "text-green-700" },
  "입사 예정": { dot: "bg-blue-400",                label: "입사 예정", bg: "bg-blue-50",   text: "text-blue-700" },
  "공석":      { dot: "bg-red-400 animate-pulse",   label: "공석",      bg: "bg-red-50",    text: "text-red-700" },
  "보류":      { dot: "bg-amber-400",               label: "보류",      bg: "bg-amber-50",  text: "text-amber-700" },
  "-":         { dot: "bg-slate-300",               label: "미정",      bg: "bg-slate-50",  text: "text-slate-500" },
};

function TOCard({ pos }: { pos: TOPosition }) {
  const s = STATUS_STYLE[pos.recruit_status] ?? STATUS_STYLE["-"];

  return (
    <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/[0.02] hover:border-primary/60 hover:bg-primary/[0.04] transition-all duration-150 overflow-hidden">
      {/* 상단 색상 바 */}
      <div className="h-1 w-full bg-primary/30" />
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* 공석 아이콘 */}
          <div className="w-9 h-9 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center shrink-0 bg-primary/5">
            <Plus className="w-4 h-4 text-primary/60" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <p className="font-bold text-primary text-sm truncate">{pos.position_name}</p>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">TO</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{pos.title ?? "직급 미정"}</p>
          </div>
        </div>

        {/* 상태 배지 */}
        <div className={`mt-3 flex items-center gap-1.5 ${s.bg} ${s.text} rounded-lg px-2.5 py-1.5`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className="text-[11px] font-semibold">{s.label}</span>
          {pos.target_hire_date && (
            <>
              <span className="text-[10px] opacity-60 mx-1">·</span>
              <Clock className="w-3 h-3 opacity-60 shrink-0" />
              <span className="text-[11px] opacity-80">목표 {pos.target_hire_date}</span>
            </>
          )}
        </div>

        {/* 투입 예정 업무 */}
        {pos.required_tasks && pos.required_tasks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-primary/10">
            <p className="text-[10px] font-semibold text-primary/50 uppercase tracking-wider mb-1.5">투입 예정 업무</p>
            <div className="flex flex-wrap gap-1">
              {pos.required_tasks.map((rt, i) => (
                <span key={i} className="text-[10px] bg-primary/8 text-primary/70 border border-primary/15 px-2 py-0.5 rounded-full">
                  {rt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 부서 섹션 ──────────────────────────────────────────────────
function DepartmentSection({
  dept,
}: {
  dept: { departmentName: string; employees: EmployeeWithTasks[]; toPositions: TOPosition[] };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const total = dept.employees.length + dept.toPositions.length;
  const fillRate = total > 0 ? Math.round((dept.employees.length / total) * 100) : 100;
  const fillColor = fillRate === 100 ? "bg-green-400" : fillRate >= 75 ? "bg-blue-400" : fillRate >= 50 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* 부서 헤더 */}
      <button
        className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <h3 className="text-base font-bold text-slate-800">{dept.departmentName}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
              현원(PO) <b>{dept.employees.length}명</b>
            </span>
            {dept.toPositions.length > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                TO <b>{dept.toPositions.length}개</b>
              </span>
            )}
          </div>
        </div>

        {/* 충원율 바 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block">
            <p className="text-[10px] text-slate-400 mb-1 text-right">충원율</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${fillColor}`}
                  style={{ width: `${fillRate}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-600 w-9 text-right">{fillRate}%</span>
            </div>
          </div>
          {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* 카드 그리드 */}
      {!collapsed && (
        <div className="px-6 pb-6 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 bg-slate-50/60 pt-4 border-t">
          {dept.employees.map((emp) => (
            <POCard key={emp.id} emp={emp} />
          ))}
          {dept.toPositions.map((pos) => (
            <TOCard key={pos.id} pos={pos} />
          ))}
          {dept.toPositions.length === 0 && dept.employees.length > 0 && (
            <Link href="/org-management/to-request">
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 py-8 text-slate-400 hover:text-slate-500 min-h-[120px]">
                <Plus className="w-5 h-5" />
                <span className="text-xs font-medium">TO 충원 신청</span>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function OrgDashboard() {
  const { data: departments, isLoading, isError } = useDepartmentOrgChart();

  const totalPO = departments?.reduce((acc, d) => acc + d.employees.length, 0) ?? 0;
  const totalTO = departments?.reduce((acc, d) => acc + d.toPositions.length, 0) ?? 0;
  const overallFill = totalPO + totalTO > 0 ? Math.round((totalPO / (totalPO + totalTO)) * 100) : 100;

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
        <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">
          로딩 중 오류가 발생했습니다.
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">조직/TO 현황판</h1>
            <p className="text-muted-foreground text-sm mt-1">부서별 현원(PO)과 충원 목표(TO)를 한눈에 파악합니다.</p>
          </div>
          <Link href="/org-management/to-request">
            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              TO 충원 신청
            </button>
          </Link>
        </div>

        {/* 요약 카드 3개 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-slate-100 rounded-lg"><Building2 className="w-5 h-5 text-slate-600" /></div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">총 부서 수</p>
              <p className="text-2xl font-bold">{departments?.length ?? 0}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-slate-100 rounded-lg"><Users2 className="w-5 h-5 text-slate-600" /></div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">총 현원 (PO)</p>
              <p className="text-2xl font-bold">{totalPO}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-lg"><Target className="w-5 h-5 text-primary" /></div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground">오픈 TO / 전사 충원율</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-primary">{totalTO}개</p>
                <p className="text-sm font-semibold text-slate-500 pb-0.5">{overallFill}% 충원</p>
              </div>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-slate-700" />
            <span>PO — 현재 재직 중인 구성원</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border-2 border-dashed border-primary/50 bg-primary/5" />
            <span>TO — 충원 목표 포지션</span>
          </div>
        </div>

        {/* 부서별 섹션 */}
        <div className="space-y-4">
          {departments?.map((dept) => (
            <DepartmentSection key={dept.departmentName} dept={dept} />
          ))}
          {departments?.length === 0 && (
            <div className="text-center py-16 text-slate-400 border-2 border-dashed rounded-2xl">
              등록된 조직 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
