import React, { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { useSubmitTORequest } from "@/hooks/use-org-management";
import { useGetEmployees } from "@/hooks/use-evaluation";
import { useToast } from "@/hooks/use-toast";
import {
  Info, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Building2,
} from "lucide-react";

const DEPARTMENTS = [
  "개발생산부", "커미셔닝/현장관리부", "연구설계부",
  "영업행정관리부", "경영지원부", "연구개발부",
];

const REASON_OPTIONS = [
  {
    id: "퇴사대체",
    label: "퇴사 대체",
    icon: "🔄",
    desc: "퇴사 예정 또는 퇴사한 인력의 공백을 메우기 위한 채용",
    needsDetail: true,
    detailLabel: "대체 대상자 성명 및 퇴사(예정)일",
    detailPlaceholder: "예: 홍길동 / 2026-05-31 퇴사 예정",
  },
  {
    id: "공사대체",
    label: "프로젝트/공사 대체",
    icon: "🏗️",
    desc: "특정 프로젝트 투입으로 인한 기존 업무 공백 대체",
    needsDetail: true,
    detailLabel: "관련 프로젝트/공사명",
    detailPlaceholder: "예: ○○ 플랜트 소방설비 공사 (2026.03~12)",
  },
  {
    id: "업무량증가",
    label: "업무량 증가",
    icon: "📈",
    desc: "수주 증가·사업 확장·법정 의무 등으로 현재 인력이 부족한 경우",
    needsDetail: true,
    detailLabel: "업무량 증가 배경",
    detailPlaceholder: "예: 2026년 수주 30% 증가, 설계 납기 지연 위험",
  },
  {
    id: "신규업무",
    label: "신규 업무·사업 발생",
    icon: "🚀",
    desc: "기존 팀이 수행하지 않던 완전히 새로운 업무 영역 확장",
    needsDetail: false,
  },
  {
    id: "법정의무",
    label: "법정 의무 인력",
    icon: "📋",
    desc: "소방안전관리자·안전보건관리자 등 법령에서 요구하는 필수 인력",
    needsDetail: false,
  },
];

// ── 섹션 래퍼 ──────────────────────────────────────────────────
function Section({
  title,
  badge,
  guide,
  children,
}: {
  title: string;
  badge?: string;
  guide?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {badge && (
            <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold shrink-0">
              {badge}
            </span>
          )}
          <h2 className="font-bold text-slate-800 text-sm">{title}</h2>
        </div>
        {guide && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <Info className="w-3 h-3" />
            선진 사례 보기
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>
      {guide && open && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-[11px] text-blue-800 leading-relaxed">
          {guide}
        </div>
      )}
      <div className="px-6 py-5 space-y-4">{children}</div>
    </div>
  );
}

// ── 라벨 + 힌트 ───────────────────────────────────────────────
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-[10px] text-slate-400 leading-tight">{hint}</p>}
      {children}
    </div>
  );
}

const inputCls =
  "w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-slate-300";
const selectCls =
  "w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/40";

// ── 메인 폼 ────────────────────────────────────────────────────
export default function TORequestForm() {
  const { mutate: submitForm, isPending } = useSubmitTORequest();
  const { toast } = useToast();
  const { data: allEmployees = [] } = useGetEmployees(true);

  const today = new Date().toISOString().slice(0, 10);
  const docNo = `TO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [form, setForm] = useState({
    department: "개발생산부",
    requester_name: "",
    target_rank: "",
    headcount: 1,
    employment_type: "정규직",
    contract_start: "",
    contract_end: "",
    is_urgent: false,
    desired_hire_date: "",
    reasons: [] as string[],
    reason_details: {} as Record<string, string>, // reason id → 상세 내용
    current_team_work: [] as { employee_id: string; full_name: string; job_title: string; current_work: string }[],
    new_work_jd: "",
    required_licenses: [] as string[],
    experience_req: "",
    preferred_cond: "",
    budget_status: "신규 요청" as string,
    remarks: "",
  });

  // 부서 변경 시 팀원 목록 갱신
  useEffect(() => {
    const deptEmps = allEmployees.filter((e) => e.department === form.department);
    setForm((prev) => ({
      ...prev,
      current_team_work: deptEmps.map((e) => ({
        employee_id: e.id,
        full_name: e.fullName,
        job_title: e.jobTitle ?? "",
        current_work: "",
      })),
    }));
  }, [form.department, allEmployees]);

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleReason = (id: string) => {
    const next = form.reasons.includes(id)
      ? form.reasons.filter((r) => r !== id)
      : [...form.reasons, id];
    set("reasons", next);
  };

  const setReasonDetail = (id: string, text: string) =>
    setForm((prev) => ({
      ...prev,
      reason_details: { ...prev.reason_details, [id]: text },
    }));

  const handleSubmit = () => {
    if (!form.requester_name.trim()) {
      toast({ variant: "destructive", title: "신청자 성명을 입력해주세요." });
      return;
    }
    if (!form.target_rank.trim()) {
      toast({ variant: "destructive", title: "희망 직급을 입력해주세요." });
      return;
    }
    if (form.reasons.length === 0) {
      toast({ variant: "destructive", title: "충원 사유를 1개 이상 선택해주세요." });
      return;
    }

    // 사유 상세 합성
    const reasonDetailText = Object.entries(form.reason_details)
      .filter(([, v]) => v.trim())
      .map(([k, v]) => `[${k}] ${v}`)
      .join("\n");

    submitForm(
      {
        department: form.department,
        requester_name: form.requester_name,
        target_rank: form.target_rank,
        headcount: form.headcount,
        employment_type: form.employment_type,
        contract_start: form.contract_start || undefined,
        contract_end: form.contract_end || undefined,
        is_urgent: form.is_urgent,
        desired_hire_date: form.desired_hire_date || undefined,
        reasons: form.reasons,
        reason_detail: reasonDetailText || undefined,
        current_team_work: form.current_team_work,
        new_work_jd: form.new_work_jd || undefined,
        required_licenses: form.required_licenses,
        experience_req: form.experience_req || undefined,
        preferred_cond: form.preferred_cond || undefined,
        budget_status: form.budget_status || undefined,
        remarks: form.remarks || undefined,
      },
      {
        onSuccess: () => {
          toast({ title: "제출 완료", description: "TO 충원 신청이 접수되었습니다." });
          setForm({
            department: "개발생산부", requester_name: "", target_rank: "",
            headcount: 1, employment_type: "정규직", contract_start: "", contract_end: "",
            is_urgent: false, desired_hire_date: "", reasons: [], reason_details: {},
            current_team_work: [], new_work_jd: "", required_licenses: [],
            experience_req: "", preferred_cond: "", budget_status: "신규 요청", remarks: "",
          });
        },
        onError: (err) => {
          toast({ variant: "destructive", title: "제출 실패", description: err.message });
        },
      }
    );
  };

  const isContractType = form.employment_type === "계약직";
  const deptEmps = form.current_team_work;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto py-6 space-y-4">
        {/* 문서 헤더 */}
        <div className="bg-slate-800 text-white rounded-2xl px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">TO 충원 신청서</p>
            <h1 className="text-lg font-bold mt-0.5">인력 충원 요청</h1>
            <p className="text-[11px] text-slate-400 mt-1">
              부서의 원활한 운영을 위한 인력 충원을 요청합니다.
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400">{today}</p>
            <p className="text-xs font-mono text-slate-300 mt-0.5">{docNo}</p>
            {form.is_urgent && (
              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold text-red-300">
                <AlertTriangle className="w-3 h-3" /> 긴급
              </span>
            )}
          </div>
        </div>

        {/* ── A. 기본 정보 ── */}
        <Section
          badge="A"
          title="기본 정보"
          guide={
            <div className="space-y-1">
              <p className="font-semibold mb-1">📌 선진 기업의 기본 정보 항목</p>
              <p>· <b>Google</b>: 부서명 외에 &lsquo;팀 OKR 코드&rsquo;를 연계 → 이 채용이 어느 목표에 기여하는지 명시</p>
              <p>· <b>Amazon</b>: 채용 승인 전 &lsquo;HC(Headcount) 번호&rsquo; 발급 → 인력 계획과 연동</p>
              <p>· <b>Samsung</b>: 연간 인력계획 대비 증감 사유를 반드시 기술</p>
              <p>· <b>Naver</b>: 고용 형태별 예산 코드 분리 (정규/계약 별도 승인 라인)</p>
            </div>
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="신청 부서" required>
              <select
                className={selectCls}
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
              >
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="신청자 성명" required hint="부서장 또는 담당 리더 이름을 입력하세요">
              <input
                className={inputCls}
                placeholder="예: 홍길동"
                value={form.requester_name}
                onChange={(e) => set("requester_name", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="신청 인원" required>
              <input
                type="number" min={1} max={20}
                className={inputCls}
                value={form.headcount}
                onChange={(e) => set("headcount", Number(e.target.value))}
              />
            </Field>
            <Field label="희망 직급" required hint="예: 과장, 대리, 주임">
              <input
                className={inputCls}
                placeholder="과장 / 대리"
                value={form.target_rank}
                onChange={(e) => set("target_rank", e.target.value)}
              />
            </Field>
            <Field label="고용 형태" required>
              <select
                className={selectCls}
                value={form.employment_type}
                onChange={(e) => set("employment_type", e.target.value)}
              >
                <option value="정규직">정규직</option>
                <option value="계약직">계약직</option>
                <option value="파견">파견</option>
              </select>
            </Field>
          </div>

          {isContractType && (
            <div className="grid grid-cols-2 gap-4 pl-2 border-l-4 border-amber-300 bg-amber-50 p-3 rounded-r-lg">
              <Field label="계약 시작일">
                <input type="date" className={inputCls} value={form.contract_start}
                  onChange={(e) => set("contract_start", e.target.value)} />
              </Field>
              <Field label="계약 종료일">
                <input type="date" className={inputCls} value={form.contract_end}
                  onChange={(e) => set("contract_end", e.target.value)} />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="채용 희망 시작일" hint="언제까지 합류하길 원하시나요?">
              <input type="date" className={inputCls} value={form.desired_hire_date}
                onChange={(e) => set("desired_hire_date", e.target.value)} />
            </Field>
            <Field label="예산 확보 여부" required>
              <select className={selectCls} value={form.budget_status}
                onChange={(e) => set("budget_status", e.target.value)}>
                <option value="기확보">기확보 (기존 예산에 포함)</option>
                <option value="신규 요청">신규 요청 (추가 예산 필요)</option>
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="urgent" type="checkbox" className="w-4 h-4 accent-red-500"
              checked={form.is_urgent}
              onChange={(e) => set("is_urgent", e.target.checked)}
            />
            <label htmlFor="urgent" className="text-xs font-semibold text-red-600 cursor-pointer">
              긴급 채용 — 30일 이내 합류 필요
            </label>
          </div>
        </Section>

        {/* ── B. 충원 사유 ── */}
        <Section
          badge="B"
          title="충원 사유"
          guide={
            <div className="space-y-1">
              <p className="font-semibold mb-1">📌 선진 기업의 사유 검토 기준</p>
              <p>· <b>퇴사 대체</b>: 대부분 기업은 &lsquo;즉시 대체&rsquo; 원칙 → 공백 기간 임시 대응 방안도 함께 요구 (Netflix)</p>
              <p>· <b>업무량 증가</b>: 수치로 증명 필수 → &lsquo;수주 건수 N% 증가&rsquo;, &lsquo;월 평균 초과근무 N시간&rsquo; (Amazon)</p>
              <p>· <b>신규 업무</b>: &lsquo;기존 팀이 왜 흡수할 수 없는가&rsquo;에 대한 근거 필요 (Google)</p>
              <p>· <b>법정 의무</b>: 위반 시 리스크 비용(과태료/영업정지) 대비 채용 비용 비교 제시 권장</p>
            </div>
          }
        >
          <p className="text-xs text-slate-500">해당하는 사유를 모두 선택하고, 구체적인 내용을 기재해주세요.</p>

          <div className="space-y-3">
            {REASON_OPTIONS.map((opt) => {
              const selected = form.reasons.includes(opt.id);
              return (
                <div key={opt.id} className={`rounded-xl border-2 transition-colors ${selected ? "border-primary bg-primary/5" : "border-slate-200 bg-white"}`}>
                  <button
                    className="w-full text-left px-4 py-3 flex items-start gap-3"
                    onClick={() => toggleReason(opt.id)}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selected ? "border-primary bg-primary" : "border-slate-300"}`}>
                      {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{opt.icon}</span>
                        <span className="text-sm font-bold text-slate-800">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>

                  {selected && opt.needsDetail && (
                    <div className="px-4 pb-3">
                      <label className="text-[11px] font-semibold text-slate-600">{opt.detailLabel}</label>
                      <input
                        className={`${inputCls} mt-1 text-xs`}
                        placeholder={opt.detailPlaceholder}
                        value={form.reason_details[opt.id] ?? ""}
                        onChange={(e) => setReasonDetail(opt.id, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {form.reasons.length === 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              최소 1개 이상의 충원 사유를 선택해야 합니다.
            </p>
          )}
        </Section>

        {/* ── C. 현재 팀원 업무 현황 ── */}
        <Section
          badge="C"
          title="현재 팀원 업무 현황"
          guide={
            <div className="space-y-1">
              <p className="font-semibold mb-1">📌 선진 기업이 이 항목을 요구하는 이유</p>
              <p>· <b>Amazon</b>: &lsquo;현재 팀의 최대 업무 용량(capacity)&rsquo;을 측정 → 신규 인력 없이 기존 팀 재편으로 해결 가능한지 먼저 검토</p>
              <p>· <b>Google</b>: 팀원별 업무 비중(%)을 80% 이상 → 신규 인력 TO 자동 승인 루트 개방</p>
              <p>· <b>Kakao</b>: 팀원들의 &lsquo;집중 업무 / 협업 업무 / 관리 업무&rsquo; 3분류로 정리 권장</p>
            </div>
          }
        >
          <p className="text-xs text-slate-500">
            현재 팀원들이 담당하는 업무를 간략히 기재해주세요. 인력 부족을 객관적으로 증명하는 데 활용됩니다.
          </p>

          {deptEmps.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
              {allEmployees.length === 0
                ? "직원 데이터 로딩 중..."
                : `${form.department}에 등록된 직원이 없습니다.`}
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {deptEmps.map((m) => (
                <div key={m.employee_id} className="border rounded-xl p-3 bg-slate-50 flex gap-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-white text-xs font-bold">
                    {m.full_name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800">{m.full_name}</span>
                      {m.job_title && (
                        <span className="text-[10px] text-slate-500 bg-white border px-1.5 py-0.5 rounded-full">{m.job_title}</span>
                      )}
                    </div>
                    <textarea
                      className="w-full h-14 border rounded-lg p-2 text-xs resize-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="주요 담당 업무를 간략히 기재해주세요 (예: 소방설비 도면 작성, 현장 감리)"
                      value={m.current_work}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          current_team_work: prev.current_team_work.map((t) =>
                            t.employee_id === m.employee_id ? { ...t, current_work: e.target.value } : t
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* ── D. 신규 TO 업무 명세 ── */}
        <Section
          badge="D"
          title="신규 TO 업무 명세 (JD)"
          guide={
            <div className="space-y-1">
              <p className="font-semibold mb-1">📌 선진 기업의 JD 작성 기준</p>
              <p>· <b>Netflix</b>: &lsquo;Day 30 / Day 90 / Day 180&rsquo; 기준으로 신규 입사자가 달성해야 할 성과를 구체적으로 기술</p>
              <p>· <b>Google</b>: Must-have vs. Nice-to-have 자격 요건을 명확히 분리</p>
              <p>· <b>LinkedIn</b>: 자격증보다 &lsquo;실제 업무 수행 가능 여부&rsquo; 중심으로 작성</p>
              <p>· <b>Samsung</b>: 직군 코드(소방설계/시공/관리) + 핵심역량 3가지 필수 기재</p>
            </div>
          }
        >
          <Field
            label="담당 업무 기술 (Job Description)"
            hint="신규 입사자가 수행하게 될 핵심 업무를 구체적으로 작성해주세요."
            required
          >
            <textarea
              className={`${inputCls} h-28 resize-none`}
              placeholder={"예:\n- 소방설비 설계 도면 작성 및 검토\n- 현장 감리 및 공정 관리\n- 발주처 기술 협의 참여"}
              value={form.new_work_jd}
              onChange={(e) => set("new_work_jd", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="필수 자격증" hint="쉼표로 구분 (예: 소방설비기사, 소방시설관리사)">
              <input
                className={inputCls}
                placeholder="소방설비기사, 소방시설관리사"
                value={form.required_licenses.join(", ")}
                onChange={(e) =>
                  set("required_licenses", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                }
              />
            </Field>
            <Field label="경력 요건" hint="예: 동종업계 3년 이상">
              <input
                className={inputCls}
                placeholder="소방설계 3년 이상"
                value={form.experience_req}
                onChange={(e) => set("experience_req", e.target.value)}
              />
            </Field>
          </div>

          <Field label="우대 조건" hint="Must가 아닌 있으면 좋은 조건">
            <input
              className={inputCls}
              placeholder="AutoCAD 능숙, 플랜트 경험 우대"
              value={form.preferred_cond}
              onChange={(e) => set("preferred_cond", e.target.value)}
            />
          </Field>
        </Section>

        {/* ── E. 비고 ── */}
        <Section badge="E" title="추가 사항 및 비고">
          <Field label="비고" hint="위에서 기술하지 못한 특이사항, 경영진에게 전달할 내용 등">
            <textarea
              className={`${inputCls} h-20 resize-none`}
              placeholder="예: 해당 인원은 3개월 이내 합류 필요 / 특수 공사 투입 예정"
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
            />
          </Field>
        </Section>

        {/* ── 제출 버튼 ── */}
        <div className="bg-white rounded-xl border shadow-sm px-6 py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-slate-500">
              <p className="font-semibold text-slate-700 mb-0.5">제출 전 확인 사항</p>
              <ul className="space-y-0.5 list-disc pl-4">
                <li>신청자 성명 기입 여부</li>
                <li>충원 사유 선택 및 상세 내용 기재 여부</li>
                <li>신규 TO 담당 업무 기술 여부</li>
              </ul>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isPending || form.reasons.length === 0 || !form.requester_name.trim()}
              className="bg-primary hover:bg-primary/90 text-white px-10 py-2.5 rounded-xl font-bold shadow-md text-sm"
            >
              {isPending ? "제출 중..." : "TO 충원 신청 제출"}
            </Button>
          </div>
          <p className="text-[10px] text-slate-400 text-center mt-3">
            제출 후 경영관리부에서 검토 → 부사장 승인 → 채용 진행 순서로 처리됩니다.
          </p>
        </div>

      </div>
    </Shell>
  );
}
