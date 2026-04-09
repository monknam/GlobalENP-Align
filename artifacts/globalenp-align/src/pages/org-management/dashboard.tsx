import React, { useState } from "react";
import { Link } from "wouter";
import { Tree, TreeNode } from "react-organizational-chart";
import { Shell } from "@/components/layout/Shell";
import { useDepartmentOrgChart } from "@/hooks/use-org-management";
import type { EmployeeWithTasks, TOPosition } from "@/hooks/use-org-management";
import {
  Building2, Users2, Target, Plus, ChevronDown, ChevronUp,
  Briefcase, Clock, Phone, UserCheck,
} from "lucide-react";

// ── 트리 노드 빌더 ─────────────────────────────────────────────
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
  // id → node 맵
  const nodeMap = new Map<string, OrgNode>();
  for (const emp of employees) {
    nodeMap.set(emp.id, { type: "employee", employee: emp, children: [] });
  }

  const roots: OrgNode[] = [];

  for (const emp of employees) {
    const node = nodeMap.get(emp.id)!;
    const supervisorInDept =
      emp.supervisor_id && nodeMap.has(emp.supervisor_id);

    if (supervisorInDept) {
      nodeMap.get(emp.supervisor_id!)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // TO 포지션은 루트 레벨에 추가 (공석은 부서 레벨)
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
  부장:      { bar: "bg-slate-700",  avatar: "bg-slate-700 text-white" },
  차장:      { bar: "bg-slate-600",  avatar: "bg-slate-600 text-white" },
  과장:      { bar: "bg-blue-600",   avatar: "bg-blue-600 text-white" },
  대리:      { bar: "bg-blue-500",   avatar: "bg-blue-500 text-white" },
  주임:      { bar: "bg-teal-500",   avatar: "bg-teal-500 text-white" },
  사원:      { bar: "bg-teal-400",   avatar: "bg-teal-400 text-white" },
};

const DEFAULT_STYLE = { bar: "bg-slate-400", avatar: "bg-slate-400 text-white" };

// ── PO 카드 ────────────────────────────────────────────────────
function POCard({ emp, isRoot = false }: { emp: EmployeeWithTasks; isRoot?: boolean }) {
  const style = GRADE_STYLE[emp.job_title ?? ""] ?? DEFAULT_STYLE;
  const initials = emp.full_name?.slice(0, 1) ?? "?";

  return (
    <div
      className={`
        inline-block bg-white rounded-xl border shadow-sm text-left
        transition-all duration-150 hover:shadow-md hover:-translate-y-0.5
        ${isRoot ? "border-slate-300 shadow-md min-w-[160px]" : "min-w-[140px]"}
      `}
    >
      <div className={`h-1 w-full rounded-t-xl ${style.bar}`} />
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className={`w-8 h-8 rounded-full ${style.avatar} flex items-center justify-center font-bold text-sm shrink-0`}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight truncate">{emp.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate">{emp.job_title}</p>
          </div>
        </div>
        {emp.job_role && emp.job_role !== emp.job_title && (
          <p className="text-[10px] text-slate-400 truncate mb-1">{emp.job_role}</p>
        )}
        {emp.employee_tasks && emp.employee_tasks.length > 0 && (
          <div className="border-t border-slate-100 pt-2 mt-1 space-y-1">
            {emp.employee_tasks.slice(0, 2).map((t) => (
              <div key={t.id} className="flex items-start gap-1">
                <Briefcase className="w-2.5 h-2.5 text-slate-300 mt-0.5 shrink-0" />
                <span className="text-[10px] text-slate-500 line-clamp-1">{t.task_name}</span>
              </div>
            ))}
            {emp.employee_tasks.length > 2 && (
              <p className="text-[10px] text-slate-400 pl-3.5">+{emp.employee_tasks.length - 2}개</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TO 카드 ────────────────────────────────────────────────────
const STATUS_INFO: Record<string, { dot: string; bg: string; text: string }> = {
  채용중:    { dot: "bg-green-400 animate-pulse", bg: "bg-green-50",  text: "text-green-700" },
  "입사 예정": { dot: "bg-blue-400",              bg: "bg-blue-50",   text: "text-blue-700" },
  공석:      { dot: "bg-red-400 animate-pulse",   bg: "bg-red-50",    text: "text-red-700" },
  보류:      { dot: "bg-amber-400",               bg: "bg-amber-50",  text: "text-amber-700" },
  "-":       { dot: "bg-slate-300",               bg: "bg-slate-50",  text: "text-slate-500" },
};

function TOCard({ pos }: { pos: TOPosition }) {
  const s = STATUS_INFO[pos.recruit_status] ?? STATUS_INFO["-"];
  return (
    <div className="inline-block min-w-[140px] rounded-xl border-2 border-dashed border-primary/40 bg-white hover:border-primary/60 hover:shadow-sm transition-all duration-150">
      <div className="h-1 w-full rounded-t-xl bg-primary/25" />
      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-full border-2 border-dashed border-primary/40 bg-primary/5 flex items-center justify-center shrink-0">
            <Plus className="w-3.5 h-3.5 text-primary/50" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-primary text-sm leading-tight truncate">{pos.position_name}</p>
            <p className="text-[11px] text-slate-400">{pos.title ?? "직급 미정"}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 ${s.bg} ${s.text} rounded-md px-2 py-1`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className="text-[10px] font-semibold">{pos.recruit_status}</span>
        </div>
        {pos.target_hire_date && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400">
            <Clock className="w-2.5 h-2.5" />
            <span>목표 {pos.target_hire_date}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 재귀 트리노드 렌더러 ────────────────────────────────────────
function OrgTreeNode({ node, isRoot = false }: { node: OrgNode; isRoot?: boolean }) {
  const label =
    node.type === "employee" ? (
      <POCard emp={node.employee!} isRoot={isRoot} />
    ) : (
      <TOCard pos={node.toPosition!} />
    );

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

// ── 부서 섹션 ──────────────────────────────────────────────────
function DepartmentSection({
  dept,
}: {
  dept: { departmentName: string; employees: EmployeeWithTasks[]; toPositions: TOPosition[] };
}) {
  const [collapsed, setCollapsed] = useState(false);

  const roots = buildDeptTree(dept.employees, dept.toPositions);
  const total = dept.employees.length + dept.toPositions.length;
  const fillRate = total > 0 ? Math.round((dept.employees.length / total) * 100) : 100;
  const fillColor =
    fillRate === 100 ? "bg-green-400" :
    fillRate >= 75   ? "bg-blue-400"  :
    fillRate >= 50   ? "bg-amber-400" : "bg-red-400";

  // 단일 루트이면 Tree로, 복수 루트이면 나란히 렌더
  const hasMultipleRoots = roots.length > 1;

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* 부서 헤더 */}
      <button
        className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
        <div className="flex-1 flex items-center gap-3 flex-wrap">
          <h3 className="text-base font-bold text-slate-800">{dept.departmentName}</h3>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
            PO <b>{dept.employees.length}명</b>
          </span>
          {dept.toPositions.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
              TO <b>{dept.toPositions.length}개</b> 오픈
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${fillRate}%` }} />
            </div>
            <span className="text-xs font-bold text-slate-500 w-8 text-right">{fillRate}%</span>
          </div>
          {collapsed
            ? <ChevronDown className="w-4 h-4 text-slate-400" />
            : <ChevronUp className="w-4 h-4 text-slate-400" />
          }
        </div>
      </button>

      {/* 조직도 트리 */}
      {!collapsed && roots.length > 0 && (
        <div className="border-t bg-[#f8f9fb] px-6 py-8 overflow-x-auto">
          {hasMultipleRoots ? (
            /* 루트가 여러 명(임원 등): 가로로 나열 */
            <div className="flex gap-6 justify-center flex-wrap">
              {roots.map((root, i) => (
                <div key={root.employee?.id ?? root.toPosition?.id ?? i}>
                  {roots.length === 1 || root.children.length === 0 ? (
                    root.type === "employee"
                      ? <POCard emp={root.employee!} isRoot />
                      : <TOCard pos={root.toPosition!} />
                  ) : (
                    <Tree
                      lineWidth="2px"
                      lineColor="#cbd5e1"
                      lineBorderRadius="8px"
                      label={
                        root.type === "employee"
                          ? <POCard emp={root.employee!} isRoot />
                          : <TOCard pos={root.toPosition!} />
                      }
                    >
                      {root.children.map((child, ci) => (
                        <OrgTreeNode
                          key={child.employee?.id ?? child.toPosition?.id ?? ci}
                          node={child}
                        />
                      ))}
                    </Tree>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* 루트가 1명: 전체 트리 */
            <Tree
              lineWidth="2px"
              lineColor="#cbd5e1"
              lineBorderRadius="8px"
              label={
                roots[0].type === "employee"
                  ? <POCard emp={roots[0].employee!} isRoot />
                  : <TOCard pos={roots[0].toPosition!} />
              }
            >
              {roots[0].children.map((child, i) => (
                <OrgTreeNode
                  key={child.employee?.id ?? child.toPosition?.id ?? i}
                  node={child}
                />
              ))}
            </Tree>
          )}
        </div>
      )}

      {!collapsed && roots.length === 0 && (
        <div className="border-t py-10 text-center text-slate-400 text-sm bg-[#f8f9fb]">
          등록된 구성원이 없습니다.
        </div>
      )}
    </div>
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
              부서별 현원(PO)과 충원 목표(TO)를 조직도로 확인합니다.
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
              <p className="text-xs font-semibold text-muted-foreground">오픈 TO / 전사 충원율</p>
              <div className="flex items-end gap-2">
                <p className="text-2xl font-bold text-primary">{totalTO}개</p>
                <p className="text-sm font-semibold text-slate-500 pb-0.5">{overallFill}% 충원</p>
              </div>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-5 text-xs text-slate-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>PO — 현재 재직 중인 구성원</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded border-2 border-dashed border-primary/50" />
            <span>TO — 충원 목표 포지션 (공석)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
              <div className="w-3/4 bg-blue-400" />
            </div>
            <span>충원율</span>
          </div>
        </div>

        {/* 부서별 조직도 */}
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
