import React, { useState, useMemo } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useEmployeesAdmin,
  useUpdateEmployee,
  useAddEmployee,
} from "@/hooks/use-org-management";
import type { EmployeeAdminRow } from "@/hooks/use-org-management";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Plus, X, Save, UserX, UserCheck2,
  ChevronDown, Building2, Users, Edit2,
} from "lucide-react";

// ── 상수 ──────────────────────────────────────────────────────
const DEPARTMENTS = [
  "개발생산부", "커미셔닝/현장관리부", "연구설계부",
  "영업행정관리부", "경영지원부", "연구개발부",
];
const JOB_TITLES = [
  "대표이사", "부사장", "이사", "등기이사", "연구소장", "고문",
  "총괄부서장", "부장", "차장", "과장", "대리", "주임", "사원",
];
const GRADE_COLOR: Record<string, string> = {
  대표이사: "bg-rose-700", 이사: "bg-rose-600", 부사장: "bg-rose-600",
  등기이사: "bg-rose-500", 연구소장: "bg-purple-600", 고문: "bg-amber-600",
  총괄부서장: "bg-slate-700", 부장: "bg-slate-700", 차장: "bg-slate-600",
  과장: "bg-blue-600", 대리: "bg-blue-500", 주임: "bg-teal-500", 사원: "bg-teal-400",
};

// ── 빈 폼 ─────────────────────────────────────────────────────
const EMPTY: Omit<EmployeeAdminRow, "id"> = {
  employee_no: "", full_name: "", gender: "남",
  department: "개발생산부", job_title: "사원", job_role: "",
  hire_date: "", birth_date: "", phone: "", job_group: "manufacturing",
  is_department_head: false, is_active: true, supervisor_id: null,
};

// ── 인풋 헬퍼 ─────────────────────────────────────────────────
function FInput({
  label, value, onChange, type = "text", placeholder = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="enp-label block mb-1">{label}</label>
      <input
        type={type}
        className="enp-input"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
function FSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="enp-label block mb-1">{label}</label>
      <select
        className="enp-input cursor-pointer"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── 슬라이드 패널 (편집 / 추가) ───────────────────────────────
function EditPanel({
  emp,
  allEmployees,
  onClose,
  onSave,
  isNew,
}: {
  emp: Partial<EmployeeAdminRow>;
  allEmployees: EmployeeAdminRow[];
  onClose: () => void;
  onSave: (data: Partial<EmployeeAdminRow>) => void;
  isNew: boolean;
}) {
  const [form, setForm] = useState<Partial<EmployeeAdminRow>>(emp);
  const set = (k: keyof EmployeeAdminRow, v: unknown) =>
    setForm((p) => ({ ...p, [k]: v }));

  const supervisorOptions = [
    { value: "", label: "— 없음 —" },
    ...allEmployees
      .filter((e) => e.id !== emp.id && e.is_active)
      .map((e) => ({ value: e.id, label: `${e.full_name} (${e.job_title ?? ""})` })),
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col enp-glass enp-shadow-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/30">
          <div>
            <p className="enp-label">직원 정보</p>
            <h2 className="text-base font-bold text-[hsl(var(--enp-on-surface))] mt-0.5">
              {isNew ? "신규 직원 등록" : form.full_name ?? "편집"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/10 transition-colors text-[hsl(var(--enp-on-surface-variant))]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* 기본 정보 */}
          <div>
            <p className="enp-label mb-3">기본 정보</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FInput label="사번" value={form.employee_no ?? ""} onChange={(v) => set("employee_no", v)} placeholder="220303" />
                <FSelect label="성별" value={form.gender ?? "남"} onChange={(v) => set("gender", v)}
                  options={[{ value: "남", label: "남" }, { value: "여", label: "여" }]} />
              </div>
              <FInput label="이름" value={form.full_name ?? ""} onChange={(v) => set("full_name", v)} placeholder="홍길동" />
              <div className="grid grid-cols-2 gap-3">
                <FInput label="입사일" value={form.hire_date ?? ""} onChange={(v) => set("hire_date", v)} type="date" />
                <FInput label="생년월일" value={form.birth_date ?? ""} onChange={(v) => set("birth_date", v)} type="date" />
              </div>
              <FInput label="연락처" value={form.phone ?? ""} onChange={(v) => set("phone", v)} placeholder="010-0000-0000" />
            </div>
          </div>

          {/* 조직 정보 */}
          <div>
            <p className="enp-label mb-3">조직 정보</p>
            <div className="space-y-3">
              <FSelect label="부서" value={form.department ?? ""} onChange={(v) => set("department", v)}
                options={[
                  { value: "", label: "— 미배정 —" },
                  ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
                ]}
              />
              <div className="grid grid-cols-2 gap-3">
                <FSelect label="직급" value={form.job_title ?? ""} onChange={(v) => set("job_title", v)}
                  options={JOB_TITLES.map((t) => ({ value: t, label: t }))}
                />
                <FInput label="직무 (역할)" value={form.job_role ?? ""} onChange={(v) => set("job_role", v)} placeholder="소방시설설계업" />
              </div>
              <FSelect label="직속 상관" value={form.supervisor_id ?? ""}
                onChange={(v) => set("supervisor_id", v || null)}
                options={supervisorOptions}
              />
            </div>
          </div>

          {/* 상태 */}
          <div>
            <p className="enp-label mb-3">상태</p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--enp-surface-mid))] cursor-pointer">
                <input type="checkbox" checked={form.is_department_head ?? false}
                  onChange={(e) => set("is_department_head", e.target.checked)}
                  className="w-4 h-4 accent-[hsl(var(--enp-primary))]"
                />
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--enp-on-surface))]">부서장</p>
                  <p className="text-xs text-[hsl(var(--enp-on-surface-variant))]">조직도 상단에 표시됩니다</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg bg-[hsl(var(--enp-surface-mid))] cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="w-4 h-4 accent-[hsl(var(--enp-primary))]"
                />
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--enp-on-surface))]">재직 중</p>
                  <p className="text-xs text-[hsl(var(--enp-on-surface-variant))]">체크 해제 시 조직도에서 숨김</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/30 flex gap-2">
          <button onClick={onClose}
            className="enp-btn enp-btn-secondary flex-1">
            취소
          </button>
          <button
            onClick={() => onSave(form)}
            className="enp-btn enp-btn-primary flex-1"
          >
            <Save className="w-3.5 h-3.5" />
            {isNew ? "등록" : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}

// ── 통계 카드 ─────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "" }: {
  label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div className="enp-card p-5 flex flex-col gap-1">
      <p className="enp-label">{label}</p>
      <p className={`text-3xl font-bold enp-num mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[hsl(var(--enp-on-surface-variant))]">{sub}</p>}
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────
export default function EmployeesAdmin() {
  const { data: employees = [], isLoading } = useEmployeesAdmin();
  const updateEmp = useUpdateEmployee();
  const addEmp = useAddEmployee();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("전체");
  const [statusFilter, setStatusFilter] = useState<"전체" | "재직" | "퇴직">("재직");
  const [editTarget, setEditTarget] = useState<Partial<EmployeeAdminRow> | null>(null);
  const [isNew, setIsNew] = useState(false);

  // 집계
  const active   = employees.filter((e) => e.is_active).length;
  const inactive = employees.length - active;
  const depts    = Array.from(new Set(employees.filter(e => e.department).map((e) => e.department!))).sort();

  // 필터
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      if (statusFilter === "재직"  && !e.is_active) return false;
      if (statusFilter === "퇴직"  &&  e.is_active) return false;
      if (deptFilter !== "전체" && e.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          e.full_name?.toLowerCase().includes(q) ||
          e.employee_no?.toLowerCase().includes(q) ||
          e.job_title?.toLowerCase().includes(q) ||
          e.department?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [employees, statusFilter, deptFilter, search]);

  function handleSave(data: Partial<EmployeeAdminRow>) {
    if (!data.full_name?.trim()) {
      toast({ variant: "destructive", title: "이름을 입력해주세요." });
      return;
    }
    if (isNew) {
      addEmp.mutate(data as Omit<EmployeeAdminRow, "id">, {
        onSuccess: () => {
          toast({ title: "등록 완료", description: `${data.full_name} 직원이 등록되었습니다.` });
          setEditTarget(null);
        },
        onError: (e) => toast({ variant: "destructive", title: "등록 실패", description: e.message }),
      });
    } else {
      updateEmp.mutate(data as Partial<EmployeeAdminRow> & { id: string }, {
        onSuccess: () => {
          toast({ title: "저장 완료" });
          setEditTarget(null);
        },
        onError: (e) => toast({ variant: "destructive", title: "저장 실패", description: e.message }),
      });
    }
  }

  function handleToggleActive(emp: EmployeeAdminRow) {
    updateEmp.mutate(
      { id: emp.id, is_active: !emp.is_active },
      {
        onSuccess: () =>
          toast({ title: emp.is_active ? "퇴직 처리됨" : "재직 복구됨", description: emp.full_name ?? "" }),
        onError: (e) => toast({ variant: "destructive", title: "변경 실패", description: e.message }),
      }
    );
  }

  if (isLoading) return (
    <Shell>
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(var(--enp-primary))]" />
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="space-y-6">

        {/* ── 헤더 ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="enp-label mb-1">조직 관리</p>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Manrope, Pretendard, sans-serif" }}>
              직원 현황 관리
            </h1>
            <p className="text-sm text-[hsl(var(--enp-on-surface-variant))] mt-1">
              직원 정보를 추가·수정하고 조직 배치를 관리합니다.
            </p>
          </div>
          <button
            onClick={() => { setIsNew(true); setEditTarget({ ...EMPTY }); }}
            className="enp-btn enp-btn-primary"
          >
            <Plus className="w-4 h-4" />
            직원 등록
          </button>
        </div>

        {/* ── 통계 ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="전체 직원" value={employees.length} sub="총 등록 인원" />
          <StatCard label="재직 중" value={active} sub="현재 근무" color="text-[hsl(var(--enp-primary))]" />
          <StatCard label="부서 수" value={depts.length} sub="활성 부서" />
          <StatCard label="비재직" value={inactive} sub="퇴직·휴직" color="text-[hsl(var(--enp-on-surface-variant))]" />
        </div>

        {/* ── 필터 + 검색 ── */}
        <div className="enp-card p-4">
          {/* 검색 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--enp-on-surface-variant))]" />
            <input
              className="enp-input pl-9"
              placeholder="이름, 사번, 직급, 부서로 검색…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* 재직/퇴직 */}
          <div className="flex gap-2 flex-wrap mb-3">
            {(["전체", "재직", "퇴직"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`enp-chip cursor-pointer transition-colors ${
                  statusFilter === f
                    ? "!bg-[hsl(var(--enp-primary))] !text-white"
                    : "hover:opacity-80"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* 부서 필터 */}
          <div className="flex gap-1.5 flex-wrap">
            {["전체", ...depts].map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                  deptFilter === d
                    ? "bg-[hsl(var(--enp-primary))] text-white"
                    : "bg-[hsl(var(--enp-surface-mid))] text-[hsl(var(--enp-on-surface-variant))] hover:bg-[hsl(var(--enp-surface-high))]"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* ── 직원 테이블 ── */}
        <div className="enp-card overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-[hsl(var(--enp-surface-mid))]">
            <span className="enp-label">사번</span>
            <span className="enp-label">이름 / 직급</span>
            <span className="enp-label hidden sm:block">부서</span>
            <span className="enp-label hidden md:block">입사일</span>
            <span className="enp-label">상태</span>
            <span className="enp-label">편집</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-[hsl(var(--enp-on-surface-variant))] text-sm">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              검색 결과가 없습니다
            </div>
          ) : (
            <div>
              {filtered.map((emp, idx) => {
                const color = GRADE_COLOR[emp.job_title ?? ""] ?? "bg-slate-300";
                return (
                  <div
                    key={emp.id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-5 py-3 transition-colors ${
                      idx % 2 === 0
                        ? "bg-[hsl(var(--enp-surface-lowest))]"
                        : "bg-[hsl(var(--enp-surface-low))]"
                    } ${!emp.is_active ? "opacity-50" : ""}`}
                  >
                    {/* 사번 */}
                    <span className="text-xs font-mono text-[hsl(var(--enp-on-surface-variant))] w-12">
                      {emp.employee_no ?? "—"}
                    </span>

                    {/* 이름 */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                        {emp.full_name?.slice(0, 1) ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[hsl(var(--enp-on-surface))] truncate">
                          {emp.full_name}
                          {emp.is_department_head && (
                            <span className="ml-1.5 text-[9px] font-bold bg-[hsl(var(--enp-primary-container))] text-[hsl(var(--enp-primary))] px-1.5 py-0.5 rounded-full">부서장</span>
                          )}
                        </p>
                        <p className="text-[11px] text-[hsl(var(--enp-on-surface-variant))]">{emp.job_title}</p>
                      </div>
                    </div>

                    {/* 부서 */}
                    <span className="text-xs text-[hsl(var(--enp-on-surface-variant))] hidden sm:block truncate max-w-[120px]">
                      {emp.department ?? "미배정"}
                    </span>

                    {/* 입사일 */}
                    <span className="text-xs text-[hsl(var(--enp-on-surface-variant))] hidden md:block w-24">
                      {emp.hire_date ? emp.hire_date.slice(0, 10) : "—"}
                    </span>

                    {/* 상태 */}
                    <span className={`enp-chip ${emp.is_active ? "!bg-green-100 !text-green-700" : "!bg-slate-100 !text-slate-500"}`}>
                      {emp.is_active ? "재직" : "퇴직"}
                    </span>

                    {/* 액션 */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setIsNew(false); setEditTarget(emp); }}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--enp-surface-mid))] text-[hsl(var(--enp-on-surface-variant))] transition-colors"
                        title="편집"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(emp)}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--enp-surface-mid))] transition-colors"
                        title={emp.is_active ? "퇴직 처리" : "재직 복구"}
                      >
                        {emp.is_active
                          ? <UserX className="w-3.5 h-3.5 text-red-400" />
                          : <UserCheck2 className="w-3.5 h-3.5 text-green-500" />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 하단 카운트 */}
          <div className="px-5 py-3 bg-[hsl(var(--enp-surface-mid))] flex items-center justify-between">
            <p className="text-xs text-[hsl(var(--enp-on-surface-variant))]">
              {filtered.length}명 표시 / 전체 {employees.length}명
            </p>
          </div>
        </div>

        {/* ── 부서별 현황 요약 ── */}
        <div>
          <p className="enp-label mb-3">부서별 현황</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {depts.map((dept) => {
              const deptEmps = employees.filter((e) => e.department === dept);
              const deptActive = deptEmps.filter((e) => e.is_active).length;
              const head = deptEmps.find((e) => e.is_department_head && e.is_active);
              return (
                <div
                  key={dept}
                  className="enp-card p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => { setDeptFilter(dept); setStatusFilter("재직"); }}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-[hsl(var(--enp-primary))] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[hsl(var(--enp-on-surface))] truncate">{dept}</p>
                      {head && (
                        <p className="text-[10px] text-[hsl(var(--enp-on-surface-variant))]">
                          장 {head.full_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-bold enp-num text-[hsl(var(--enp-primary))]">{deptActive}</p>
                    <p className="text-[10px] text-[hsl(var(--enp-on-surface-variant))]">명 재직</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── 편집 패널 ── */}
      {editTarget && (
        <EditPanel
          emp={editTarget}
          allEmployees={employees}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
          isNew={isNew}
        />
      )}
    </Shell>
  );
}
