import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import { useGetEvaluationCycles, useGetEmployeeEvaluations, type EmployeeEvaluation } from "@/hooks/use-performance";
import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Award, ArrowRight, AlertTriangle, Users, CheckCircle2, Clock, ChevronDown } from "lucide-react";

const GRADE_STYLES: Record<string, string> = {
  S: "bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))]",
  A: "bg-[hsl(142_76%_36%/0.1)] text-[hsl(var(--green-500))]",
  B: "bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-600))]",
  C: "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_40%)]",
  D: "bg-[hsl(0_84%_60%/0.1)] text-[hsl(var(--red-500))]",
};

const PROGRESS_STYLES: Record<string, string> = {
  pending:   "bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-500))]",
  reviewing: "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_40%)]",
  confirmed: "bg-[hsl(142_76%_36%/0.1)] text-[hsl(var(--green-500))]",
};

const PROGRESS_LABELS: Record<string, string> = {
  pending:   "대기",
  reviewing: "검토 중",
  confirmed: "확정",
};

interface Props {
  params?: { cycleId?: string };
}

export default function PerformanceList({ params }: Props) {
  const { isAuthorized } = useProtectedRoute(["admin"]);
  const { data: cycles, isLoading: cyclesLoading } = useGetEvaluationCycles();
  const [selectedCycleId, setSelectedCycleId] = useState<string | undefined>(params?.cycleId);

  const activeCycleId = selectedCycleId ?? cycles?.[0]?.id;
  const activeCycle = cycles?.find((c) => c.id === activeCycleId);

  const { data: evaluations, isLoading: evalsLoading, error } = useGetEmployeeEvaluations(activeCycleId);

  if (!isAuthorized) return null;

  const isLoading = cyclesLoading || evalsLoading;
  const total = evaluations?.length ?? 0;
  const confirmed = evaluations?.filter((e) => e.isConfirmed).length ?? 0;
  const reviewing = evaluations?.filter((e) => e.progressStatus === "reviewing").length ?? 0;
  const progressRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  return (
    <Shell>
      <div className="space-y-6">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <div>
            <p className="text-sm font-medium text-[hsl(var(--neutral-500))] mb-1">성과평가</p>
            <h1 className="text-2xl font-bold text-[hsl(var(--neutral-900))] flex items-center gap-2">
              <Award className="w-6 h-6 text-[hsl(var(--primary-400))]" />
              인사평가 리뷰
            </h1>
          </div>

          {/* 사이클 선택 */}
          {cycles && cycles.length > 1 && (
            <div className="relative">
              <select
                value={activeCycleId ?? ""}
                onChange={(e) => setSelectedCycleId(e.target.value)}
                className="appearance-none ts-card px-4 py-2.5 pr-9 text-sm font-medium text-[hsl(var(--neutral-900))] cursor-pointer focus:outline-none"
              >
                {cycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--neutral-400))] pointer-events-none" />
            </div>
          )}
        </motion.div>

        {/* 사이클 없음 */}
        {!isLoading && (!cycles || cycles.length === 0) && (
          <div className="ts-card p-16 flex flex-col items-center justify-center text-center">
            <Award className="w-12 h-12 text-[hsl(var(--neutral-300))] mb-4" />
            <p className="font-semibold text-[hsl(var(--neutral-700))] mb-1">등록된 평가 사이클이 없습니다</p>
            <p className="text-sm text-[hsl(var(--neutral-500))]">Supabase에서 evaluation_cycles 데이터를 먼저 입력해주세요.</p>
          </div>
        )}

        {/* 로딩 */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-[hsl(var(--neutral-200))] rounded-xl" />
            ))}
          </div>
        )}

        {/* 에러 */}
        {!isLoading && error && (
          <div className="ts-card p-8 flex flex-col items-center text-center">
            <AlertTriangle className="w-10 h-10 text-[hsl(var(--red-500))] mb-3" />
            <p className="font-semibold text-[hsl(var(--neutral-900))] mb-1">데이터를 불러오지 못했습니다</p>
            <p className="text-sm text-[hsl(var(--neutral-500))]">잠시 후 다시 시도해주세요.</p>
          </div>
        )}

        {/* 요약 통계 */}
        {!isLoading && !error && activeCycle && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SummaryCard
                icon={Users}
                label="전체 평가 인원"
                value={`${total}명`}
                accent="neutral"
                delay={0.1}
              />
              <SummaryCard
                icon={Clock}
                label="검토 중"
                value={`${reviewing}명`}
                accent="warning"
                delay={0.15}
              />
              <SummaryCard
                icon={CheckCircle2}
                label={`확정 완료 (${progressRate}%)`}
                value={`${confirmed}명`}
                accent="success"
                delay={0.2}
              />
            </div>

            {/* 진행률 바 */}
            <div className="ts-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[hsl(var(--neutral-500))]">전체 진행률</span>
                <span className="text-xs font-bold text-[hsl(var(--neutral-900))]">{progressRate}%</span>
              </div>
              <div className="h-2 bg-[hsl(var(--neutral-100))] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressRate}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-[hsl(var(--primary-400))] rounded-full"
                />
              </div>
            </div>

            {/* 직원 테이블 */}
            {evaluations && evaluations.length === 0 ? (
              <div className="ts-card p-12 flex flex-col items-center text-center">
                <Users className="w-12 h-12 text-[hsl(var(--neutral-300))] mb-4" />
                <p className="font-semibold text-[hsl(var(--neutral-700))] mb-1">평가 대상자가 없습니다</p>
                <p className="text-sm text-[hsl(var(--neutral-500))]">employee_evaluations 테이블에 데이터를 입력해주세요.</p>
              </div>
            ) : (
              <div className="ts-card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(var(--neutral-100))]">
                        <Th>조직 / 성명</Th>
                        <Th>재직연수</Th>
                        <Th className="text-right">전년평가</Th>
                        <Th className="text-right">본인</Th>
                        <Th className="text-right">팀장</Th>
                        <Th className="text-right">상위자</Th>
                        <Th className="text-right">CEO 조정</Th>
                        <Th className="text-center">Grade</Th>
                        <Th className="text-center">상태</Th>
                        <Th />
                      </tr>
                    </thead>
                    <tbody>
                      {evaluations?.map((ev, i) => (
                        <EvaluationRow key={ev.id} evaluation={ev} index={i} cycleId={activeCycleId!} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-5 py-3.5 text-left text-xs font-semibold text-[hsl(var(--neutral-500))] bg-[hsl(var(--neutral-50))] ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function EvaluationRow({
  evaluation: ev,
  index,
  cycleId,
}: {
  evaluation: EmployeeEvaluation;
  index: number;
  cycleId: string;
}) {
  const fmt = (v: number | null) => (v != null ? v.toFixed(1) : "—");

  return (
    <motion.tr
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      className="border-b border-[hsl(var(--neutral-100))] hover:bg-[hsl(var(--neutral-50))] transition-colors"
    >
      <td className="px-5 py-4">
        <p className="font-semibold text-[hsl(var(--neutral-900))]">{ev.fullName}</p>
        <p className="text-xs text-[hsl(var(--neutral-500))]">{ev.department ?? "—"}</p>
      </td>
      <td className="px-5 py-4 text-[hsl(var(--neutral-700))]">
        {ev.tenureYears != null ? `${ev.tenureYears}년` : "—"}
      </td>
      <td className="px-5 py-4 text-right text-[hsl(var(--neutral-700))]">{fmt(ev.scorePrevYear)}</td>
      <td className="px-5 py-4 text-right text-[hsl(var(--neutral-700))]">{fmt(ev.scoreSelf)}</td>
      <td className="px-5 py-4 text-right text-[hsl(var(--neutral-700))]">{fmt(ev.scorePeer)}</td>
      <td className="px-5 py-4 text-right text-[hsl(var(--neutral-700))]">{fmt(ev.scoreUpper)}</td>
      <td className="px-5 py-4 text-right font-bold text-[hsl(var(--neutral-900))]">
        {fmt(ev.scoreCeoAdjusted)}
      </td>
      <td className="px-5 py-4 text-center">
        {ev.gradeCeo ? (
          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${GRADE_STYLES[ev.gradeCeo] ?? GRADE_STYLES.B}`}>
            {ev.gradeCeo}
          </span>
        ) : (
          <span className="text-xs text-[hsl(var(--neutral-400))]">—</span>
        )}
      </td>
      <td className="px-5 py-4 text-center">
        <span
          className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${PROGRESS_STYLES[ev.progressStatus] ?? PROGRESS_STYLES.pending}`}
        >
          {PROGRESS_LABELS[ev.progressStatus] ?? ev.progressStatus}
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        <Link
          href={`/admin/performance/${cycleId}/${ev.id}`}
          className="w-8 h-8 rounded-lg bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))] hover:bg-[hsl(var(--primary-400))] hover:text-white transition-colors flex items-center justify-center ml-auto"
        >
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </td>
    </motion.tr>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  accent,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: "neutral" | "warning" | "success";
  delay: number;
}) {
  const accentStyles = {
    neutral: "bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-600))]",
    warning: "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_40%)]",
    success: "bg-[hsl(142_76%_36%/0.1)] text-[hsl(var(--green-500))]",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="ts-card p-5 flex items-center gap-4"
    >
      <div className={`p-3 rounded-lg ${accentStyles[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[hsl(var(--neutral-900))]">{value}</p>
      </div>
    </motion.div>
  );
}
