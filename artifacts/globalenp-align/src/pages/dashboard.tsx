import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import { useGetDashboardOverview } from "@/hooks/use-dashboard";
import { useGetEvalCycles, useGetEvalInstances } from "@/hooks/use-evaluation";
import { Users, Building2, ClipboardCheck, ArrowRight, BarChart3, AlertTriangle, Target, Users2, Award, ClipboardList, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

const UPCOMING_MODULES = [
  { label: "360 피드백", icon: Users2, description: "구성원 간 상호 피드백" },
  { label: "OKR 운영", icon: Target, description: "조직 목표 정렬 및 실행 추적" },
];

export default function Dashboard() {
  const { isAuthorized, user } = useProtectedRoute();
  const { data: overview, isLoading, error } = useGetDashboardOverview();
  const { data: evalCycles = [] } = useGetEvalCycles();
  const activeCycle = evalCycles.find((c) => c.status === "active");
  const { data: evalInstances = [] } = useGetEvalInstances(activeCycle?.id);

  if (!isAuthorized) return null;

  const isAdmin = user?.role === "admin";
  const activeSurveys = overview?.recentSurveys?.filter((s) => s.status === "active") ?? [];

  return (
    <Shell>
      <div className="space-y-8">
        {/* 인사말 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div>
            <p className="text-sm font-medium text-[hsl(var(--neutral-500))] mb-1">안녕하세요</p>
            <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--neutral-900))]">{user?.fullName}님</h1>
            <p className="text-[hsl(var(--neutral-500))] mt-1 text-sm">
              {isAdmin
                ? "우리 조직의 현재 상태와 진행 중인 내부 진단을 확인하세요."
                : "현재 진행 중인 조직 진단에 참여해주세요."}
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/admin/surveys"
              className="ts-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              조직 진단 운영 <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </motion.div>

        {/* 로딩 */}
        {isLoading && (
          <div className={`grid gap-4 animate-pulse ${isAdmin ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"}`}>
            {(isAdmin ? [1, 2, 3] : [1]).map((i) => (
              <div key={i} className={`bg-[hsl(var(--neutral-200))] rounded-xl ${isAdmin ? "h-28" : "h-40"}`} />
            ))}
          </div>
        )}

        {/* 에러 */}
        {!isLoading && error && (
          <div className="ts-card p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-10 h-10 text-[hsl(var(--red-500))] mb-3" />
            <p className="text-[hsl(var(--neutral-900))] font-semibold mb-1">데이터를 불러오지 못했습니다.</p>
            <p className="text-sm text-[hsl(var(--neutral-500))]">잠시 후 다시 시도해주세요.</p>
          </div>
        )}

        {/* ── Admin 뷰 ─────────────────────────────── */}
        {!isLoading && !error && overview && isAdmin && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="총 구성원" value={overview.totalUsers} icon={Users} accent="primary" delay={0.1} />
              <StatCard title="총 부서 수" value={overview.totalDepartments} icon={Building2} accent="secondary" delay={0.2} />
              <StatCard title="진행 중인 진단" value={overview.activeSurveys} icon={ClipboardCheck} accent="neutral" delay={0.3} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[hsl(var(--neutral-900))] flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[hsl(var(--primary-400))]" />
                  현재 진행 중인 조직 진단
                </h2>
                <Link
                  href="/admin/results"
                  className="text-xs font-medium text-[hsl(var(--primary-400))] hover:underline flex items-center gap-1"
                >
                  진단 리포트 보기 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <SurveyList surveys={overview.recentSurveys ?? []} role="admin" />
            </div>

            {/* 인사평가 현황 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[hsl(var(--neutral-900))] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[hsl(var(--primary-400))]" />
                  인사평가 현황
                </h2>
                <Link
                  href="/evaluation"
                  className="text-xs font-medium text-[hsl(var(--primary-400))] hover:underline flex items-center gap-1"
                >
                  평가 관리 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {activeCycle ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="ts-card p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">진행 중</span>
                      <h3 className="font-bold text-[hsl(var(--neutral-900))] mt-1.5">{activeCycle.title}</h3>
                      <p className="text-xs text-[hsl(var(--neutral-500))] mt-0.5">{activeCycle.year}년</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-bold text-[hsl(var(--neutral-900))]">{evalInstances.length}</p>
                      <p className="text-xs text-[hsl(var(--neutral-500))]">총 평가 인원</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: "자기평가", count: evalInstances.filter((i) => i.workflowStatus === "pending_self").length, color: "text-zinc-600" },
                      { label: "1차 평가", count: evalInstances.filter((i) => i.workflowStatus === "pending_first").length, color: "text-blue-600" },
                      { label: "커미티", count: evalInstances.filter((i) => i.workflowStatus === "pending_committee" || i.workflowStatus === "pending_second").length, color: "text-amber-600" },
                      { label: "확정", count: evalInstances.filter((i) => i.workflowStatus === "confirmed").length, color: "text-emerald-600" },
                    ].map((s) => (
                      <div key={s.label} className="bg-[hsl(var(--neutral-50))] rounded-lg py-2.5">
                        <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
                        <p className="text-[10px] text-[hsl(var(--neutral-500))]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="ts-card p-8 flex flex-col items-center justify-center text-center"
                >
                  <Clock className="w-8 h-8 text-[hsl(var(--neutral-300))] mb-2" />
                  <p className="text-sm text-[hsl(var(--neutral-500))]">진행 중인 평가 사이클이 없습니다.</p>
                  <Link href="/evaluation" className="mt-3 text-xs font-medium text-[hsl(var(--primary-400))] hover:underline">
                    새 사이클 만들기 →
                  </Link>
                </motion.div>
              )}
            </div>

            <div>
              <h2 className="text-base font-bold text-[hsl(var(--neutral-900))] mb-4">사내 확장 예정 모듈</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {UPCOMING_MODULES.map((mod, i) => (
                  <UpcomingCard key={mod.label} mod={mod} delay={0.6 + i * 0.07} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Member / Leader 뷰 ───────────────────── */}
        {!isLoading && !error && overview && !isAdmin && (
          <>
            {/* 인사평가 바로가기 (활성 사이클 있을 때) */}
            {activeCycle && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="ts-card p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--neutral-900))]">{activeCycle.title}</p>
                    <p className="text-xs text-[hsl(var(--neutral-500))] mt-0.5">인사평가 진행 중 · {activeCycle.year}년</p>
                  </div>
                </div>
                <Link
                  href="/evaluation"
                  className="ts-btn-primary flex items-center gap-2 px-4 py-2 text-sm shrink-0"
                >
                  평가 바로가기 <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </motion.div>
            )}

            {activeSurveys.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="ts-card p-16 flex flex-col items-center justify-center text-center"
              >
                <ClipboardList className="w-12 h-12 text-[hsl(var(--neutral-300))] mb-4" />
                <p className="font-semibold text-[hsl(var(--neutral-700))] mb-1">현재 진행 중인 진단이 없습니다</p>
                <p className="text-sm text-[hsl(var(--neutral-500))]">새로운 진단이 시작되면 여기에 표시됩니다.</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {activeSurveys.map((survey, i) => (
                  <motion.div
                    key={survey.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className="ts-card p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:border-[hsl(var(--primary-200))] transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <StatusBadge status={survey.status} />
                        <span className="text-xs text-[hsl(var(--neutral-500))]">
                          {survey.year}년 {survey.quarter ? `${survey.quarter}분기` : ""}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-[hsl(var(--neutral-900))] mb-1">{survey.title}</h3>
                      <p className="text-sm text-[hsl(var(--neutral-500))]">
                        익명으로 진행되며 결과는 조직 개선에만 활용됩니다.
                      </p>
                    </div>
                    <Link
                      href={`/surveys/${survey.id}/intro`}
                      className="ts-btn-primary flex items-center gap-2 px-6 py-3 text-sm shrink-0"
                    >
                      진단 참여하기 <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}

// ── Sub-components ─────────────────────────────────────

function SurveyList({
  surveys,
  role,
}: {
  surveys: { id: string; title: string; year: number; quarter: number | null; status: string; responseRate: number; submittedCount: number; totalEligible: number }[];
  role: string;
}) {
  if (surveys.length === 0) {
    return (
      <div className="ts-card p-12 flex flex-col items-center justify-center text-center">
        <ClipboardCheck className="w-12 h-12 text-[hsl(var(--neutral-300))] mb-3" />
        <p className="text-[hsl(var(--neutral-500))] text-sm">아직 진행된 조직 진단이 없습니다.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {surveys.map((survey, i) => (
        <motion.div
          key={survey.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.08 }}
          className="ts-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[hsl(var(--primary-200))] transition-colors"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={survey.status} />
              <span className="text-xs text-[hsl(var(--neutral-500))]">
                {survey.year}년 {survey.quarter ? `${survey.quarter}분기` : ""}
              </span>
            </div>
            <h3 className="font-bold text-[hsl(var(--neutral-900))]">{survey.title}</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-[hsl(var(--neutral-500))] mb-1">응답률</p>
              <p className="text-xl font-bold text-[hsl(var(--neutral-900))]">{survey.responseRate.toFixed(1)}%</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-xs text-[hsl(var(--neutral-500))] mb-1">응답자</p>
              <p className="text-sm font-semibold text-[hsl(var(--neutral-700))]">
                {survey.submittedCount} / {survey.totalEligible}
              </p>
            </div>
            <Link
              href={role === "admin" ? `/admin/results` : `/surveys/${survey.id}/intro`}
              className="w-9 h-9 rounded-lg bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))] hover:bg-[hsl(var(--primary-400))] hover:text-white transition-colors flex items-center justify-center"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function UpcomingCard({ mod, delay }: { mod: { label: string; icon: React.ElementType; description: string }; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="ts-card p-5 flex items-start gap-4 opacity-60"
    >
      <div className="p-2.5 rounded-lg bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-400))] shrink-0">
        <mod.icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[hsl(var(--neutral-700))]">{mod.label}</p>
        <p className="text-xs text-[hsl(var(--neutral-500))] mt-0.5">{mod.description}</p>
        <span className="mt-2 inline-block text-[10px] font-semibold bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-500))] px-2 py-0.5 rounded-full">
          준비 중
        </span>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-[hsl(142_76%_36%/0.1)] text-[hsl(var(--green-500))]",
    draft: "bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-600))]",
    closed: "bg-[hsl(207_90%_54%/0.1)] text-[hsl(var(--blue-400))]",
  };
  const labels: Record<string, string> = { active: "진행중", draft: "준비중", closed: "종료됨" };
  return (
    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}

function StatCard({
  title, value, icon: Icon, accent, delay,
}: {
  title: string; value: number; icon: React.ElementType; accent: string; delay: number;
}) {
  const accentColor: Record<string, string> = {
    primary: "bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))]",
    secondary: "bg-[hsl(var(--secondary-100))] text-[hsl(var(--secondary-400))]",
    neutral: "bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-600))]",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="ts-card p-5 flex items-center gap-4"
    >
      <div className={`p-3 rounded-lg ${accentColor[accent]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-[hsl(var(--neutral-900))]">{value}</p>
      </div>
    </motion.div>
  );
}
