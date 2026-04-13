import React from "react";
import { useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useActiveSeason,
  useTeamWithStatus,
  useEnsureEval,
  getDeptJobGroup,
  type TeamMemberEvalStatus,
} from "@/hooks/use-simple-eval";
import { useEmployeesAdmin } from "@/hooks/use-org-management";
import {
  CheckCircle2,
  Clock,
  ChevronRight,
  Users,
  AlertCircle,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 부서 목록 (드롭다운용)
const DEPARTMENTS = [
  "연구설계부",
  "연구개발부",
  "커미셔닝",
  "개발생산부",
  "관리부",
  "경영관리부",
];

function StatusBadge({ status }: { status: "draft" | "submitted" | null }) {
  if (!status)
    return (
      <span className="enp-chip" style={{ background: "#f1f5f9", color: "#64748b" }}>
        미시작
      </span>
    );
  if (status === "submitted")
    return (
      <span className="enp-chip" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
        <CheckCircle2 size={10} /> 제출완료
      </span>
    );
  return (
    <span className="enp-chip" style={{ background: "#fef3c7", color: "#b45309" }}>
      <Clock size={10} /> 임시저장
    </span>
  );
}

function MemberRow({
  item,
  onStart,
  loading,
}: {
  item: TeamMemberEvalStatus;
  onStart: () => void;
  loading: boolean;
}) {
  const isSubmitted = item.evaluation?.status === "submitted";
  return (
    <div
      className="flex items-center gap-4 px-6 py-4 hover:bg-[hsl(var(--enp-surface-low))] transition-colors cursor-pointer"
      onClick={isSubmitted ? undefined : onStart}
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      {/* 아바타 */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
        style={{ background: "hsl(var(--enp-primary))" }}
      >
        {item.employee.full_name.charAt(0)}
      </div>

      {/* 이름 + 직책 */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[hsl(var(--enp-on-surface))] text-sm">
          {item.employee.full_name}
          {item.employee.is_department_head && (
            <span className="ml-2 text-[10px] font-semibold text-[hsl(var(--enp-primary))] bg-[hsl(var(--enp-primary-container))] px-1.5 py-0.5 rounded">
              부서장
            </span>
          )}
        </p>
        <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] mt-0.5">
          {item.employee.job_title}
          {item.employee.job_group && ` · ${item.employee.job_group}`}
        </p>
      </div>

      {/* 직군 */}
      <span className="hidden sm:block text-xs text-[hsl(var(--enp-on-surface-variant))] w-20 shrink-0">
        {getDeptJobGroup(item.employee.department)}
      </span>

      {/* 상태 */}
      <div className="w-24 flex justify-center">
        <StatusBadge status={item.evaluation?.status ?? null} />
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-2 shrink-0">
        {isSubmitted ? (
          <span className="text-xs text-[hsl(var(--enp-on-surface-variant))]">읽기전용</span>
        ) : (
          <button
            className="enp-btn enp-btn-primary text-xs px-3 py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onStart();
            }}
            disabled={loading}
          >
            {item.evaluation ? "이어서 작성" : "평가 시작"}
          </button>
        )}
        <ChevronRight size={16} className="text-[hsl(var(--enp-outline))]" />
      </div>
    </div>
  );
}

export default function SimpleEvalIndex() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isAdmin = user?.role === "admin";

  // 부서 선택 상태
  const [selectedDept, setSelectedDept] = React.useState<string>(DEPARTMENTS[0]);

  const { data: season, isLoading: seasonLoading } = useActiveSeason();
  const { data: teamData, isLoading: teamLoading } = useTeamWithStatus(
    season?.id ?? null,
    selectedDept
  );

  const ensureEval = useEnsureEval();
  const [startingId, setStartingId] = React.useState<string | null>(null);

  const handleStart = React.useCallback(
    async (item: TeamMemberEvalStatus) => {
      if (!season) return;

      // 이미 평가 레코드가 있으면 바로 이동
      if (item.evaluation?.id) {
        navigate(`/simple-eval/form/${item.evaluation.id}`);
        return;
      }

      // 없으면 생성 후 이동
      setStartingId(item.employee.id);
      try {
        const result = await ensureEval.mutateAsync({
          seasonId: season.id,
          evaluateeId: item.employee.id,
        });
        navigate(`/simple-eval/form/${result.id}`);
      } catch {
        toast({ title: "오류", description: "평가를 시작할 수 없습니다.", variant: "destructive" });
      } finally {
        setStartingId(null);
      }
    },
    [season, ensureEval, navigate, toast]
  );

  // 통계
  const total = teamData?.length ?? 0;
  const submitted = teamData?.filter((d) => d.evaluation?.status === "submitted").length ?? 0;
  const inProgress = teamData?.filter((d) => d.evaluation?.status === "draft").length ?? 0;

  return (
    <Shell>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <p className="enp-label mb-1">간이 성과평가</p>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Manrope, Pretendard, sans-serif" }}>
            팀원 평가 목록
          </h1>
          {season && (
            <p className="text-sm text-[hsl(var(--enp-on-surface-variant))] mt-1">
              {season.name} · 부서장 전용 · 제출 후 수정 불가
            </p>
          )}
        </div>

        {/* 시즌 없을 때 */}
        {!seasonLoading && !season && (
          <div className="enp-card p-8 text-center">
            <AlertCircle className="mx-auto mb-3 text-[hsl(var(--enp-outline))]" size={32} />
            <p className="font-semibold text-[hsl(var(--enp-on-surface))]">진행 중인 평가 시즌이 없습니다</p>
            <p className="text-sm text-[hsl(var(--enp-on-surface-variant))] mt-1">
              관리자에게 시즌 개설을 요청하세요.
            </p>
            {isAdmin && (
              <button
                className="enp-btn enp-btn-primary mt-4"
                onClick={() => navigate("/simple-eval/admin")}
              >
                관리자 페이지로 이동
              </button>
            )}
          </div>
        )}

        {season && (
          <>
            {/* 부서 선택 */}
            <div className="flex flex-wrap gap-2 items-center">
              <Building2 size={16} className="text-[hsl(var(--enp-on-surface-variant))]" />
              <span className="text-sm text-[hsl(var(--enp-on-surface-variant))]">부서 선택:</span>
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className="enp-btn text-xs px-3 py-1.5"
                  style={
                    selectedDept === dept
                      ? { background: "hsl(var(--enp-primary))", color: "#fff" }
                      : { background: "hsl(var(--enp-surface-mid))", color: "hsl(var(--enp-on-surface))" }
                  }
                >
                  {dept}
                </button>
              ))}
            </div>

            {/* 진행 현황 카드 */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "전체 팀원", value: total, icon: Users, color: "#00619c", bg: "#e0f0fc" },
                { label: "제출 완료", value: submitted, icon: CheckCircle2, color: "#2e7d32", bg: "#e8f5e9" },
                { label: "작성 중", value: inProgress, icon: Clock, color: "#b45309", bg: "#fef3c7" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="enp-card p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: bg }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <p className="enp-label">{label}</p>
                    <p
                      className="text-2xl font-bold"
                      style={{ fontFamily: "Manrope, sans-serif", color }}
                    >
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 팀원 목록 */}
            <div className="enp-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[hsl(var(--enp-surface-mid))]">
                <h2 className="font-semibold text-[hsl(var(--enp-on-surface))]">
                  {selectedDept} 팀원 ({total}명)
                </h2>
                <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] mt-0.5">
                  각 팀원을 클릭해 평가를 시작하거나 이어서 작성하세요.
                </p>
              </div>

              {teamLoading ? (
                <div className="px-6 py-12 text-center text-[hsl(var(--enp-on-surface-variant))] text-sm">
                  불러오는 중...
                </div>
              ) : !teamData?.length ? (
                <div className="px-6 py-12 text-center text-[hsl(var(--enp-on-surface-variant))] text-sm">
                  해당 부서에 등록된 직원이 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--enp-surface-mid))]">
                  {teamData.map((item) => (
                    <MemberRow
                      key={item.employee.id}
                      item={item}
                      onStart={() => handleStart(item)}
                      loading={startingId === item.employee.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* 등급 기준 안내 */}
            <div className="enp-card p-5">
              <p className="enp-label mb-3">등급 기준 요약</p>
              <div className="grid grid-cols-5 gap-2">
                {(["S", "A", "B", "C", "D"] as const).map((g) => (
                  <div
                    key={g}
                    className="rounded-lg p-3 text-center"
                    style={{ background: g === "S" ? "#e0f0fc" : g === "A" ? "#e8edf8" : g === "B" ? "#e8f5e9" : g === "C" ? "#fef3c7" : "#fdecea" }}
                  >
                    <p className="text-lg font-bold" style={{ fontFamily: "Manrope, sans-serif", color: g === "S" ? "#00619c" : g === "A" ? "#3d5d9e" : g === "B" ? "#2e7d32" : g === "C" ? "#b45309" : "#c0392b" }}>
                      {g}
                    </p>
                    <p className="text-[10px] mt-0.5 font-semibold" style={{ color: g === "S" ? "#00619c" : g === "A" ? "#3d5d9e" : g === "B" ? "#2e7d32" : g === "C" ? "#b45309" : "#c0392b" }}>
                      {g === "S" ? "탁월" : g === "A" ? "우수" : g === "B" ? "충족" : g === "C" ? "미흡" : "부진"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] mt-3">
                S·A는 전체의 10~15% 이내가 적정. D 등급은 경영진과 사전 협의 권장.
              </p>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
