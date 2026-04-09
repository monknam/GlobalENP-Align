import React, { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { useSubmitTORequest } from "@/hooks/use-org-management";
import { useGetEmployees } from "@/hooks/use-evaluation";
import { useToast } from "@/hooks/use-toast";

const DEPARTMENTS = [
  "연구설계부",
  "개발생산부",
  "커미셔닝/현장관리부",
  "영업행정관리부",
  "경영지원부",
  "연구개발부",
];

interface TeamMemberWork {
  employee_id: string;
  full_name: string;
  job_title: string;
  current_work: string;
}

export default function TORequestForm() {
  const [step, setStep] = useState(1);
  const { mutate: submitForm, isPending } = useSubmitTORequest();
  const { toast } = useToast();
  const { data: allEmployees = [] } = useGetEmployees(true);

  const [formData, setFormData] = useState({
    department: "연구설계부",
    requester_name: "",
    target_rank: "",
    headcount: 1,
    employment_type: "정규직",
    reasons: [] as string[],
    current_team_work: [] as TeamMemberWork[],
    new_work_jd: "",
    required_licenses: [] as string[],
  });

  // 부서 변경 시 팀원 목록 초기화
  useEffect(() => {
    const deptEmployees = allEmployees.filter(
      (e) => e.department === formData.department
    );
    setFormData((prev) => ({
      ...prev,
      current_team_work: deptEmployees.map((e) => ({
        employee_id: e.id,
        full_name: e.fullName,
        job_title: e.jobTitle ?? "",
        current_work: "",
      })),
    }));
  }, [formData.department, allEmployees]);

  const updateMemberWork = (employeeId: string, work: string) => {
    setFormData((prev) => ({
      ...prev,
      current_team_work: prev.current_team_work.map((m) =>
        m.employee_id === employeeId ? { ...m, current_work: work } : m
      ),
    }));
  };

  const handleNext = () => setStep((s) => Math.min(s + 1, 5));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = () => {
    if (!formData.requester_name.trim()) {
      toast({ variant: "destructive", title: "신청자 성명을 입력해주세요." });
      setStep(1);
      return;
    }
    submitForm(
      { ...formData, current_team_work: formData.current_team_work },
      {
        onSuccess: () => {
          toast({
            title: "제출 성공",
            description: "TO 충원 신청이 성공적으로 접수되었습니다.",
          });
          setStep(1);
          setFormData({
            department: "연구설계부",
            requester_name: "",
            target_rank: "",
            headcount: 1,
            employment_type: "정규직",
            reasons: [],
            current_team_work: [],
            new_work_jd: "",
            required_licenses: [],
          });
        },
        onError: (err) => {
          toast({
            variant: "destructive",
            title: "제출 실패",
            description: err.message,
          });
        },
      }
    );
  };

  return (
    <Shell>
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold">인력 충원(TO) 신청</h1>
          <p className="text-muted-foreground mt-1">
            부서의 목표 달성과 원활한 운영을 위해 필요한 인력을 신청합니다.
          </p>

          {/* Step 진행률 바 */}
          <div className="flex items-center mt-6 gap-2">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  step >= idx ? "bg-primary" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
            <span>기본 정보</span>
            <span>충원 사유</span>
            <span>팀원 업무 현황</span>
            <span>신규 담당 업무</span>
            <span>최종 확인</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-8 min-h-[400px]">
          {/* Step 1: 기본 정보 */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-lg font-bold">Step 1. 기본 정보</h2>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  신청 부서
                </label>
                <select
                  className="w-full mt-1 border rounded-lg p-2.5 bg-slate-50"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  신청자 성명
                </label>
                <input
                  type="text"
                  className="w-full mt-1 border rounded-lg p-2.5"
                  placeholder="예: 홍길동"
                  value={formData.requester_name}
                  onChange={(e) =>
                    setFormData({ ...formData, requester_name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    희망 직급
                  </label>
                  <input
                    type="text"
                    className="w-full mt-1 border rounded-lg p-2.5"
                    placeholder="예: 과장/대리"
                    value={formData.target_rank}
                    onChange={(e) =>
                      setFormData({ ...formData, target_rank: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">
                    신청 인원
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full mt-1 border rounded-lg p-2.5"
                    value={formData.headcount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        headcount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700">
                  고용 형태
                </label>
                <select
                  className="w-full mt-1 border rounded-lg p-2.5 bg-slate-50"
                  value={formData.employment_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employment_type: e.target.value,
                    })
                  }
                >
                  <option value="정규직">정규직</option>
                  <option value="계약직">계약직</option>
                  <option value="파견">파견</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: 충원 사유 */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-lg font-bold">Step 2. 충원 사유</h2>
              <p className="text-sm text-slate-500">
                충원에 가장 부합하는 사유를 선택해주세요. (복수 선택 가능)
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {[
                  "기존인력 퇴사대체",
                  "신규업무 발생",
                  "조직확대/수주증가",
                  "법정의무인력 확보",
                ].map((reason) => (
                  <button
                    key={reason}
                    className={`px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
                      formData.reasons.includes(reason)
                        ? "bg-primary text-white border-primary"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                    onClick={() => {
                      const ns = formData.reasons.includes(reason)
                        ? formData.reasons.filter((r) => r !== reason)
                        : [...formData.reasons, reason];
                      setFormData({ ...formData, reasons: ns });
                    }}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              {formData.reasons.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                  최소 1개 이상의 충원 사유를 선택해주세요.
                </p>
              )}
            </div>
          )}

          {/* Step 3: 팀원 업무 현황 */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-lg font-bold">Step 3. 현재 팀원 업무 현황</h2>
              <p className="text-sm bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100">
                기존 팀원들의 현재 담당 업무를 기재하여 추가 인력의 필요성을 객관적으로 증명합니다.
              </p>

              {formData.current_team_work.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                  {allEmployees.length === 0
                    ? "직원 데이터를 불러오는 중..."
                    : `${formData.department}에 소속된 직원이 없습니다.`}
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {formData.current_team_work.map((member) => (
                    <div
                      key={member.employee_id}
                      className="border rounded-xl p-4 bg-slate-50"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-slate-800">
                          {member.full_name}
                        </span>
                        {member.job_title && (
                          <span className="text-xs text-slate-500 bg-white border px-2 py-0.5 rounded-full">
                            {member.job_title}
                          </span>
                        )}
                      </div>
                      <textarea
                        className="w-full h-20 border rounded-lg p-2.5 text-sm resize-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder="현재 담당하고 있는 주요 업무를 간략히 기재해주세요."
                        value={member.current_work}
                        onChange={(e) =>
                          updateMemberWork(member.employee_id, e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: 신규 TO 담당 업무 */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-lg font-bold">Step 4. 신규 TO 담당 업무</h2>
              <p className="text-sm text-slate-500">
                신규 입사자가 수행하게 될 핵심 업무와 요구 스펙을 작성합니다.
              </p>
              <textarea
                className="w-full h-40 border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="담당하게 될 주요 업무(Job Description)를 상세히 작성해주세요."
                value={formData.new_work_jd}
                onChange={(e) =>
                  setFormData({ ...formData, new_work_jd: e.target.value })
                }
              />
            </div>
          )}

          {/* Step 5: 최종 확인 */}
          {step === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <h2 className="text-lg font-bold">Step 5. 최종 검토 및 제출</h2>
              <div className="bg-slate-50 rounded-xl p-6 border">
                <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">
                  신청 내역 요약
                </h3>
                <dl className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <dt className="text-slate-500">부서</dt>
                    <dd className="font-medium">{formData.department}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">신청자</dt>
                    <dd className="font-medium">
                      {formData.requester_name || "미입력"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">인원/직급</dt>
                    <dd className="font-medium">
                      {formData.headcount}명 (
                      {formData.target_rank || "입력안됨"})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">고용 형태</dt>
                    <dd className="font-medium">{formData.employment_type}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">충원 사유</dt>
                    <dd className="font-medium">
                      {formData.reasons.join(", ") || "선택안함"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-500">팀원 업무 현황 기재</dt>
                    <dd className="font-medium">
                      {
                        formData.current_team_work.filter(
                          (m) => m.current_work.trim()
                        ).length
                      }
                      명 / {formData.current_team_work.length}명 작성됨
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="text-xs text-center text-slate-400 mt-4">
                제출 시 경영지원부로 알림이 발송됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 하단 네비게이션 */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1 || isPending}
            className="px-8"
          >
            이전
          </Button>

          {step < 5 ? (
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 text-white rounded-full px-8"
            >
              다음 항목으로
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-12 font-bold shadow-lg shadow-blue-600/20"
            >
              {isPending ? "제출중..." : "최종 제출"}
            </Button>
          )}
        </div>
      </div>
    </Shell>
  );
}
