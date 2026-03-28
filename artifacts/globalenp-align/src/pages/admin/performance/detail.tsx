import { useState, useEffect } from "react";
import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import {
  useGetEvaluationDetail,
  useGetEvaluationScores,
  useSaveCeoReview,
  useSaveScoreCeoAdjustments,
  type EvaluationScore,
} from "@/hooks/use-performance";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

const GRADES = ["S", "A", "B", "C", "D"];

const GRADE_STYLES: Record<string, string> = {
  S: "bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))] border-[hsl(var(--primary-200))]",
  A: "bg-[hsl(142_76%_36%/0.1)] text-[hsl(var(--green-500))] border-[hsl(142_76%_36%/0.3)]",
  B: "bg-[hsl(var(--neutral-100))] text-[hsl(var(--neutral-600))] border-[hsl(var(--neutral-200))]",
  C: "bg-[hsl(38_92%_50%/0.12)] text-[hsl(38_92%_40%)] border-[hsl(38_92%_50%/0.3)]",
  D: "bg-[hsl(0_84%_60%/0.1)] text-[hsl(var(--red-500))] border-[hsl(0_84%_60%/0.3)]",
};

interface Props {
  params: { cycleId: string; evalId: string };
}

export default function PerformanceDetail({ params }: Props) {
  const { isAuthorized, user } = useProtectedRoute(["admin"]);
  const isCeo = user?.isSystemAdmin === true;
  const { toast } = useToast();

  const { data: evaluation, isLoading: evalLoading } = useGetEvaluationDetail(params.evalId);
  const { data: scores, isLoading: scoresLoading } = useGetEvaluationScores(params.evalId);

  const saveCeoReview = useSaveCeoReview();
  const saveScoreAdjustments = useSaveScoreCeoAdjustments();

  // CEO 폼 상태
  const [adjScore, setAdjScore] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  // 항목별 CEO 조정 상태
  const [scoreAdjs, setScoreAdjs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!evaluation) return;
    setAdjScore(evaluation.scoreCeoAdjusted != null ? String(evaluation.scoreCeoAdjusted) : "");
    setGrade(evaluation.gradeCeo ?? "");
    setIsConfirmed(evaluation.isConfirmed);
  }, [evaluation]);

  useEffect(() => {
    if (!scores) return;
    const init: Record<string, string> = {};
    scores.forEach((s) => {
      init[s.id] = s.scoreCeoAdjusted != null ? String(s.scoreCeoAdjusted) : "";
    });
    setScoreAdjs(init);
  }, [scores]);

  if (!isAuthorized) return null;

  const isLoading = evalLoading || scoresLoading;

  const handleSave = async (confirm: boolean) => {
    if (!evaluation) return;

    // 항목별 조정 저장
    const scoreUpdates = (scores ?? []).map((s) => ({
      id: s.id,
      scoreCeoAdjusted: scoreAdjs[s.id] !== "" && scoreAdjs[s.id] != null
        ? parseFloat(scoreAdjs[s.id])
        : null,
    }));

    try {
      await saveScoreAdjustments.mutateAsync(scoreUpdates);
      await saveCeoReview.mutateAsync({
        evalId: evaluation.id,
        payload: {
          scoreCeoAdjusted: adjScore !== "" ? parseFloat(adjScore) : null,
          gradeCeo: grade || null,
          isConfirmed: confirm,
          progressStatus: confirm ? "confirmed" : "reviewing",
        },
      });
      toast({
        title: confirm ? "평가 확정 완료" : "저장 완료",
        description: confirm
          ? `${evaluation.fullName}님의 평가가 확정되었습니다.`
          : "변경 사항이 저장되었습니다.",
      });
    } catch {
      toast({ variant: "destructive", title: "저장 실패", description: "잠시 후 다시 시도해주세요." });
    }
  };

  return (
    <Shell>
      <div className="space-y-6 max-w-3xl">
        {/* 뒤로 가기 */}
        <Link
          href={`/admin/performance/${params.cycleId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--neutral-500))] hover:text-[hsl(var(--neutral-900))] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          평가 목록으로
        </Link>

        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-[hsl(var(--neutral-200))] rounded-xl" />
            <div className="h-48 bg-[hsl(var(--neutral-200))] rounded-xl" />
          </div>
        )}

        {!isLoading && !evaluation && (
          <div className="ts-card p-8 flex flex-col items-center text-center">
            <AlertTriangle className="w-10 h-10 text-[hsl(var(--red-500))] mb-3" />
            <p className="font-semibold text-[hsl(var(--neutral-900))]">평가 데이터를 찾을 수 없습니다</p>
          </div>
        )}

        {!isLoading && evaluation && (
          <>
            {/* 인적 정보 헤더 */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="ts-card p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-[hsl(var(--neutral-900))]">{evaluation.fullName}</h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {evaluation.department && (
                      <span className="text-sm text-[hsl(var(--neutral-600))]">{evaluation.department}</span>
                    )}
                    {evaluation.jobTitle && (
                      <>
                        <span className="text-[hsl(var(--neutral-300))]">·</span>
                        <span className="text-sm text-[hsl(var(--neutral-600))]">{evaluation.jobTitle}</span>
                      </>
                    )}
                    {evaluation.tenureYears != null && (
                      <>
                        <span className="text-[hsl(var(--neutral-300))]">·</span>
                        <span className="text-sm text-[hsl(var(--neutral-600))]">재직 {evaluation.tenureYears}년</span>
                      </>
                    )}
                  </div>
                </div>
                {evaluation.isConfirmed && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[hsl(142_76%_36%/0.1)] text-[hsl(var(--green-500))] text-sm font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    확정 완료
                  </span>
                )}
              </div>
            </motion.div>

            {/* 항목별 점수 테이블 */}
            {scores && scores.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="ts-card overflow-hidden p-0"
              >
                <div className="px-6 py-4 border-b border-[hsl(var(--neutral-100))]">
                  <h2 className="text-sm font-bold text-[hsl(var(--neutral-900))]">항목별 평가 점수</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(var(--neutral-100))]">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-[hsl(var(--neutral-500))] bg-[hsl(var(--neutral-50))] w-2/5">
                          평가 항목
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[hsl(var(--neutral-500))] bg-[hsl(var(--neutral-50))]">
                          본인
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[hsl(var(--neutral-500))] bg-[hsl(var(--neutral-50))]">
                          팀장
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[hsl(var(--neutral-500))] bg-[hsl(var(--neutral-50))]">
                          상위자
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[hsl(var(--primary-400))] bg-[hsl(var(--neutral-50))]">
                          CEO 조정
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {scores.map((score, i) => (
                        <ScoreRow
                          key={score.id}
                          score={score}
                          index={i}
                          isCeo={isCeo}
                          adjValue={scoreAdjs[score.id] ?? ""}
                          onAdjChange={(val) => setScoreAdjs((prev) => ({ ...prev, [score.id]: val }))}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 업무 성과 기재 */}
            {evaluation.notes && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="ts-card p-6"
              >
                <h2 className="text-sm font-bold text-[hsl(var(--neutral-900))] mb-3">업무 성과 기재 내용</h2>
                <p className="text-sm text-[hsl(var(--neutral-700))] leading-relaxed whitespace-pre-wrap">
                  {evaluation.notes}
                </p>
              </motion.div>
            )}

            {/* CEO 조정 폼 */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`ts-card p-6 ${!isCeo ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2 mb-5">
                <h2 className="text-sm font-bold text-[hsl(var(--neutral-900))]">CEO 최종 조정</h2>
                {!isCeo && (
                  <span className="inline-flex items-center gap-1 text-xs text-[hsl(var(--neutral-500))]">
                    <Lock className="w-3 h-3" />
                    대표이사 전용
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* 조정 점수 */}
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--neutral-500))] mb-2 block">
                    조정 점수 (최종)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={adjScore}
                    onChange={(e) => setAdjScore(e.target.value)}
                    disabled={!isCeo}
                    placeholder="예: 87.5"
                    className="w-full px-4 py-2.5 rounded-lg border border-[hsl(var(--neutral-200))] text-sm text-[hsl(var(--neutral-900))] bg-white focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary-400))] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Grade */}
                <div>
                  <label className="text-xs font-semibold text-[hsl(var(--neutral-500))] mb-2 block">
                    CEO Grade
                  </label>
                  <div className="flex gap-2">
                    {GRADES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        disabled={!isCeo}
                        onClick={() => setGrade(g === grade ? "" : g)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                          grade === g
                            ? (GRADE_STYLES[g] ?? "")
                            : "border-[hsl(var(--neutral-200))] text-[hsl(var(--neutral-500))] hover:border-[hsl(var(--neutral-300))]"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isCeo && (
                <div className="flex gap-3 mt-6 pt-5 border-t border-[hsl(var(--neutral-100))]">
                  <button
                    type="button"
                    onClick={() => handleSave(false)}
                    disabled={saveCeoReview.isPending || saveScoreAdjustments.isPending}
                    className="flex-1 px-5 py-2.5 rounded-lg border border-[hsl(var(--neutral-200))] text-sm font-semibold text-[hsl(var(--neutral-700))] hover:bg-[hsl(var(--neutral-50))] transition-colors disabled:opacity-50"
                  >
                    임시 저장
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={saveCeoReview.isPending || saveScoreAdjustments.isPending || !grade}
                    className="flex-1 ts-btn-primary px-5 py-2.5 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {evaluation.isConfirmed ? "재확정" : "최종 확정"}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </Shell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ScoreRow({
  score,
  index,
  isCeo,
  adjValue,
  onAdjChange,
}: {
  score: EvaluationScore;
  index: number;
  isCeo: boolean;
  adjValue: string;
  onAdjChange: (val: string) => void;
}) {
  const fmt = (v: number | null) => (v != null ? v.toFixed(1) : "—");

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.05 * index }}
      className="border-b border-[hsl(var(--neutral-100))] last:border-0"
    >
      <td className="px-6 py-3.5 font-medium text-[hsl(var(--neutral-800))]">{score.category}</td>
      <td className="px-4 py-3.5 text-right text-[hsl(var(--neutral-600))]">{fmt(score.scoreSelf)}</td>
      <td className="px-4 py-3.5 text-right text-[hsl(var(--neutral-600))]">{fmt(score.scorePeer)}</td>
      <td className="px-4 py-3.5 text-right text-[hsl(var(--neutral-600))]">{fmt(score.scoreUpper)}</td>
      <td className="px-4 py-3.5 text-right">
        {isCeo ? (
          <input
            type="number"
            step="0.1"
            value={adjValue}
            onChange={(e) => onAdjChange(e.target.value)}
            className="w-20 px-2 py-1 text-right rounded-md border border-[hsl(var(--neutral-200))] text-sm text-[hsl(var(--primary-400))] font-semibold focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary-400))]"
            placeholder="—"
          />
        ) : (
          <span className="font-semibold text-[hsl(var(--primary-400))]">
            {fmt(score.scoreCeoAdjusted)}
          </span>
        )}
      </td>
    </motion.tr>
  );
}
