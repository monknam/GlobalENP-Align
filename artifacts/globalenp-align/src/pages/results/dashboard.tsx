import { useState } from "react";
import { useAuth, useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import { useGetSurveys } from "@/hooks/use-surveys";
import {
  useSurveyDashboard, useQualitative, useActionItems,
  useCreateActionItem, useUpdateActionItem, useDeleteActionItem,
  computeCompositeIndices, computeStrengthsAndRisks, buildDiagnosisSentence,
  scoreColor, scoreBg,
  type ActionItem, type SectionResult, type QualitativeData,
} from "@/hooks/use-dashboard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Activity, Building2, MessageSquare, ListChecks,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Users, Plus, Trash2,
  ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Tab definitions ──────────────────────────────────────────
const TABS = [
  { id: "executive", label: "진단 요약", icon: LayoutDashboard },
  { id: "health", label: "조직 건강 진단", icon: Activity },
  { id: "comparison", label: "조직 단위 비교", icon: Building2 },
  { id: "qualitative", label: "정성 응답 분석", icon: MessageSquare },
  { id: "action", label: "개선 실행 계획", icon: ListChecks },
] as const;

type TabId = typeof TABS[number]["id"];

// ── Main Dashboard Page ──────────────────────────────────────
export default function ResultsDashboard() {
  const { isAuthorized } = useProtectedRoute(["admin", "leader"]);
  const { data: surveys } = useGetSurveys();
  const [activeTab, setActiveTab] = useState<TabId>("executive");
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");
  const surveyList = Array.isArray(surveys) ? surveys : [];

  const availableSurveys = surveyList.filter((s) => s.status !== "draft");
  const effectiveSurveyId = selectedSurveyId || availableSurveys[0]?.id || null;

  const { data: dashboard, isLoading } = useSurveyDashboard(effectiveSurveyId);
  const { data: qualData } = useQualitative(effectiveSurveyId);

  if (!isAuthorized) return null;

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(var(--neutral-900))]">조직 진단 리포트</h1>
            <p className="text-sm text-[hsl(var(--neutral-500))] mt-0.5">구성원 응답을 바탕으로 우리 조직의 현재 상태를 해석하고 내부 개선 방향을 도출합니다.</p>
          </div>
          <select
            value={selectedSurveyId || effectiveSurveyId || ""}
            onChange={(e) => setSelectedSurveyId(e.target.value)}
            className="ts-input max-w-xs text-sm font-medium"
          >
            {availableSurveys.length === 0 && <option value="">진행된 설문 없음</option>}
            {availableSurveys.map((s) => (
              <option key={s.id} value={s.id}>{s.year} {s.quarter ? `Q${s.quarter}` : ""} · {s.title}</option>
            ))}
          </select>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-[hsl(var(--neutral-100))] p-1 rounded-lg w-full overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all",
                activeTab === tab.id
                  ? "bg-white text-[hsl(var(--neutral-900))] shadow-sm"
                  : "text-[hsl(var(--neutral-500))] hover:text-[hsl(var(--neutral-700))]"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ts-notice-box">
          <p className="text-sm text-[hsl(var(--neutral-700))]">
            이 리포트는 개인 평가가 아니라 우리 조직의 개선을 위한 내부 진단 자료입니다. 모든 해석은 익명성과 통계 기준을 전제로 제공됩니다.
          </p>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-[hsl(var(--neutral-500))]">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>데이터를 불러오는 중...</span>
          </div>
        ) : !dashboard ? (
          <EmptyState />
        ) : (
          <>
            {activeTab === "executive" && <ExecutiveSummaryTab dashboard={dashboard} />}
            {activeTab === "health" && <HealthDiagnosisTab sectionResults={dashboard.sectionResults} submittedCount={dashboard.submittedCount} />}
            {activeTab === "comparison" && <ComparisonTab dashboard={dashboard} />}
            {activeTab === "qualitative" && <QualitativeTab data={qualData ?? null} />}
            {activeTab === "action" && <ActionPlannerTab surveyId={effectiveSurveyId} />}
          </>
        )}
      </div>
    </Shell>
  );
}

// ── A. Executive Summary ─────────────────────────────────────
function ExecutiveSummaryTab({ dashboard }: { dashboard: ReturnType<typeof useSurveyDashboard>["data"] & object }) {
  const indices = computeCompositeIndices(dashboard.sectionResults);
  const { strengths, risks } = computeStrengthsAndRisks(dashboard.sectionResults);
  const diagnosis = buildDiagnosisSentence(dashboard.sectionResults);

  const radarData = dashboard.sectionResults
    .filter((s) => s.avgScore !== null)
    .map((s) => ({ subject: s.sectionName.length > 6 ? s.sectionName.slice(0, 6) + "…" : s.sectionName, score: s.avgScore ?? 0, fullMark: 5 }));

  return (
    <div className="space-y-5">
      {/* Diagnosis Banner */}
      <div className="ts-notice-box">
        <p className="text-xs font-semibold text-[hsl(var(--primary-400))] uppercase tracking-wider mb-1">조직 진단 요약</p>
        <p className="text-[hsl(var(--neutral-900))] font-medium leading-relaxed">{diagnosis}</p>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard title="전체 응답률" value={`${dashboard.overallResponseRate.toFixed(1)}%`} subtitle={`${dashboard.submittedCount} / ${dashboard.totalEligible}명`} />
        <IndexCard title="변화 안정도" data={indices.changeStability} />
        <IndexCard title="실행 병목" data={indices.executionBottleneck} />
        <IndexCard title="조직 분위기" data={indices.atmosphereTemp} />
      </div>

      {/* Radar + Strengths/Risks */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="ts-card p-6">
          <h3 className="font-bold text-[hsl(var(--neutral-900))] mb-4">부문별 균형 지도</h3>
          {radarData.length > 2 ? (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--neutral-200))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--neutral-600))" }} />
                <Radar name="점수" dataKey="score" stroke="hsl(var(--primary-400))" fill="hsl(var(--primary-400))" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-[hsl(var(--neutral-400))] text-sm">응답 데이터가 부족합니다.</div>
          )}
        </div>

        <div className="space-y-4">
          <div className="ts-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[hsl(var(--green-500))]" />
              <h3 className="font-bold text-[hsl(var(--neutral-900))] text-sm">상위 강점 영역</h3>
            </div>
            <div className="space-y-2">
              {strengths.length === 0 ? <p className="text-sm text-[hsl(var(--neutral-400))]">데이터 없음</p> : strengths.map((s, i) => (
                <div key={s.sectionId} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--neutral-700))]">{i + 1}. {s.sectionName}</span>
                  <span className={cn("text-sm font-bold", scoreColor(s.avgScore))}>{s.avgScore?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ts-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-4 h-4 text-[hsl(var(--red-500))]" />
              <h3 className="font-bold text-[hsl(var(--neutral-900))] text-sm">하위 리스크 영역</h3>
            </div>
            <div className="space-y-2">
              {risks.length === 0 ? <p className="text-sm text-[hsl(var(--neutral-400))]">데이터 없음</p> : risks.map((s, i) => (
                <div key={s.sectionId} className="flex items-center justify-between">
                  <span className="text-sm text-[hsl(var(--neutral-700))]">{i + 1}. {s.sectionName}</span>
                  <span className={cn("text-sm font-bold", scoreColor(s.avgScore))}>{s.avgScore?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* All Section Bars */}
      <div className="ts-card p-6">
        <h3 className="font-bold text-[hsl(var(--neutral-900))] mb-5">7개 부문 전체 점수 (5점 만점)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dashboard.sectionResults.filter((s) => s.avgScore !== null)} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--neutral-200))" />
            <XAxis dataKey="sectionName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--neutral-500))" }} angle={-30} textAnchor="end" interval={0} />
            <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(var(--neutral-500))" }} />
            <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--neutral-200))", fontSize: 12 }} formatter={(v: number) => [`${v.toFixed(2)}점`, "평균"]} />
            <Bar dataKey="avgScore" name="평균 점수" radius={[5, 5, 0, 0]} maxBarSize={50}>
              {dashboard.sectionResults.map((s) => (
                <Cell key={s.sectionId}
                  fill={s.avgScore === null ? "hsl(var(--neutral-200))" : s.avgScore >= 4 ? "hsl(var(--green-500))" : s.avgScore >= 3 ? "hsl(var(--yellow-400))" : "hsl(var(--red-500))"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── B. Health Diagnosis ──────────────────────────────────────
function HealthDiagnosisTab({ sectionResults, submittedCount }: { sectionResults: SectionResult[]; submittedCount: number }) {
  const [expanded, setExpanded] = useState<string | null>(sectionResults[0]?.sectionId ?? null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-[hsl(var(--neutral-500))]">각 부문을 클릭하면 문항별 세부 점수를 확인할 수 있습니다.</p>
      {sectionResults.map((section) => {
        const isOpen = expanded === section.sectionId;
        const likertQs = section.questionResults.filter((q) => q.questionType === "likert_5" && q.avgScore !== null);
        const sorted = [...likertQs].sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
        const top3 = sorted.slice(0, 3);
        const bottom3 = sorted.slice(-3).reverse().filter((q) => !top3.includes(q));

        return (
          <div key={section.sectionId} className="ts-card overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-5 text-left hover:bg-[hsl(var(--neutral-50))] transition-colors"
              onClick={() => setExpanded(isOpen ? null : section.sectionId)}
            >
              <div className="flex items-center gap-4">
                <div className={cn("w-14 h-14 rounded-xl flex flex-col items-center justify-center text-sm font-bold", scoreBg(section.avgScore))}>
                  <span className={cn("text-lg font-bold", scoreColor(section.avgScore))}>
                    {section.avgScore !== null ? section.avgScore.toFixed(1) : "—"}
                  </span>
                  <span className="text-[10px] text-[hsl(var(--neutral-500))]">/ 5.0</span>
                </div>
                <div>
                  <p className="font-bold text-[hsl(var(--neutral-900))]">{section.sectionName}</p>
                  <p className="text-xs text-[hsl(var(--neutral-500))] mt-0.5">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ScoreMeter score={section.avgScore} />
                {isOpen ? <ChevronUp className="w-4 h-4 text-[hsl(var(--neutral-400))]" /> : <ChevronDown className="w-4 h-4 text-[hsl(var(--neutral-400))]" />}
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-[hsl(var(--neutral-200))] p-5 space-y-6">
                {/* Question bars */}
                <div className="space-y-3">
                  {likertQs.map((q) => (
                    <div key={q.questionId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-[hsl(var(--neutral-700))] flex-1 pr-4">{q.questionNo}. {q.questionText}</span>
                        <span className={cn("text-sm font-bold w-10 text-right shrink-0", scoreColor(q.avgScore))}>{q.avgScore?.toFixed(2)}</span>
                      </div>
                      <div className="w-full h-2 bg-[hsl(var(--neutral-100))] rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", q.avgScore !== null && q.avgScore >= 4 ? "bg-[hsl(var(--green-500))]" : q.avgScore !== null && q.avgScore >= 3 ? "bg-[hsl(var(--yellow-400))]" : "bg-[hsl(var(--red-500))]")}
                          style={{ width: `${((q.avgScore ?? 0) / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top / Bottom highlights */}
                {likertQs.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {top3.length > 0 && (
                      <div className="bg-[hsl(142_76%_36%/0.06)] border border-[hsl(142_76%_36%/0.2)] rounded-lg p-4">
                        <p className="text-xs font-semibold text-[hsl(var(--green-500))] mb-2 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> 높은 문항 TOP 3</p>
                        {top3.map((q) => <p key={q.questionId} className="text-xs text-[hsl(var(--neutral-700))] mb-1">{q.questionText} <span className="font-bold text-[hsl(var(--green-500))]">({q.avgScore?.toFixed(2)})</span></p>)}
                      </div>
                    )}
                    {bottom3.length > 0 && (
                      <div className="bg-[hsl(0_84%_60%/0.06)] border border-[hsl(0_84%_60%/0.2)] rounded-lg p-4">
                        <p className="text-xs font-semibold text-[hsl(var(--red-500))] mb-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> 낮은 문항 TOP 3</p>
                        {bottom3.map((q) => <p key={q.questionId} className="text-xs text-[hsl(var(--neutral-700))] mb-1">{q.questionText} <span className="font-bold text-[hsl(var(--red-500))]">({q.avgScore?.toFixed(2)})</span></p>)}
                      </div>
                    )}
                  </div>
                )}

                {submittedCount < 1 && <p className="text-xs text-[hsl(var(--neutral-400))] italic">응답 데이터가 없어 정확한 점수를 표시할 수 없습니다.</p>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── C. Organization Comparison ───────────────────────────────
function ComparisonTab({ dashboard }: { dashboard: ReturnType<typeof useSurveyDashboard>["data"] & object }) {
  const minCount = dashboard.survey.anonymousMinCount ?? 5;
  const safeDepts = dashboard.departmentStats.filter((d) => d.submittedCount >= minCount);
  const hiddenCount = dashboard.departmentStats.length - safeDepts.length;

  return (
    <div className="space-y-5">
      {hiddenCount > 0 && (
        <div className="ts-notice-box">
          <p className="text-sm text-[hsl(var(--neutral-700))]">
            <strong>익명성 보호:</strong> {hiddenCount}개 조직은 응답자가 {minCount}명 미만이어서 결과가 표시되지 않습니다.
          </p>
        </div>
      )}

      {/* Response Rate by Dept */}
      <div className="ts-card p-6">
        <h3 className="font-bold text-[hsl(var(--neutral-900))] mb-5 flex items-center gap-2">
          <Users className="w-4 h-4 text-[hsl(var(--primary-400))]" /> 조직별 응답 현황
        </h3>
        <div className="space-y-4">
          {dashboard.departmentStats.map((dept) => {
            const safe = dept.submittedCount >= minCount;
            return (
              <div key={dept.departmentId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[hsl(var(--neutral-800))]">{dept.departmentName}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-[hsl(var(--neutral-500))]">{dept.submittedCount} / {dept.totalEligible}명</span>
                    <span className={cn("font-bold w-12 text-right", scoreColor(dept.responseRate >= 80 ? 4.5 : dept.responseRate >= 50 ? 3.5 : 2))}>
                      {dept.responseRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-[hsl(var(--neutral-100))] rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", dept.responseRate >= 80 ? "bg-[hsl(var(--green-500))]" : dept.responseRate >= 50 ? "bg-[hsl(var(--yellow-400))]" : "bg-[hsl(var(--red-500))]")}
                    style={{ width: `${Math.min(dept.responseRate, 100)}%` }}
                  />
                </div>
                {!safe && dept.totalEligible > 0 && (
                  <p className="text-[10px] text-[hsl(var(--neutral-400))] mt-0.5">익명성 기준 미달 — 점수 비공개</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Company average reference */}
      {dashboard.sectionResults.some((s) => s.avgScore !== null) && (
        <div className="ts-card p-6">
          <h3 className="font-bold text-[hsl(var(--neutral-900))] mb-1">전사 평균 점수 참고</h3>
          <p className="text-xs text-[hsl(var(--neutral-500))] mb-4">부서별 세부 비교는 응답자 5인 이상인 부서에서 가능합니다.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {dashboard.sectionResults.map((s) => (
              <div key={s.sectionId} className={cn("rounded-lg p-3 text-center", scoreBg(s.avgScore))}>
                <p className="text-xs text-[hsl(var(--neutral-500))] mb-1 truncate">{s.sectionName}</p>
                <p className={cn("text-xl font-bold", scoreColor(s.avgScore))}>{s.avgScore?.toFixed(1) ?? "—"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── D. Qualitative Analysis ──────────────────────────────────
function QualitativeTab({ data }: { data: QualitativeData | null }) {
  if (!data) return <div className="flex items-center justify-center py-20 text-[hsl(var(--neutral-400))] text-sm"><Loader2 className="w-5 h-5 animate-spin mr-2" />데이터 불러오는 중...</div>;

  if (!data.safe) {
    return (
      <div className="ts-card p-12 text-center">
        <AlertTriangle className="w-10 h-10 text-[hsl(var(--yellow-400))] mx-auto mb-3" />
        <h3 className="font-bold text-[hsl(var(--neutral-900))] mb-2">익명성 보호 중</h3>
        <p className="text-sm text-[hsl(var(--neutral-500))]">현재 응답자가 {data.submittedCount}명입니다. 정성 응답을 표시하려면 최소 {data.minRequired}명 이상 필요합니다.</p>
      </div>
    );
  }

  if (data.questions.length === 0) {
    return (
      <div className="ts-card p-12 text-center">
        <MessageSquare className="w-10 h-10 text-[hsl(var(--neutral-300))] mx-auto mb-3" />
        <p className="text-sm text-[hsl(var(--neutral-500))]">아직 주관식 응답이 없습니다.</p>
      </div>
    );
  }

  const mgmtQ = data.questions.find((q) => q.questionText.includes("경영관리") || q.questionText.includes("HR"));
  const leaderQ = data.questions.find((q) => q.questionText.includes("리더십") || q.questionText.includes("임원"));

  return (
    <div className="space-y-5">
      <div className="ts-notice-box">
        <p className="text-sm text-[hsl(var(--neutral-700))]">주관식 응답은 익명으로 집계됩니다. 개인 식별 가능한 정보는 표시되지 않습니다. 총 {data.submittedCount}명이 응답했습니다.</p>
      </div>

      {/* All qualitative questions */}
      {data.questions.map((q) => (
        <div key={q.questionId} className="ts-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {q.questionNo}
            </div>
            <div>
              <p className="font-semibold text-[hsl(var(--neutral-900))]">{q.questionText}</p>
              <p className="text-xs text-[hsl(var(--neutral-500))] mt-0.5">{q.sectionName} · {q.responseCount}명 응답</p>
            </div>
          </div>
          <div className="space-y-2 ml-10">
            {q.responses.map((text, i) => (
              <div key={i} className="bg-[hsl(var(--neutral-50))] border border-[hsl(var(--neutral-200))] rounded-lg px-4 py-3 text-sm text-[hsl(var(--neutral-700))] leading-relaxed">
                {text}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Special sections */}
      {mgmtQ && (
        <div className="ts-card p-6 border-l-4 border-[hsl(var(--yellow-400))]">
          <p className="text-xs font-semibold text-[hsl(var(--yellow-400))] mb-1">경영관리실 요청 사항</p>
          <p className="text-sm text-[hsl(var(--neutral-500))]">아래 내용은 경영관리실 지원 요청으로 분류된 응답입니다.</p>
          <div className="space-y-2 mt-3">
            {mgmtQ.responses.map((t, i) => <div key={i} className="text-sm text-[hsl(var(--neutral-700))] bg-[hsl(38_92%_50%/0.06)] border border-[hsl(38_92%_50%/0.15)] rounded-lg px-4 py-2.5">{t}</div>)}
          </div>
        </div>
      )}

      {leaderQ && (
        <div className="ts-card p-6 border-l-4 border-[hsl(var(--red-500))]">
          <p className="text-xs font-semibold text-[hsl(var(--red-500))] mb-1">리더십 / 경영진 관련 제언</p>
          <div className="space-y-2 mt-3">
            {leaderQ.responses.map((t, i) => <div key={i} className="text-sm text-[hsl(var(--neutral-700))] bg-[hsl(0_84%_60%/0.05)] border border-[hsl(0_84%_60%/0.15)] rounded-lg px-4 py-2.5">{t}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── E. Action Planner ────────────────────────────────────────
const CATEGORIES = [
  { id: "company_wide", label: "전사 개선 과제", color: "blue" },
  { id: "team_leader", label: "조직장 개선 과제", color: "green" },
  { id: "management", label: "경영관리실 지원 과제", color: "yellow" },
  { id: "executive", label: "리더십 / 경영진 과제", color: "red" },
] as const;

const PRIORITY_LABEL: Record<string, string> = { high: "높음", medium: "보통", low: "낮음" };
const STATUS_LABEL: Record<string, string> = { todo: "미착수", in_progress: "진행중", done: "완료" };

function ActionPlannerTab({ surveyId }: { surveyId: string | null }) {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useActionItems(surveyId);
  const createMutation = useCreateActionItem();
  const updateMutation = useUpdateActionItem();
  const deleteMutation = useDeleteActionItem();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: "company_wide", title: "", description: "", owner: "", priority: "medium", dueDate: "" });
  const canDelete = user?.role === "admin";

  const handleCreate = async () => {
    if (!form.title.trim()) { toast({ title: "과제명을 입력해주세요.", variant: "destructive" }); return; }
    await createMutation.mutateAsync({ ...form, surveyCycleId: surveyId ?? undefined } as any);
    setForm({ category: "company_wide", title: "", description: "", owner: "", priority: "medium", dueDate: "" });
    setShowForm(false);
    toast({ title: "과제가 추가되었습니다." });
  };

  const handleStatusChange = (item: ActionItem, newStatus: string) => {
    updateMutation.mutate({ id: item.id, status: newStatus as ActionItem["status"] });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin w-6 h-6 text-[hsl(var(--neutral-400))]" /></div>;

  return (
    <div className="space-y-5">
      {/* Create button */}
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="ts-btn-primary flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" /> 과제 추가
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="ts-card p-6 space-y-4">
          <h3 className="font-bold text-[hsl(var(--neutral-900))]">새 개선 과제</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-1 block">분류</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="ts-input text-sm">
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-1 block">우선순위</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="ts-input text-sm">
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-1 block">과제명 *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="ts-input text-sm" placeholder="예: 팀 R&R 명확화" />
          </div>
          <div>
            <label className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-1 block">상세 설명</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="ts-input text-sm resize-none" placeholder="과제 배경 및 기대 효과" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-1 block">담당자</label>
              <input type="text" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="ts-input text-sm" placeholder="팀/담당자명" />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-1 block">목표 기한</label>
              <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="ts-input text-sm" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowForm(false)} className="ts-btn-secondary px-4 py-2 text-sm">취소</button>
            <button onClick={handleCreate} disabled={createMutation.isPending} className="ts-btn-primary px-5 py-2 text-sm">{createMutation.isPending ? "추가 중..." : "과제 추가"}</button>
          </div>
        </div>
      )}

      {/* Category columns */}
      {CATEGORIES.map((cat) => {
        const catItems = items.filter((item) => item.category === cat.id);
        return (
          <div key={cat.id} className="ts-card overflow-hidden">
            <div className={cn("px-5 py-3 flex items-center justify-between", {
              "bg-[hsl(207_90%_54%/0.1)] border-b border-[hsl(207_90%_54%/0.2)]": cat.color === "blue",
              "bg-[hsl(142_76%_36%/0.1)] border-b border-[hsl(142_76%_36%/0.2)]": cat.color === "green",
              "bg-[hsl(38_92%_50%/0.1)] border-b border-[hsl(38_92%_50%/0.2)]": cat.color === "yellow",
              "bg-[hsl(0_84%_60%/0.08)] border-b border-[hsl(0_84%_60%/0.2)]": cat.color === "red",
            })}>
              <h3 className="font-bold text-[hsl(var(--neutral-900))] text-sm">{cat.label}</h3>
              <span className="text-xs text-[hsl(var(--neutral-500))]">{catItems.length}건</span>
            </div>
            <div className="divide-y divide-[hsl(var(--neutral-100))]">
              {catItems.length === 0 ? (
                <div className="px-5 py-4 text-sm text-[hsl(var(--neutral-400))] text-center">등록된 과제가 없습니다.</div>
              ) : catItems.map((item) => (
                <div key={item.id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityBadge priority={item.priority} />
                      <p className="font-medium text-sm text-[hsl(var(--neutral-900))] truncate">{item.title}</p>
                    </div>
                    {item.description && <p className="text-xs text-[hsl(var(--neutral-500))] mb-1">{item.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-[hsl(var(--neutral-400))]">
                      {item.owner && <span>담당: {item.owner}</span>}
                      {item.dueDate && <span>기한: {new Date(item.dueDate).toLocaleDateString("ko-KR")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value)}
                      className="text-xs border border-[hsl(var(--neutral-200))] rounded-md px-2 py-1.5 bg-white text-[hsl(var(--neutral-700))] focus:outline-none focus:border-[hsl(var(--primary-400))]"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    {canDelete ? (
                      <button onClick={() => deleteMutation.mutate(item.id)} className="p-1.5 text-[hsl(var(--neutral-400))] hover:text-[hsl(var(--red-500))] rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Shared UI Atoms ──────────────────────────────────────────

function KpiCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="ts-card p-5 text-center">
      <p className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-2">{title}</p>
      <p className="text-3xl font-bold text-[hsl(var(--neutral-900))]">{value}</p>
      {subtitle && <p className="text-xs text-[hsl(var(--neutral-400))] mt-1">{subtitle}</p>}
    </div>
  );
}

function IndexCard({ title, data }: { title: string; data: { score: number | null; label: string; color: "green" | "yellow" | "red" | "neutral" } }) {
  const colorMap = {
    green: { bg: "bg-[hsl(142_76%_36%/0.08)]", text: "text-[hsl(var(--green-500))]", badge: "bg-[hsl(142_76%_36%/0.12)] text-[hsl(var(--green-500))]" },
    yellow: { bg: "bg-[hsl(38_92%_50%/0.08)]", text: "text-[hsl(var(--yellow-400))]", badge: "bg-[hsl(38_92%_50%/0.12)] text-[hsl(var(--yellow-400))]" },
    red: { bg: "bg-[hsl(0_84%_60%/0.06)]", text: "text-[hsl(var(--red-500))]", badge: "bg-[hsl(0_84%_60%/0.1)] text-[hsl(var(--red-500))]" },
    neutral: { bg: "bg-[hsl(var(--neutral-100))]", text: "text-[hsl(var(--neutral-500))]", badge: "bg-[hsl(var(--neutral-200))] text-[hsl(var(--neutral-500))]" },
  }[data.color];

  return (
    <div className={cn("ts-card p-5 text-center", colorMap.bg)}>
      <p className="text-xs font-medium text-[hsl(var(--neutral-500))] mb-2">{title}</p>
      <p className={cn("text-2xl font-bold mb-1.5", colorMap.text)}>{data.score !== null ? data.score.toFixed(1) : "—"}</p>
      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", colorMap.badge)}>{data.label}</span>
    </div>
  );
}

function ScoreMeter({ score }: { score: number | null }) {
  return (
    <div className="hidden md:flex items-center gap-2 w-32">
      <div className="flex-1 h-2 bg-[hsl(var(--neutral-100))] rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", score !== null && score >= 4 ? "bg-[hsl(var(--green-500))]" : score !== null && score >= 3 ? "bg-[hsl(var(--yellow-400))]" : "bg-[hsl(var(--red-500))]")}
          style={{ width: score !== null ? `${(score / 5) * 100}%` : "0%" }}
        />
      </div>
      <span className={cn("text-sm font-bold w-8 text-right", scoreColor(score))}>{score !== null ? score.toFixed(1) : "—"}</span>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles = { high: "bg-[hsl(0_84%_60%/0.1)] text-[hsl(var(--red-500))]", medium: "bg-[hsl(38_92%_50%/0.1)] text-[hsl(var(--yellow-400))]", low: "bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-500))]" };
  return <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", styles[priority as keyof typeof styles] ?? styles.low)}>{PRIORITY_LABEL[priority] ?? priority}</span>;
}

function EmptyState() {
  return (
    <div className="ts-card p-16 text-center">
      <Activity className="w-12 h-12 text-[hsl(var(--neutral-300))] mx-auto mb-4" />
      <h3 className="font-bold text-[hsl(var(--neutral-700))] mb-2">분석 데이터가 없습니다</h3>
      <p className="text-sm text-[hsl(var(--neutral-500))]">진행 중이거나 완료된 설문이 없거나, 응답 데이터가 아직 없습니다.</p>
    </div>
  );
}
