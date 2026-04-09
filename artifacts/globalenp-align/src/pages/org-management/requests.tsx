import React, { useState } from "react";
import { Shell } from "@/components/layout/Shell";
import {
  useGetTORequests,
  useUpdateTORequestStatus,
  type TORequestStatus,
} from "@/hooks/use-org-management";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { FileText, ChevronDown } from "lucide-react";

const STATUS_OPTIONS: TORequestStatus[] = [
  "🟡 검토중",
  "🔵 승인완료",
  "🔄 채용중",
  "✅ 완료",
  "❌ 반려",
  "⏸ 보류",
];

const STATUS_STYLE: Record<TORequestStatus, string> = {
  "🟡 검토중": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "🔵 승인완료": "bg-blue-50 text-blue-700 border-blue-200",
  "🔄 채용중": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "✅ 완료": "bg-green-50 text-green-700 border-green-200",
  "❌ 반려": "bg-red-50 text-red-700 border-red-200",
  "⏸ 보류": "bg-slate-100 text-slate-600 border-slate-200",
};

export default function TORequestsAdmin() {
  const { data: requests = [], isLoading, isError } = useGetTORequests();
  const { mutate: updateStatus } = useUpdateTORequestStatus();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleStatusChange = (id: string, status: TORequestStatus) => {
    updateStatus(
      { id, approval_status: status },
      {
        onSuccess: () =>
          toast({ title: "상태가 변경되었습니다.", description: status }),
        onError: (err) =>
          toast({
            variant: "destructive",
            title: "상태 변경 실패",
            description: err.message,
          }),
      }
    );
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
        <div className="text-center p-8 text-red-500 bg-red-50 rounded-lg">
          신청 목록을 불러오는 중 오류가 발생했습니다.
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">TO 충원 신청 관리</h1>
          <p className="text-muted-foreground text-sm">
            부서에서 접수된 인력 충원 신청을 검토하고 상태를 변경합니다.
          </p>
        </div>

        {/* 요약 배지 */}
        <div className="flex flex-wrap gap-3">
          {STATUS_OPTIONS.map((s) => {
            const count = requests.filter((r) => r.approval_status === s).length;
            if (count === 0) return null;
            return (
              <span
                key={s}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${STATUS_STYLE[s]}`}
              >
                {s} {count}건
              </span>
            );
          })}
          {requests.length === 0 && (
            <span className="text-sm text-slate-400">접수된 신청이 없습니다.</span>
          )}
        </div>

        {/* 신청 목록 */}
        <div className="space-y-3">
          {requests.map((req) => {
            const isExpanded = expandedId === req.id;
            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border shadow-sm overflow-hidden"
              >
                {/* 헤더 행 */}
                <div
                  className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800">{req.doc_no}</span>
                      <span className="text-sm text-slate-500">{req.department}</span>
                      <span className="text-xs text-slate-400">신청자: {req.requester_name}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {req.headcount}명 · {req.target_rank || "직급 미정"} · {req.employment_type} ·{" "}
                      {req.requested_at}
                    </p>
                  </div>

                  {/* 상태 변경 드롭다운 */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border appearance-none cursor-pointer ${
                        STATUS_STYLE[req.approval_status]
                      }`}
                      value={req.approval_status}
                      onChange={(e) =>
                        handleStatusChange(req.id, e.target.value as TORequestStatus)
                      }
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* 펼침 상세 */}
                {isExpanded && (
                  <div className="border-t px-6 py-5 bg-slate-50 space-y-4 text-sm">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                        충원 사유
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(req.reasons ?? []).length > 0 ? (
                          req.reasons.map((r) => (
                            <Badge key={r} variant="outline" className="text-xs">
                              {r}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">없음</span>
                        )}
                      </div>
                    </div>

                    {req.new_work_jd && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                          신규 TO 직무 기술 (JD)
                        </p>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                          {req.new_work_jd}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
