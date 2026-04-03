import React from "react";
import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetEvalInstance,
  useGetEvalItems,
  useGetSubmissions,
  useGetScores,
  useGetFinalResult,
  useGetEmployees,
  useConfirmEvaluation,
  useRequestSecondEval,
  useMyEmployeeId,
  type EvalItem,
  type EvalSubmission,
  type EvalScore,
} from "@/hooks/use-evaluation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  Users,
  Star,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ── 등급 색상 ─────────────────────────────────────────────────

const SCORE_COLOR: Record<number, string> = {
  5: "text-emerald-600 font-bold",
  4: "text-blue-600 font-bold",
  3: "text-zinc-600 font-semibold",
  2: "text-orange-600 font-semibold",
  1: "text-red-600 font-bold",
};

const FINAL_GRADES = ["S", "A", "B", "C", "D"] as const;

const GRADE_META: Record<
  (typeof FINAL_GRADES)[number],
  { label: string; color: string; selected: string }
> = {
  S: {
    label: "탁월",
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
    selected: "border-emerald-500 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400",
  },
  A: {
    label: "우수",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    selected: "border-blue-500 bg-blue-100 text-blue-800 ring-2 ring-blue-400",
  },
  B: {
    label: "보통",
    color: "border-zinc-200 bg-zinc-50 text-zinc-700",
    selected: "border-zinc-500 bg-zinc-100 text-zinc-800 ring-2 ring-zinc-400",
  },
  C: {
    label: "미흡",
    color: "border-orange-200 bg-orange-50 text-orange-700",
    selected: "border-orange-500 bg-orange-100 text-orange-800 ring-2 ring-orange-400",
  },
  D: {
    label: "부진",
    color: "border-red-200 bg-red-50 text-red-700",
    selected: "border-red-500 bg-red-100 text-red-800 ring-2 ring-red-400",
  },
};

const STEP_LABEL: Record<EvalSubmission["step"], string> = {
  self: "자기평가",
  first: "1차 상사",
  second: "2차 상사",
  committee: "커미티",
};

// ── 단일 제출 점수 패널 ───────────────────────────────────────

interface ScorePanelProps {
  submission: EvalSubmission;
  items: EvalItem[];
  scoreMap: Record<string, EvalScore>;
}

function ScorePanel({ submission, items, scoreMap }: ScorePanelProps) {
  const scores = items.map((item) => scoreMap[item.id]);
  const validScores = scores.filter((s) => s && s.score > 0);
  const avg =
    validScores.length > 0
      ? validScores.reduce((acc, s) => acc + s.score, 0) / validScores.length
      : null;

  return (
    <div className="flex flex-col">
      {/* 패널 헤더 */}
      <div className="px-4 py-3 bg-zinc-800 rounded-t-lg">
        <p className="text-xs font-semibold text-white">
          {STEP_LABEL[submission.step]}
        </p>
        <p className="text-[11px] text-zinc-400 mt-0.5 truncate">
          {submission.evaluatorName ?? "—"}
        </p>
      </div>

      {/* 항목별 점수 */}
      <div className="flex-1 border border-t-0 border-zinc-200 rounded-b-lg overflow-hidden divide-y divide-zinc-100">
        {items.map((item) => {
          const s = scoreMap[item.id];
          return (
            <div key={item.id} className="px-4 py-2.5 bg-white">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500 truncate">{item.itemName}</span>
                <span className={cn("text-sm shrink-0", s?.score ? SCORE_COLOR[s.score] : "text-zinc-300")}>
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

      {/* 평균 + 종합의견 */}
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-zinc-500">평균</span>
          <span className="text-sm font-bold text-zinc-800">
            {avg !== null ? avg.toFixed(2) : "—"}
          </span>
        </div>
        {submission.overallComment && (
          <div className="px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-100">
            <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-4">
              {submission.overallComment}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 점수 로더 (서브미션별) ─────────────────────────────────────

interface ScoreLoaderProps {
  submission: EvalSubmission;
  items: EvalItem[];
}

function ScoreLoader({ submission, items }: ScoreLoaderProps) {
  const { data: scores = [], isLoading } = useGetScores(submission.id);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        <div className="px-4 py-3 bg-zinc-800 rounded-t-lg">
          <p className="text-xs text-zinc-400">불러오는 중...</p>
        </div>
        <div className="h-40 border border-zinc-200 rounded-b-lg bg-zinc-50 animate-pulse" />
      </div>
    );
  }

  const scoreMap = Object.fromEntries(scores.map((s) => [s.itemId, s]));
  return <ScorePanel submission={submission} items={items} scoreMap={scoreMap} />;
}

// ── 메인 커미티 페이지 ────────────────────────────────────────

export default function CommitteePage() {
  const params = useParams<{ cycleId: string; instanceId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const instanceId = params.instanceId;
  const actorId = useMyEmployeeId();

  const { data: instance, isLoading: instLoading } = useGetEvalInstance(instanceId);
  const { data: submissions = [] } = useGetSubmissions(instanceId);
  const { data: finalResult } = useGetFinalResult(instanceId);
  const { data: employees = [] } = useGetEmployees(false);

  const jobGroup = instance?.jobGroup as Parameters<typeof useGetEvalItems>[0];
  const { data: items = [] } = useGetEvalItems(
    jobGroup && jobGroup !== "executive" ? jobGroup : null
  );

  // 커미티 평가 폼 상태
  const [finalGrade, setFinalGrade] = React.useState<(typeof FINAL_GRADES)[number] | null>(null);
  const [committeeComment, setCommitteeComment] = React.useState("");
  const [secondEvalReq, setSecondEvalReq] = React.useState(false);
  const [secondEvaluatorId, setSecondEvaluatorId] = React.useState("");

  // 기존 final result로 초기화
  React.useEffect(() => {
    if (finalResult) {
      setFinalGrade(finalResult.finalGrade);
      setCommitteeComment(finalResult.committeeComment ?? "");
    }
  }, [finalResult]);

  const confirm = useConfirmEvaluation();
  const requestSecond = useRequestSecondEval();

  const isConfirmed = instance?.workflowStatus === "confirmed";
  const isPendingCommittee = instance?.workflowStatus === "pending_committee";
  const isPendingSecond = instance?.workflowStatus === "pending_second";

  // self/first/second 제출 필터링
  const selfSub = submissions.find((s) => s.step === "self" && s.status === "submitted");
  const firstSub = submissions.find((s) => s.step === "first" && s.status === "submitted");
  const secondSub = submissions.find((s) => s.step === "second" && s.status === "submitted");

  const activeSubs = [selfSub, firstSub, secondSub].filter(Boolean) as EvalSubmission[];

  const handleRequestSecond = async () => {
    if (!secondEvaluatorId) {
      toast({ title: "2차 평가자를 선택해주세요", variant: "destructive" });
      return;
    }
    try {
      await requestSecond.mutateAsync({ instanceId, evaluatorId: secondEvaluatorId });
      toast({ title: "2차 평가 요청 완료", description: "평가자에게 배정되었습니다." });
      setSecondEvalReq(false);
    } catch {
      toast({ title: "오류가 발생했습니다", variant: "destructive" });
    }
  };

  const handleConfirm = async () => {
    if (!finalGrade) {
      toast({ title: "최종 등급을 선택해주세요", variant: "destructive" });
      return;
    }
    if (!actorId) {
      toast({ title: "테스트 모드: 사용자를 선택하세요", variant: "destructive" });
      return;
    }

    try {
      await confirm.mutateAsync({
        instanceId,
        finalGrade,
        committeeComment,
        confirmedBy: actorId,
        selfSubmissionId: selfSub?.id ?? null,
        firstSubmissionId: firstSub?.id ?? null,
        secondSubmissionId: secondSub?.id ?? null,
      });
      toast({ title: "평가 확정 완료", description: "최종 결과가 저장되었습니다." });
      navigate(`/evaluation/${params.cycleId}`);
    } catch {
      toast({ title: "오류가 발생했습니다", variant: "destructive" });
    }
  };

  if (instLoading) {
    return <Shell guestMode><div className="text-sm text-zinc-400 py-20 text-center">불러오는 중...</div></Shell>;
  }
  if (!instance) {
    return <Shell guestMode><div className="text-sm text-red-500 py-20 text-center">평가 인스턴스를 찾을 수 없습니다.</div></Shell>;
  }

  return (
    <Shell guestMode>
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <Link
          href={`/evaluation/${params.cycleId}`}
          className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-600 mb-4"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          사이클 목록으로 돌아가기
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">커미티 리뷰</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              피평가자:{" "}
              <strong className="text-zinc-700">{instance.employeeName}</strong>
              {" · "}
              {instance.jobTitle}
              {instance.department ? ` · ${instance.department}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConfirmed && (
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                확정 완료
              </Badge>
            )}
            {isPendingSecond && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                2차 평가 진행 중
              </Badge>
            )}
            {isPendingCommittee && (
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                커미티 검토 대기
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 점수 비교 패널 */}
      {activeSubs.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            단계별 평가 결과 비교
          </p>
          <div
            className={cn(
              "grid gap-4",
              activeSubs.length === 1 && "grid-cols-1 max-w-xs",
              activeSubs.length === 2 && "grid-cols-2",
              activeSubs.length >= 3 && "grid-cols-3"
            )}
          >
            {activeSubs.map((sub) => (
              <ScoreLoader key={sub.id} submission={sub} items={items} />
            ))}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-sm text-zinc-400 bg-zinc-50 rounded-xl border border-dashed">
          제출된 평가가 없습니다.
        </div>
      )}

      {/* 2차 평가 요청 — pending_committee 상태에서만 */}
      {isPendingCommittee && !instance.secondEvalRequired && (
        <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-violet-500" />
                2차 평가 요청
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                1차 평가 결과에 이의가 있거나 추가 검토가 필요한 경우 2차 평가자를 지정할 수 있습니다.
              </p>
            </div>
            {!secondEvalReq && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSecondEvalReq(true)}
                className="shrink-0"
              >
                요청
              </Button>
            )}
          </div>

          {secondEvalReq && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs text-zinc-500 font-medium block mb-1.5">
                  2차 평가자 선택
                </label>
                <select
                  value={secondEvaluatorId}
                  onChange={(e) => setSecondEvaluatorId(e.target.value)}
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
                >
                  <option value="">— 선택 —</option>
                  {employees
                    .filter((e) => e.id !== instance.employeeId)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.fullName} ({e.department ?? "임원"} · {e.jobTitle})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSecondEvalReq(false);
                    setSecondEvaluatorId("");
                  }}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleRequestSecond}
                  disabled={requestSecond.isPending || !secondEvaluatorId}
                >
                  {requestSecond.isPending ? "처리 중..." : "2차 평가 배정"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 최종 등급 + 확정 — pending_committee 상태에서만 */}
      {(isPendingCommittee || isConfirmed) && (
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100">
            <p className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              최종 평가 확정
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              모든 평가 결과를 종합하여 최종 등급과 의견을 입력하고 확정하세요.
            </p>
          </div>

          <div className="px-5 py-4 space-y-5">
            {/* 최종 등급 선택 */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-2.5">
                최종 등급
              </label>
              <div className="flex gap-2">
                {FINAL_GRADES.map((g) => {
                  const meta = GRADE_META[g];
                  const isSelected = finalGrade === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      disabled={isConfirmed}
                      onClick={() => !isConfirmed && setFinalGrade(g)}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border text-sm font-bold transition-all",
                        isConfirmed ? "cursor-default" : "cursor-pointer hover:shadow-sm",
                        isSelected ? meta.selected : meta.color
                      )}
                    >
                      {g}
                      <span className="text-[11px] font-medium">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 커미티 의견 */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 block mb-1.5">
                커미티 의견{" "}
                <span className="font-normal text-zinc-400">(선택)</span>
              </label>
              <Textarea
                value={committeeComment}
                onChange={(e) => !isConfirmed && setCommitteeComment(e.target.value)}
                readOnly={isConfirmed}
                placeholder="평가 결과에 대한 커미티의 종합 의견, 특이사항, 또는 향후 방향을 입력하세요."
                rows={4}
                className="resize-none"
              />
            </div>

            {/* 확정 정보 (이미 확정된 경우) */}
            {isConfirmed && finalResult && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs text-emerald-700">
                  {finalResult.confirmedAt
                    ? new Date(finalResult.confirmedAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}{" "}
                  에 확정되었습니다.
                </p>
              </div>
            )}

            {/* 확정 버튼 */}
            {!isConfirmed && (
              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleConfirm}
                  disabled={confirm.isPending || !finalGrade}
                  className="min-w-[120px]"
                >
                  {confirm.isPending ? "저장 중..." : "최종 확정"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* pending_second 안내 */}
      {isPendingSecond && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-purple-50 border border-purple-200 rounded-xl">
          <AlertCircle className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-purple-800">2차 평가 진행 중</p>
            <p className="text-xs text-purple-600 mt-0.5">
              2차 평가자가 평가를 완료하면 커미티 검토 단계로 자동 이동됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
    </Shell>
  );
}
