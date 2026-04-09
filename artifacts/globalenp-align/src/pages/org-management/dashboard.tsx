import React from "react";
import { Link } from "wouter";
import { Tree, TreeNode } from "react-organizational-chart";
import { Shell } from "@/components/layout/Shell";
import { useDepartmentOrgChart } from "@/hooks/use-org-management";
import type { EmployeeWithTasks, TOPosition } from "@/hooks/use-org-management";
import { Building2, Users2, Target, Plus, Briefcase, Clock, UserCheck } from "lucide-react";

// ── 트리 노드 타입 ─────────────────────────────────────────────
interface OrgNode {
  type: "employee" | "to";
  employee?: EmployeeWithTasks;
  toPosition?: TOPosition;
  children: OrgNode[];
}

function buildDeptTree(
  employees: EmployeeWithTasks[],
  toPositions: TOPosition[]
): OrgNode[] {
  const nodeMap = new Map<string, OrgNode>();
  for (const emp of employees) {
    nodeMap.set(emp.id, { type: "employee", employee: emp, children: [] });
  }

  const roots: OrgNode[] = [];

  for (const emp of employees) {
    const node = nodeMap.get(emp.id)!;
    const supervisorInDept = emp.supervisor_id && nodeMap.has(emp.supervisor_id);
    if (supervisorInDept) {
      nodeMap.get(emp.supervisor_id!)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const pos of toPositions) {
    roots.push({ type: "to", toPosition: pos, children: [] });
  }

  return roots;
}

// ── 직급별 스타일 ──────────────────────────────────────────────
const GRADE_STYLE: Record<string, { bar: string; avatar: string }> = {
  대표이사:  { bar: "bg-rose-700",   avatar: "bg-rose-700 text-white" },
  이사:      { bar: "bg-rose-600",   avatar: "bg-rose-600 text-white" },
  부사장:    { bar: "bg-rose-600",   avatar: "bg-rose-600 text-white" },
  등기이사:  { bar: "bg-rose-500",   avatar: "bg-rose-500 text-white" },
  연구소장:  { bar: "bg-purple-600", avatar: "bg-purple-600 text-white" },
  고문:      { bar: "bg-amber-600",  avatar: "bg-amber-600 text-white" },
  총괄부서장:{ bar: "bg-slate-700",  avatar: "bg-slate-700 text-white" },
  부장:      { bar: "bg-slate-700",  avatar: "bg-slate-700 text-white" },
  차장:      { bar: "bg-slate-600",  avatar: "bg-slate-600 text-white" },
  과장:      { bar: "bg-blue-600",   avatar: "bg-blue-600 text-white" },
  대리:      { bar: "bg-blue-500",   avatar: "bg-blue-500 text-white" },
  주임:      { bar: "bg-teal-500",   avatar: "bg-teal-500 text-white" },
  사원:      { bar: "bg-teal-400",   avatar: "bg-teal-400 text-white" },
};
const DEFAULT_STYLE = { bar: "bg-slate-400", avatar: "bg-slate-400 text-white" };

// ── 회사 루트 카드 ─────────────────────────────────────────────
function CompanyCard({ totalPO, totalTO }: { totalPO: number; totalTO: number }) {
  return (
    <div className="inline-block">
      <div className="bg-slate-800 text-white rounded-2xl shadow-lg px-6 py-4 min-w-[200px] text-center">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-1">Global ENP</p>
        <p className="text-lg font-bold">글로벌이앤피</p>
        <div className="flex justify-center gap-4 mt-2 text-[11px] text-slate-300">
          <span>현원 <b className="text-white">{totalPO}명</b></span>
          <span>|</span>
          <span>TO <b className="text-white">{totalTO}개</b></span>
        </div>
      </div>
    </div>
  );
}

// ── 부서 카드 ──────────────────────────────────────────────────
function DeptCard({
  name,
  poCount,
  toCount,
}: {
  name: string;
  poCount: number;
  toCount: number;
}) {
  const total = poCount + toCount;
  const fillRate = total > 0 ? Math.round((poCount / total) * 100) : 100;
  const fillColor =
    fillRate === 100 ? "bg-green-400" :
    fillRate >= 75   ? "bg-blue-400"  :
    fillRate >= 50   ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="inline-block">
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-md px-4 py-3 min-w-[150px] text-center hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <p className="text-sm font-bold text-slate-800 leading-tight">{name}</p>
        </div>
        <div className="flex justify-center gap-2 text-[10px] text-slate-500 mb-2">
          <span>PO <b className="text-slate-700">{poCount}</b></span>
          {toCount > 0 && (
            <span className="text-primary font-semibold">TO <b>{toCount}</b></span>
          )}
        </div>
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${fillColor} transition-all`} style={{ width: `${fillRate}%` }} />
        </div>
        <p className="text-[9px] text-slate-400 mt-0.5">{fillRate}% 충원</p>
      </div>
    </div>
  );
}

// ── PO 카드 ────────────────────────────────────────────────────
function POCard({ emp }: { emp: EmployeeWithTasks }) {
  const style = GRADE_STYLE[emp.job_title ?? ""] ?? DEFAULT_STYLE;
  const initials = emp.full_name?.slice(0, 1) ?? "?";

  return (
    <div className="inline-block bg-white rounded-xl border shadow-sm text-left min-w-[130px] max-w-[160px] hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
      <div className={`h-1 w-full rounded-t-xl ${style.bar}`} />
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-7 h-7 rounded-full ${style.avatar} flex items-center justify-center font-bold text-xs shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-xs leading-tight truncate">{emp.full_name}</p>
            <p className="text-[10px] text-slate-500 truncate">{emp.job_title}</p>
          </div>
        </div>
        {emp.job_role && emp.job_role !== emp.job_title && (
          <p className="text-[9px] text-slate-400 truncate">{emp.job_role}</p>
        )}
        {emp.employee_tasks && emp.employee_tasks.length > 0 && (
          <div className="border-t border-slate-100 pt-1.5 mt-1 space-y-0.5">
            {emp.employee_tasks.slice(0, 2).map((t) => (
              <div key={t.id} className="flex items-start gap-1">
                <Briefcase className="w-2.5 h-2.5 text-slate-300 mt-0.5 shrink-0" />
                <span className="text-[9px] text-slate-500 line-clamp-1">{t.task_name}</span>
              </div>
            ))}
            {emp.employee_tasks.length > 2 && (
              <p className="text-[9px] text-slate-400 pl-3">+{emp.employee_tasks.length - 2}개</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TO 카드 ────────────────────────────────────────────────────
const STATUS_INFO: Record<string, { dot: string; bg: string; text: string }> = {
  채용중:      { dot: "bg-green-400 animate-pulse", bg: "bg-green-50",  text: "text-green-700" },
  "입사 예정": { dot: "bg-blue-400",                bg: "bg-blue-50",   text: "text-blue-700" },
  공석:        { dot: "bg-red-400 animate-pulse",   bg: "bg-red-50",    text: "text-red-700" },
  보류:        { dot: "bg-amber-400",               bg: "bg-amber-50",  text: "text-amber-700" },
  "-":         { dot: "bg-slate-300",               bg: "bg-slate-50",  text: "text-slate-500" },
};

function TOCard({ pos }: { pos: TOPosition }) {
  const s = STATUS_INFO[pos.recruit_status] ?? STATUS_INFO["-"];
  return (
    <div className="inline-block min-w-[120px] rounded-xl border-2 border-dashed border-primary/40 bg-white hover:border-primary/60 hover:shadow-sm transition-all duration-150">
      <div className="h-1 w-full rounded-t-xl bg-primary/20" />
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-7 h-7 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center shrink-0">
            <Plus className="w-3 h-3 text-primary/50" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-primary text-xs leading-tight truncate">{pos.position_name}</p>
            <p className="text-[10px] text-slate-400">{pos.title ?? "직급 미정"}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 ${s.bg} ${s.text} rounded px-1.5 py-0.5`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className="text-[9px] font-semibold">{pos.recruit_status}</span>
        </div>
        {pos.target_hire_date && (
          <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
            <Clock className="w-2 h-2" />
            <span>{pos.target_hire_date}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 재귀 트리노드 ──────────────────────────────────────────────
function OrgTreeNode({ node }: { node: OrgNode }) {
  const label =
    node.type === "employee"
      ? <POCard emp={node.employee!} />
      : <TOCard pos={node.toPosition!} />;

  if (node.children.length === 0) {
    return <TreeNode label={label} />;
  }

  return (
    <TreeNode label={label}>
      {node.children.map((child, i) => (
        <OrgTreeNode key={child.employee?.id ?? child.toPosition?.id ?? i} node={child} />
      ))}
    </TreeNode>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────
export default function OrgDashboard() {
  const { data: departments, isLoading, isError } = useDepartmentOrgChart();

  const totalPO = departments?.reduce((a, d) => a + d.employees.length, 0) ?? 0;
  const totalTO = departments?.reduce((a, d) => a + d.toPositions.length, 0) ?? 0;
  const overallFill =
    totalPO + totalTO > 0
      ? Math.round((totalPO / (totalPO + totalTO)) * 100)
      : 100;

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
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">조직/TO 현황판</h1>
            <p className="text-muted-foreground text-sm mt-1">
              전사 조직도 — 현원(PO)과 충원 목표(TO)를 한눈에 확인합니다.
            </p>
          </div>
          <Link href="/org-management/to-request">
            <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              TO 충원 신청
            </button>
          </Link>
        </div>

        {/* 요약 카드 */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-slate-100 rounded-lg">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">총 부서 수</p>
              <p className="text-2xl font-bold">{departments?.length ?? 0}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-slate-100 rounded-lg">
              <Users2 className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">총 현원 (PO)</p>
              <p className="text-2xl font-bold">{totalPO}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4">
            <div className="p-2.5 bg-primary/10 rounded-lg">
              <Target className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">오픈 TO / 충원율</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-primary">{totalTO}개</p>
                <p className="text-sm font-semibold text-slate-500 pb-0.5">{overallFill}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-5 text-xs text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>PO — 재직 중인 구성원</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border-2 border-dashed border-primary/50" />
            <span>TO — 충원 목표 포지션 (공석)</span>
          </div>
        </div>

        {/* 전체 조직도 */}
        {departments && departments.length > 0 ? (
          <div className="bg-[#f8f9fb] rounded-2xl border shadow-sm overflow-x-auto">
            <div className="p-8" style={{ minWidth: "900px" }}>
              <Tree
                lineWidth="2px"
                lineColor="#cbd5e1"
                lineBorderRadius="8px"
                label={<CompanyCard totalPO={totalPO} totalTO={totalTO} />}
              >
                {departments.map((dept) => {
                  const roots = buildDeptTree(dept.employees, dept.toPositions);
                  return (
                    <TreeNode
                      key={dept.departmentName}
                      label={
                        <DeptCard
                          name={dept.departmentName}
                          poCount={dept.employees.length}
                          toCount={dept.toPositions.length}
                        />
                      }
                    >
                      {roots.map((root, i) => (
                        <OrgTreeNode
                          key={root.employee?.id ?? root.toPosition?.id ?? i}
                          node={root}
                        />
                      ))}
                    </TreeNode>
                  );
                })}
              </Tree>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400 border-2 border-dashed rounded-2xl">
            등록된 조직 데이터가 없습니다.
          </div>
        )}
      </div>
    </Shell>
  );
}
