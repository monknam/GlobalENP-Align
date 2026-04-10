import React, { useRef, useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Shell } from "@/components/layout/Shell";
import {
  useDepartmentOrgChart,
  useUpdateEmployeeDept,
} from "@/hooks/use-org-management";
import type { EmployeeWithTasks, TOPosition } from "@/hooks/use-org-management";
import { Building2, Users2, Target, Plus, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

// ── 직급 색상 ──────────────────────────────────────────────────
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

// ── 개인 카드 (대표이사 / 부사장) ─────────────────────────────
function PersonCard({
  emp,
  variant = "ceo",
}: {
  emp: EmployeeWithTasks;
  variant?: "ceo" | "vp";
}) {
  const color = GRADE_COLOR[emp.job_title ?? ""] ?? DEFAULT_COLOR;
  const isCeo = variant === "ceo";
  return (
    <div
      className={`
        inline-flex items-center gap-3 rounded-2xl shadow-md px-5 py-3
        ${isCeo ? "bg-slate-800 text-white" : "bg-white border-2 border-rose-200"}
      `}
    >
      <div
        className={`
          rounded-full flex items-center justify-center font-bold shadow
          ${isCeo ? "w-10 h-10 text-base bg-rose-800 text-white" : "w-9 h-9 text-sm bg-rose-600 text-white"}
        `}
      >
        {emp.full_name?.slice(0, 1)}
      </div>
      <div>
        {isCeo && (
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-0.5">
            Global ENP · 글로벌이앤피
          </p>
        )}
        <p className={`font-bold leading-tight ${isCeo ? "text-white text-sm" : "text-slate-900 text-xs"}`}>
          {emp.full_name}
        </p>
        <p className={`text-[10px] ${isCeo ? "text-slate-400" : "text-slate-500"}`}>
          {emp.job_title}
        </p>
      </div>
    </div>
  );
}

// ── 이사진 (옆) ────────────────────────────────────────────────
function BoardCard({ emp }: { emp: EmployeeWithTasks }) {
  const color = GRADE_COLOR[emp.job_title ?? ""] ?? DEFAULT_COLOR;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold`}>
        {emp.full_name?.slice(0, 1)}
      </div>
      <p className="text-[10px] font-bold text-slate-800">{emp.full_name}</p>
      <p className="text-[8px] text-slate-400">{emp.job_title}</p>
    </div>
  );
}

// ── 드래그 가능한 직원 행 ──────────────────────────────────────
function DraggableEmpRow({
  emp,
  isDragging = false,
}: {
  emp: EmployeeWithTasks;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: emp.id,
    data: { emp },
  });
  const color = GRADE_COLOR[emp.job_title ?? ""] ?? DEFAULT_COLOR;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-grab active:cursor-grabbing select-none
        transition-all ${isDragging ? "opacity-0" : "hover:bg-slate-50"}
      `}
    >
      <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
        {emp.full_name?.slice(0, 1)}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-800 leading-tight truncate">{emp.full_name}</p>
        <p className="text-[9px] text-slate-400 truncate">{emp.job_title}</p>
      </div>
    </div>
  );
}

function DragOverlayCard({ emp }: { emp: EmployeeWithTasks }) {
  const color = GRADE_COLOR[emp.job_title ?? ""] ?? DEFAULT_COLOR;
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white shadow-xl border border-primary/30 cursor-grabbing">
      <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center text-white text-[9px] font-bold shrink-0`}>
        {emp.full_name?.slice(0, 1)}
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-800">{emp.full_name}</p>
        <p className="text-[9px] text-slate-400">{emp.job_title}</p>
      </div>
    </div>
  );
}

// ── TO 행 ──────────────────────────────────────────────────────
function TORow({ pos }: { pos: TOPosition }) {
  const s = TO_STATUS[pos.recruit_status] ?? TO_STATUS["-"];
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-dashed border-primary/30 bg-primary/5">
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

// ── 부서 + 부서장이 포함된 드롭 컬럼 ─────────────────────────
function DroppableDeptCol({
  deptKey,
  name,
  leaderName,
  leaderTitle,
  leaderEmp,
  employees,
  toPositions,
  excludeNames = [],
  activeEmpId,
}: {
  deptKey: string;
  name: string;
  leaderName: string;
  leaderTitle?: string;
  leaderEmp?: EmployeeWithTasks | null;
  employees: EmployeeWithTasks[];
  toPositions: TOPosition[];
  excludeNames?: string[];
  activeEmpId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: deptKey });

  // 부서장 + 지정 제외 이름 모두 제외하고 나머지 정렬
  const members = [...employees]
    .filter((e) => {
      const name = e.full_name ?? "";
      return name !== leaderName && !excludeNames.includes(name);
    })
    .sort((a, b) => (a.is_department_head ? -1 : b.is_department_head ? 1 : 0));

  const total = members.length + toPositions.length;
  const fillRate = total > 0 ? Math.round((members.length / total) * 100) : 100;
  const fillColor =
    fillRate === 100 ? "bg-green-400" :
    fillRate >= 75   ? "bg-blue-400"  :
    fillRate >= 50   ? "bg-amber-400" : "bg-red-400";

  const leaderColor = GRADE_COLOR[leaderEmp?.job_title ?? leaderTitle ?? ""] ?? DEFAULT_COLOR;

  return (
    <div className="flex flex-col" style={{ flex: "1 1 0", minWidth: "108px" }}>
      {/* 연결선 위 */}
      <div className="flex justify-center"><div className="w-px h-4 bg-slate-300" /></div>

      {/* 부서 카드 (부서장 포함) */}
      <div className="mx-0.5 rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* 부서장 영역 */}
        <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-50 border-b border-slate-200">
          <div className={`w-7 h-7 rounded-full ${leaderColor} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
            {leaderName.slice(0, 1)}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-900 leading-tight truncate">{leaderName}</p>
            <p className="text-[9px] text-slate-500">{leaderEmp?.job_title ?? leaderTitle ?? "부서장"}</p>
          </div>
        </div>
        {/* 부서명 + 충원율 */}
        <div className="px-2.5 py-1.5">
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-0.5 min-w-0">
              <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
              <p className="text-[10px] font-bold text-slate-700 truncate">{name}</p>
            </div>
            <div className="flex gap-1 text-[8px] text-slate-400 shrink-0">
              <span>PO <b className="text-slate-600">{members.length + 1}</b></span>
              {toPositions.length > 0 && <span className="text-primary">TO <b>{toPositions.length}</b></span>}
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${fillColor}`} style={{ width: `${fillRate}%` }} />
          </div>
        </div>
      </div>

      {/* 연결선 아래 */}
      <div className="flex justify-center"><div className="w-px h-3 bg-slate-300" /></div>

      {/* 직원 목록 (드롭존) */}
      <div
        ref={setNodeRef}
        className={`
          mx-0.5 rounded-xl border bg-white shadow-sm p-1 space-y-0.5 flex-1 transition-colors duration-150
          ${isOver ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" : "border-slate-100"}
        `}
        style={{ minHeight: "48px" }}
      >
        {members.map((emp) => (
          <DraggableEmpRow key={emp.id} emp={emp} isDragging={activeEmpId === emp.id} />
        ))}
        {toPositions.map((pos) => <TORow key={pos.id} pos={pos} />)}
        {members.length === 0 && toPositions.length === 0 && (
          <p className="text-[9px] text-slate-300 text-center py-2">
            {isOver ? "여기에 놓기" : "—"}
          </p>
        )}
        {isOver && (
          <div className="text-[9px] text-primary text-center py-1 border border-dashed border-primary/40 rounded">
            여기에 놓기
          </div>
        )}
      </div>
    </div>
  );
}

// ── 수직선 ────────────────────────────────────────────────────
function VLine({ px = 16 }: { px?: number }) {
  return <div className="flex justify-center"><div className="w-px bg-slate-300" style={{ height: px }} /></div>;
}

// ── 메인 ───────────────────────────────────────────────────────
export default function OrgDashboard() {
  const { data: departments, isLoading, isError } = useDepartmentOrgChart();
  const updateDept = useUpdateEmployeeDept();

  const [activeEmp, setActiveEmp] = useState<EmployeeWithTasks | null>(null);
  const [zoom, setZoom] = useState(1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fitToWidth = useCallback(() => {
    if (!wrapperRef.current || !contentRef.current) return;
    const containerW = wrapperRef.current.clientWidth - 32;
    contentRef.current.style.transform = "scale(1)";
    const naturalW = contentRef.current.scrollWidth;
    const newScale = Math.min(1, containerW / naturalW);
    setZoom(Number(newScale.toFixed(2)));
  }, []);

  useEffect(() => {
    if (!departments) return;
    const t = setTimeout(fitToWidth, 120);
    return () => clearTimeout(t);
  }, [departments, fitToWidth]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const totalPO = departments?.reduce((a, d) => a + d.employees.length, 0) ?? 0;
  const totalTO = departments?.reduce((a, d) => a + d.toPositions.length, 0) ?? 0;
  const overallFill =
    totalPO + totalTO > 0 ? Math.round((totalPO / (totalPO + totalTO)) * 100) : 100;

  const allEmp = React.useMemo(() => {
    const map = new Map<string, EmployeeWithTasks>();
    departments?.forEach((d) => d.employees.forEach((e) => map.set(e.full_name ?? "", e)));
    return map;
  }, [departments]);

  const find = (name: string) => allEmp.get(name) ?? null;
  const getDept = (name: string) =>
    departments?.find((d) => d.departmentName === name) ?? {
      departmentName: name, employees: [], toPositions: [],
    };

  // 조직도에서 제외할 임원/대표 이름
  const TOP_EXEC = ["박재현", "최윤교", "박정휘", "박정은"];

  function handleDragStart(e: DragStartEvent) {
    setActiveEmp(e.active.data.current?.emp ?? null);
  }
  function handleDragEnd(e: DragEndEvent) {
    const { over, active } = e;
    setActiveEmp(null);
    if (!over || !active) return;
    const emp = active.data.current?.emp as EmployeeWithTasks;
    if (!emp) return;
    const deptDbName = over.id === "경영관리부" ? "경영지원부" : (over.id as string);
    if (emp.department === deptDbName) return;
    updateDept.mutate({ id: emp.id, department: deptDbName, supervisor_id: null });
  }

  if (isLoading) return (
    <Shell><div className="flex h-64 items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></Shell>
  );
  if (isError) return (
    <Shell><div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">로딩 중 오류가 발생했습니다.</div></Shell>
  );

  const ceo    = find("박재현");
  const vp     = find("박정휘");
  const board1 = find("최윤교");
  const board2 = find("박정은");

  const deptYeongup = getDept("영업행정관리부");
  const deptField   = getDept("커미셔닝/현장관리부");
  const deptDev     = getDept("개발생산부");
  const deptDesign  = getDept("연구설계부");
  const deptRnD     = getDept("연구개발부");
  const deptMgmt    = getDept("경영지원부");

  return (
    <Shell>
      <div className="space-y-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold tracking-tight">전사 조직 현황</h1>
            <p className="text-muted-foreground text-xs mt-0.5">카드를 드래그해서 부서를 옮길 수 있습니다</p>
          </div>
          <Link href="/org-management/to-request">
            <button className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" />TO 충원 신청
            </button>
          </Link>
        </div>

        {/* 요약 */}
        <div className="grid gap-2 grid-cols-3">
          {[
            { icon: <Building2 className="w-3.5 h-3.5 text-slate-600" />, bg: "bg-slate-100", label: "부서 수", value: departments?.length ?? 0, color: "" },
            { icon: <Users2 className="w-3.5 h-3.5 text-slate-600" />, bg: "bg-slate-100", label: "총 현원(PO)", value: totalPO, color: "" },
            { icon: <Target className="w-3.5 h-3.5 text-primary" />, bg: "bg-primary/10", label: "TO / 충원율", value: `${totalTO}개`, sub: `${overallFill}%`, color: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="bg-white p-3 rounded-xl border shadow-sm flex items-center gap-2">
              <div className={`p-1.5 ${s.bg} rounded-lg shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground">{s.label}</p>
                <div className="flex items-end gap-1">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  {s.sub && <p className="text-xs font-semibold text-slate-500 pb-0.5">{s.sub}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 줌 컨트롤 */}
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(1)))}
            className="p-1.5 rounded-lg border bg-white hover:bg-slate-50 text-slate-600 shadow-sm">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs font-mono text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))}
            className="p-1.5 rounded-lg border bg-white hover:bg-slate-50 text-slate-600 shadow-sm">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={fitToWidth}
            className="p-1.5 rounded-lg border bg-white hover:bg-slate-50 text-slate-600 shadow-sm" title="화면에 맞추기">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] text-slate-400 ml-1">← 직원 카드 드래그로 부서 이동</span>
        </div>

        {/* 전사 조직도 */}
        <div ref={wrapperRef} className="bg-[#f8f9fb] rounded-2xl border shadow-sm overflow-hidden">
          <div style={{ overflow: "hidden" }}>
            <div
              ref={contentRef}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width: `${100 / zoom}%`,
              }}
            >
              <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <div className="p-5">

                  {/* ── Row 1: CEO + 이사진 ── */}
                  <div className="flex items-start justify-center gap-6">
                    {ceo && <PersonCard emp={ceo} variant="ceo" />}
                    {(board1 || board2) && (
                      <div className="mt-2">
                        <p className="text-[8px] text-slate-400 text-center mb-1 font-semibold uppercase tracking-wider">이사진</p>
                        <div className="flex gap-4 bg-white rounded-xl border border-slate-200 shadow-sm px-3 py-2">
                          {board1 && <BoardCard emp={board1} />}
                          {board2 && <BoardCard emp={board2} />}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CEO → VP */}
                  <VLine px={14} />

                  {/* ── Row 2: 부사장 ── */}
                  <div className="flex justify-center">
                    {vp && <PersonCard emp={vp} variant="vp" />}
                  </div>

                  {/* VP → 부서 */}
                  <VLine px={12} />
                  <div className="w-full h-px bg-slate-300" />

                  {/* ── Row 3: 부서 컬럼 ── */}
                  <div className="flex items-start gap-0.5">

                    {/* 관리부 그룹 (최경산) */}
                    <div className="flex flex-col" style={{ flex: "2 1 0" }}>
                      <div className="flex justify-center"><div className="w-px h-3 bg-slate-300" /></div>
                      {/* 관리부 그룹 헤더 */}
                      <div className="mx-0.5 rounded-xl border-2 border-slate-300 bg-slate-100 overflow-hidden">
                        <div className="flex items-center gap-2 px-2.5 py-2">
                          <div className={`w-7 h-7 rounded-full ${GRADE_COLOR["총괄부서장"]} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                            최
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 leading-tight">최경산</p>
                            <p className="text-[9px] text-slate-500">총괄부서장 · 관리부</p>
                          </div>
                        </div>
                      </div>
                      {/* 관리부 하위 2개 부서 */}
                      <div className="flex gap-0.5 mt-0.5">
                        <DroppableDeptCol
                          deptKey="영업행정관리부"
                          name="영업행정관리부"
                          leaderName="최경산"
                          leaderEmp={find("최경산")}
                          employees={deptYeongup.employees}
                          toPositions={deptYeongup.toPositions}
                          excludeNames={TOP_EXEC}
                          activeEmpId={activeEmp?.id ?? null}
                        />
                        <DroppableDeptCol
                          deptKey="커미셔닝/현장관리부"
                          name="커미셔닝/현장관리부"
                          leaderName="김인수"
                          leaderEmp={find("김인수")}
                          employees={deptField.employees}
                          toPositions={deptField.toPositions}
                          excludeNames={TOP_EXEC}
                          activeEmpId={activeEmp?.id ?? null}
                        />
                      </div>
                    </div>

                    <DroppableDeptCol
                      deptKey="개발생산부"
                      name="개발생산부"
                      leaderName="김용옥"
                      leaderEmp={find("김용옥")}
                      employees={deptDev.employees}
                      toPositions={deptDev.toPositions}
                      excludeNames={TOP_EXEC}
                      activeEmpId={activeEmp?.id ?? null}
                    />

                    <DroppableDeptCol
                      deptKey="연구설계부"
                      name="연구설계부"
                      leaderName="강주형"
                      leaderEmp={find("강주형")}
                      employees={deptDesign.employees}
                      toPositions={deptDesign.toPositions}
                      excludeNames={TOP_EXEC}
                      activeEmpId={activeEmp?.id ?? null}
                    />

                    <DroppableDeptCol
                      deptKey="연구개발부"
                      name="연구개발부"
                      leaderName="조홍모"
                      leaderEmp={find("조홍모")}
                      employees={deptRnD.employees}
                      toPositions={deptRnD.toPositions}
                      excludeNames={TOP_EXEC}
                      activeEmpId={activeEmp?.id ?? null}
                    />

                    {/* 경영관리부 (남기용 = DB 미등록) */}
                    <div className="flex flex-col" style={{ flex: "1 1 0", minWidth: "108px" }}>
                      <div className="flex justify-center"><div className="w-px h-4 bg-slate-300" /></div>
                      <div className="mx-0.5 rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden">
                        {/* 부서장: 남기용 (미등록) */}
                        <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-50 border-b border-slate-200">
                          <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0 opacity-60">
                            남
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-slate-500 leading-tight">남기용</p>
                            <p className="text-[9px] text-slate-400">부장 · 미등록</p>
                          </div>
                        </div>
                        <div className="px-2.5 py-1.5">
                          <div className="flex items-center gap-0.5 mb-1">
                            <Building2 className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <p className="text-[10px] font-bold text-slate-700">경영관리부</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center"><div className="w-px h-3 bg-slate-300" /></div>
                      {/* 경영지원부 직원 */}
                      <div className="mx-0.5 rounded-xl border border-slate-100 bg-white shadow-sm p-1 space-y-0.5 flex-1">
                        {deptMgmt.employees
                          .filter((e) => !TOP_EXEC.includes(e.full_name ?? "") && e.full_name !== "남기용")
                          .map((e) => (
                            <DraggableEmpRow key={e.id} emp={e} isDragging={activeEmp?.id === e.id} />
                          ))}
                        {deptMgmt.toPositions.map((p) => <TORow key={p.id} pos={p} />)}
                      </div>
                    </div>

                  </div>
                </div>

                <DragOverlay>
                  {activeEmp ? <DragOverlayCard emp={activeEmp} /> : null}
                </DragOverlay>
              </DndContext>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
          {[
            { color: "bg-rose-700", label: "임원" },
            { color: "bg-slate-700", label: "부장/차장" },
            { color: "bg-blue-500", label: "과장/대리" },
            { color: "bg-teal-400", label: "주임/사원" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1">
              <span className={`w-2.5 h-2.5 rounded-full ${l.color} inline-block`} />{l.label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border-2 border-dashed border-primary/50 inline-block" />TO(공석)
          </span>
        </div>

        {updateDept.isPending && (
          <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-4 py-2 rounded-full shadow-lg animate-pulse">
            부서 변경 저장 중...
          </div>
        )}
      </div>
    </Shell>
  );
}
