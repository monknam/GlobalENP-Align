import React from "react";
import { Shell } from "@/components/layout/Shell";
import { useDepartmentOrgChart } from "@/hooks/use-org-management";
import { Building2, Users2, Target } from "lucide-react";

export default function OrgDashboard() {
  const { data: departments, isLoading, isError } = useDepartmentOrgChart();

  if (isLoading) {
    return (
      <Shell>
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">조직/TO 현황판</h1>
          <p className="text-muted-foreground">부서별 인력 스펙과 부여된 직무 롤을 확인하고 충원 상황을 조망합니다.</p>
        </div>

        {/* 대시보드 통계 위젯 (간이) */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-white p-6 tracking-tight shadow-sm border rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-muted-foreground mb-1">총 부서 수</p>
              <h3 className="text-2xl font-bold">{departments?.length || 0}</h3>
            </div>
            <div className="p-3 bg-neutral-100 rounded-lg"><Building2 className="w-5 h-5 text-neutral-600" /></div>
          </div>
          <div className="bg-white p-6 tracking-tight shadow-sm border rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-muted-foreground mb-1">총 현원 (PO)</p>
              <h3 className="text-2xl font-bold">
                {departments?.reduce((acc, dept) => acc + dept.employees.length, 0) || 0}
              </h3>
            </div>
            <div className="p-3 bg-neutral-100 rounded-lg"><Users2 className="w-5 h-5 text-neutral-600" /></div>
          </div>
          <div className="bg-white p-6 tracking-tight shadow-sm border rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[13px] font-semibold text-muted-foreground mb-1">오픈/승인된 TO</p>
              <h3 className="text-2xl font-bold text-primary">
                {departments?.reduce((acc, dept) => acc + dept.toPositions.length, 0) || 0}
              </h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg"><Target className="w-5 h-5 text-primary" /></div>
          </div>
        </div>

        {/* 조직도 트리/리스트 영역 */}
        <div className="mt-8 space-y-6">
          {departments?.map((dept) => (
            <div key={dept.departmentName} className="bg-white rounded-xl border shadow-sm p-0 overflow-hidden">
              <div className="bg-slate-50 border-b px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800">{dept.departmentName}</h3>
                <div className="flex gap-3 text-sm">
                  <span className="bg-white px-3 py-1 rounded-full border shadow-sm font-medium">현원(PO) {dept.employees.length}명</span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-medium">TO 슬롯 {dept.toPositions.length}개</span>
                </div>
              </div>

              <div className="p-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 bg-[#f7f9fc]">
                {/* 1. 현원 렌더링 */}
                {dept.employees.map((emp) => (
                  <div key={emp.id} className="bg-white rounded-xl p-5 border shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900">{emp.full_name} <span className="text-sm font-normal text-slate-500 ml-1">{emp.job_title}</span></h4>
                        {emp.job_role && <p className="text-xs text-slate-400 mt-0.5">{emp.job_role}</p>}
                      </div>
                      <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase">PO</span>
                    </div>

                    <div className="mt-4">
                      <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">주요 담당 업무</p>
                      {emp.employee_tasks && emp.employee_tasks.length > 0 ? (
                        <ul className="space-y-2">
                          {emp.employee_tasks.map(t => (
                            <li key={t.id} className="text-sm border-l-2 border-slate-200 pl-2">
                              <span className="block font-medium text-slate-700">{t.task_name}</span>
                              {t.description && <span className="block text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</span>}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400 italic">등록된 업무 내용이 없습니다.</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* 2. 빈자리 TO 렌더링 */}
                {dept.toPositions.map((pos) => (
                  <div key={pos.id} className="bg-white/60 rounded-xl p-5 border border-dashed border-primary/50 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-primary">{pos.position_name} <span className="text-sm font-normal opacity-80 ml-1">{pos.title}</span></h4>
                      </div>
                      <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase animate-pulse">TO ({pos.recruit_status})</span>
                    </div>

                    <div className="mt-4">
                      <p className="text-[11px] font-semibold text-primary/60 mb-2 uppercase tracking-wider">투입 예정 업무</p>
                      {pos.required_tasks && pos.required_tasks.length > 0 ? (
                        <ul className="flex flex-wrap gap-1.5">
                          {pos.required_tasks.map((rt, i) => (
                            <li key={i} className="text-[11px] font-medium bg-primary/5 text-primary/80 px-2.5 py-1 rounded-md border border-primary/10">
                              {rt}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-slate-400 italic">지정된 예정 업무가 없습니다.</span>
                      )}
                      
                      <div className="mt-4 pt-3 border-t border-primary/10 flex justify-between items-center">
                         <span className="text-xs text-slate-500">목표 입사: {pos.target_hire_date || '미정'}</span>
                         <span className="text-xs font-semibold text-primary">{pos.approval_status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {departments?.length === 0 && (
            <div className="text-center py-12 text-slate-500 border-2 border-dashed rounded-xl">
              등록된 조직 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
