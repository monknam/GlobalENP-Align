import React from "react";
import { useParams } from "wouter";
import { Link } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetEvalInstance,
  useGetEvalItems,
  useGetSubmissions,
  useGetScores,
  useGetFinalResult,
  type EvalItem,
  type EvalSubmission,
  type EvalScore,
} from "@/hooks/use-evaluation";
import { cn } from "@/lib/utils";
import { ChevronLeft, CheckCircle2, Trophy } from "lucide-react";

// ── 등급 메타 ──────────────────────────────────────────────────

const GRADE_META: Record<
  "S" | "A" | "B" | "C" | "D",
  { label: string; bg: string; text: string; border: string }
> = {
  S: { label: "탁월", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  A: { label: "우수", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  B: { label: "보통", bg: "bg-zinc-50", text: "text-zinc-600", border: "border-zinc-300" },
  C: { label: "미흡", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
  D: { label: "부진", bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
};

const SCORE_COLOR: Record<number, string> = {
  5: "text-emerald-600 font-bold",
  4: "text-blue-600 font-bold",
  3: "text-zinc-600 font-semibold",
  2: "text-orange-600 font-semibold",
  1: "text-red-600 font-bold",
};

const STEP_LABEL: Record<EvalSubmission["step"], string> = {
  self: "자기평가",
  first: "1차 상사",
  second: "2차 상사",
  committee: "커미티",
};

// ── 점수 패널 ─────────────────────────────────────────────────

interface ScorePanelProps {
  submission: EvalSubmission;
  items: EvalItem[];
  scoreMap: Record<string, EvalScore>;
}

function ScorePanel({ submission, items, scoreMap }: ScorePanelProps) {
  const validScores = items
    .map((item) => scoreMap[item.id])
    .filter((s) => s && s.score > 0);
  const avg =
    validScores.length > 0
      ? validScores.reduce((acc, s) => acc + s.score, 0) / validScores.length
      : null;

  const headerColor =
    submission.step === "self"
      ? "bg-zinc-700"
      : submission.step === "first"
      ? "bg-blue-700"
      : submission.step === "second"
      ? "bg-purple-700"
      : "bg-zinc-800";

  return (
    <div className="flex flex-col">
      <div className={cn("px-4 py-3 rounded-t-lg", headerColor)}>
        <p className="text-xs font-semibold text-white">{STEP_LABEL[submission.step]}</p>
        <p className="text-[11px] text-white/60 mt-0.5 truncate">
          {submission.evaluatorName ?? "—"}
        </p>
      </div>
      <div className="flex-1 border border-t-0 border-zinc-200 rounded-b-lg overflow-hidden divide-y divide-zinc-100">
        {items.map((item) => {
          const s = scoreMap[item.id];
          return (
            <div key={item.id} className="px-4 py-2.5 bg-white">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500 truncate">{item.itemName}</span>
                <span
                  className={cn(
                    "text-sm shrink-0",
                    s?.score ? SCORE_COLOR[s.score] : "text-zinc-300"
                  )}
                >
                  {s?.score ?? "—"}
                </span>
              </div>
              {s?.evidenceText && (
                <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {s.evidenceText}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-zinc-500">평균</span>
          <span className="text-sm font-bold text-zinc-800">
            {avg !== null ? avg.toFixed(2) : "—"}
          </span>
        </div>
        {submission.overallComment && (
          <div className="px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100">
            <p className="text-[11px] text-zinc-500 leading-relaxed">{submission.overallComment}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreLoader({ submission, items }: { submission: EvalSubmission; items: EvalItem[] }) {
  const { data: scores = [], isLoading } = useGetScores(submission.id);
  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        <div className="px-4 py-3 bg-zinc-700 rounded-t-lg">
          <p className="text-xs text-zinc-400">불러오는 중...</p>
        </div>
        <div className="h-40 border border-zinc-200 rounded-b-lg bg-zinc-50 animate-pulse" />
      </div>
    );
  }
  const scoreMap = Object.fromEntries(scores.map((s) => [s.itemId, s]));
  return <ScorePanel submission={submission} items={items} scoreMap={scoreMap} />;
}

// ── 메인 결과 페이지 ──────────────────────────────────────────

export default function EvaluationResultPage() {
  const params = useParams<{ cycleId: string; instanceId: string }>();
  const instanceId = params.instanceId;
  const cycleId = params.cycleId;

  const { data: instance, isLoading: instLoading } = useGetEvalInstance(instanceId);
  const { data: submissions = [] } = useGetSubmissions(instanceId);
  const { data: finalResult, isLoading: frLoading } = useGetFinalResult(instanceId);

  const jobGroup = instance?.jobGroup as Parameters<typeof useGetEvalItems>[0];
  const { data: items = [] } = useGetEvalItems(
    jobGroup && jobGroup !== "executive" ? jobGroup : null
  );

  // self / first / second (있는 경우만)
  const relevantSteps: EvalSubmission["step"][] = instance?.secondEvalRequired
    ? ["self", "first", "second"]
    : ["self", "first"];

  const submissionsByStep = relevantSteps
    .map((step) =>
      submissions.find((s) => s.step === step && s.status === "submitted")
    )
    .filter((s): s is EvalSubmission => !!s);

  if (instLoading || frLoading) {
    return (
      <Shell guestMode>
        <div className="flex items-center justify-center min-h-[300px] text-zinc-400 text-sm">
          불러오는 중...
        </div>
      </Shell>
    );
  }

  if (!instance) {
    return (
      <Shell guestMode>
        <div className="text-center py-20 text-zinc-400 text-sm">평가 인스턴스를 찾을 수 없습니다.</div>
      </Shell>
    );
  }

  const grade = finalResult?.finalGrade;
  const gradeMeta = grade ? GRADE_META[grade] : null;

  return (
    <Shell guestMode>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 뒤로가기 */}
        <div>
          <Link href={cycleId ? `/evaluation/${cycleId}` : "/evaluation"}>
            <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
              평가 관리로 돌아가기
            </button>
          </Link>
        </div>

        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">평가 확정 완료</span>
            </div>
            <h1 className="text-2xl font-bold text-zinc-900">{instance.employeeName}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {instance.department} · {instance.jobTitle}
            </p>
          </div>

          {/* 최종 등급 */}
          {gradeMeta && grade && (
            <div
              className={cn(
                "flex flex-col items-center justify-center w-24 h-24 rounded-2xl border-2 shrink-0",
                gradeMeta.bg,
                gradeMeta.border
              )}
            >
              <Trophy className={cn("w-5 h-5 mb-1", gradeMeta.text)} />
              <span className={cn("text-4xl font-black", gradeMeta.text)}>{grade}</span>
              <span className={cn("text-[11px] font-medium mt-0.5", gradeMeta.text)}>
                {gradeMeta.label}
              </span>
            </div>
          )}
        </div>

        {/* 점수 요약 카드 */}
        {finalResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "자기평가 평균", value: finalResult.scoreSelfAvg },
              { label: "1차 상사 평균", value: finalResult.scoreFirstAvg },
              ...(finalResult.scoreSecondAvg !== null
                ? [{ label: "2차 상사 평균", value: finalResult.scoreSecondAvg }]
                : []),
              { label: "최종 점수", value: finalResult.finalScore, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div
                key={label}
                className={cn(
                  "rounded-xl border px-4 py-3",
                  highlight ? "bg-zinc-900 border-zinc-700" : "bg-white border-zinc-200"
                )}
              >
                <p className={cn("text-[11px]", highlight ? "text-zinc-400" : "text-zinc-500")}>
                  {label}
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold mt-0.5",
                    highlight ? "text-white" : "text-zinc-800"
                  )}
                >
                  {value !== null && value !== undefined ? value.toFixed(2) : "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* 커미티 의견 */}
        {finalResult?.committeeComment && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-amber-700 mb-1.5">커미티 의견</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              {finalResult.committeeComment}
            </p>
          </div>
        )}

        {/* 확정일 */}
        {finalResult?.confirmedAt && (
          <p className="text-xs text-zinc-400">
            확정일:{" "}
            {new Date(finalResult.confirmedAt).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}

        {/* 단계별 점수 비교 */}
        {submissionsByStep.length > 0 && items.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-700 mb-3">단계별 평가 점수</h2>
            <div
              className={cn(
                "grid gap-4",
                submissionsByStep.length === 1
                  ? "grid-cols-1 max-w-sm"
                  : submissionsByStep.length === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-3"
              )}
            >
              {submissionsByStep.map((sub) => (
                <ScoreLoader key={sub.id} submission={sub} items={items} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
