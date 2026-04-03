import React from "react";
import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetEvalInstance,
  useGetEvalItems,
  useGetSubmission,
  useGetScores,
  useSaveEvaluation,
  useGetEmployee,
  useMyEmployeeId,
  type EvalItem,
  type EvalSubmission,
  type Employee,
} from "@/hooks/use-evaluation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Info, Save, Send, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ── 등급 설명 표 ─────────────────────────────────────────────

const GRADE_LABELS = ["D 부진", "C 미흡", "B 보통", "A 우수", "S 탁월"];
const GRADE_COLORS = [
  "border-red-200 bg-red-50 text-red-700",
  "border-orange-200 bg-orange-50 text-orange-700",
  "border-zinc-200 bg-zinc-50 text-zinc-700",
  "border-blue-200 bg-blue-50 text-blue-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
];
const GRADE_SELECTED = [
  "border-red-400 bg-red-100 text-red-800 ring-2 ring-red-300",
  "border-orange-400 bg-orange-100 text-orange-800 ring-2 ring-orange-300",
  "border-zinc-400 bg-zinc-100 text-zinc-800 ring-2 ring-zinc-400",
  "border-blue-400 bg-blue-100 text-blue-800 ring-2 ring-blue-400",
  "border-emerald-400 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400",
];

// ── 항목별 평가 카드 ──────────────────────────────────────────

interface ItemCardProps {
  item: EvalItem;
  score: number;
  evidenceText: string;
  onScore: (score: number) => void;
  onEvidence: (text: string) => void;
  readOnly?: boolean;
}

function ItemCard({ item, score, evidenceText, onScore, onEvidence, readOnly }: ItemCardProps) {
  const [showAnchor, setShowAnchor] = React.useState(false);

  const descByScore = [
    item.level1Desc,
    item.level2Desc,
    item.level3Desc,
    item.level4Desc,
    item.level5Desc,
  ];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
      {/* 항목 헤더 */}
      <div className="px-5 py-4 border-b border-zinc-100 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900">{item.itemName}</span>
            <span className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded",
              item.itemType === "attitude"
                ? "bg-violet-50 text-violet-600"
                : "bg-blue-50 text-blue-600"
            )}>
              {item.itemType === "attitude" ? "태도" : "성과"}
            </span>
          </div>
          {item.itemDescription && (
            <p className="text-xs text-zinc-500 mt-1">{item.itemDescription}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAnchor(!showAnchor)}
          className="text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
          title="행동지표 보기"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* 행동지표 (토글) */}
      {showAnchor && (
        <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100">
          <p className="text-[11px] font-semibold text-zinc-500 mb-2 uppercase tracking-wide">
            단계별 행동지표
          </p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((lvl) => {
              const desc = descByScore[lvl - 1];
              if (!desc) return null;
              const isCurrentScore = score === lvl;
              return (
                <div
                  key={lvl}
                  className={cn(
                    "flex gap-2.5 rounded-lg px-3 py-2 text-xs transition-colors",
                    isCurrentScore
                      ? GRADE_SELECTED[lvl - 1].replace("ring-2 ring-", "border ").split(" border ")[0] + " border"
                      : "bg-white border border-zinc-100"
                  )}
                >
                  <span className={cn(
                    "shrink-0 font-bold text-[11px] w-10",
                    isCurrentScore ? "" : "text-zinc-400"
                  )}>
                    {GRADE_LABELS[lvl - 1].split(" ")[0]}
                  </span>
                  <span className="text-zinc-600 leading-relaxed">{desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 점수 선택 */}
      <div className="px-5 py-4">
        <p className="text-xs text-zinc-500 mb-3">점수를 선택하세요</p>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              disabled={readOnly}
              onClick={() => !readOnly && onScore(s)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-3 rounded-lg border text-xs font-medium transition-all",
                readOnly ? "cursor-default" : "cursor-pointer hover:shadow-sm",
                score === s ? GRADE_SELECTED[s - 1] : GRADE_COLORS[s - 1]
              )}
            >
              <span className="text-base font-bold">{s}</span>
              <span className="text-[10px] leading-tight text-center">
                {GRADE_LABELS[s - 1].split(" ")[0]}
              </span>
            </button>
          ))}
        </div>

        {/* 선택된 행동지표 표시 */}
        {score > 0 && descByScore[score - 1] && (
          <div className={cn(
            "mt-3 px-3 py-2.5 rounded-lg border text-xs",
            GRADE_COLORS[score - 1]
          )}>
            <span className="font-semibold">{GRADE_LABELS[score - 1]}: </span>
            {descByScore[score - 1]}
          </div>
        )}

        {/* 성과 항목: 사례 기재란 */}
        {item.hasEvidence && (
          <div className="mt-3">
            <label className="text-xs text-zinc-500 font-medium block mb-1.5">
              구체적 사례·근거 기재
              <span className="text-zinc-400 font-normal ml-1">(성과 항목 필수 — 실제 수치/사례 포함 권장)</span>
            </label>
            <Textarea
              value={evidenceText}
              onChange={(e) => !readOnly && onEvidence(e.target.value)}
              readOnly={readOnly}
              placeholder="예) 3월 제연댐퍼 생산라인 목표 520개 대비 531개 달성 (102%). 4월 공정 개선 제안으로 사이클 타임 12% 단축."
              rows={3}
              className="text-xs resize-none"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── 단계 레이블 ───────────────────────────────────────────────

const STEP_LABEL: Record<EvalSubmission["step"], string> = {
  self: "자기평가",
  first: "1차 상사 평가",
  second: "2차 상사 평가",
  committee: "커미티 검토",
};

// ── 메인 폼 페이지 ────────────────────────────────────────────

export default function EvaluationFormPage() {
  const params = useParams<{ instanceId: string; step: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const step = params.step as EvalSubmission["step"];
  const instanceId = params.instanceId;
  const actorId = useMyEmployeeId();

  const { data: instance, isLoading: instLoading } = useGetEvalInstance(instanceId);
  const { data: actor } = useGetEmployee(actorId);

  // 직군에 맞는 항목 조회
  const jobGroup = instance?.jobGroup as Employee["jobGroup"] | undefined;
  const { data: items = [] } = useGetEvalItems(
    (jobGroup && jobGroup !== "executive") ? jobGroup : null
  );

  // 기존 제출 내용 조회
  const { data: existingSubmission } = useGetSubmission(instanceId, step);
  const { data: existingScores = [] } = useGetScores(existingSubmission?.id);

  // 폼 상태
  const [scores, setScores] = React.useState<Record<string, number>>({});
  const [evidence, setEvidence] = React.useState<Record<string, string>>({});
  const [overallComment, setOverallComment] = React.useState("");

  // 기존 데이터로 초기화
  React.useEffect(() => {
    if (existingSubmission) {
      setOverallComment(existingSubmission.overallComment ?? "");
    }
  }, [existingSubmission]);

  React.useEffect(() => {
    if (existingScores.length > 0) {
      const s: Record<string, number> = {};
      const e: Record<string, string> = {};
      for (const sc of existingScores) {
        s[sc.itemId] = sc.score;
        if (sc.evidenceText) e[sc.itemId] = sc.evidenceText;
      }
      setScores(s);
      setEvidence(e);
    }
  }, [existingScores]);

  const save = useSaveEvaluation();

  const isReadOnly = existingSubmission?.status === "submitted";
  const allScored = items.length > 0 && items.every((item) => scores[item.id] > 0);

  const handleSave = async (submit: boolean) => {
    if (!actorId) {
      toast({ title: "테스트 모드: 사용자를 선택하세요", variant: "destructive" });
      return;
    }
    if (submit && !allScored) {
      toast({ title: "모든 항목에 점수를 입력해주세요", variant: "destructive" });
      return;
    }

    try {
      await save.mutateAsync({
        instanceId,
        evaluatorId: actorId,
        step,
        overallComment,
        scores: items.map((item) => ({
          itemId: item.id,
          score: scores[item.id] ?? 0,
          evidenceText: evidence[item.id],
        })),
        submit,
      });
      toast({
        title: submit ? "평가 제출 완료" : "임시 저장 완료",
        description: submit ? "다음 단계로 진행됩니다." : undefined,
      });
      if (submit) navigate(instance?.cycleId ? `/evaluation/${instance.cycleId}` : "/evaluation");
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 헤더 */}
      <div>
        <Link href="/evaluation" className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-600 mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" />
          평가 관리로 돌아가기
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">
              {STEP_LABEL[step]}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              피평가자: <strong>{instance.employeeName}</strong>
              {" · "}{instance.jobTitle}
              {" · "}{instance.department}
            </p>
          </div>
          {isReadOnly && (
            <Badge variant="secondary" className="shrink-0 mt-1">제출 완료</Badge>
          )}
        </div>
      </div>

      {/* 테스트 액터 표시 */}
      {actor && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          평가자 (테스트): <strong>{actor.fullName}</strong> · {actor.jobTitle}
        </div>
      )}

      {/* 평가 항목 */}
      {items.length === 0 ? (
        <div className="text-sm text-zinc-400 text-center py-12">
          해당 직군의 평가 항목이 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              score={scores[item.id] ?? 0}
              evidenceText={evidence[item.id] ?? ""}
              onScore={(s) => setScores((prev) => ({ ...prev, [item.id]: s }))}
              onEvidence={(t) => setEvidence((prev) => ({ ...prev, [item.id]: t }))}
              readOnly={isReadOnly}
            />
          ))}
        </div>
      )}

      {/* 종합 의견 */}
      <div className="bg-white rounded-xl border border-zinc-200 px-5 py-4">
        <label className="text-sm font-semibold text-zinc-700 block mb-2">
          종합 의견 <span className="font-normal text-zinc-400">(선택)</span>
        </label>
        <Textarea
          value={overallComment}
          onChange={(e) => !isReadOnly && setOverallComment(e.target.value)}
          readOnly={isReadOnly}
          placeholder="평가 대상자에 대한 종합적인 의견을 자유롭게 작성하세요."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* 점수 요약 */}
      {items.length > 0 && Object.keys(scores).length > 0 && (
        <div className="bg-zinc-50 rounded-xl border px-5 py-4">
          <p className="text-xs font-semibold text-zinc-500 mb-3">점수 요약</p>
          <div className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-zinc-600 truncate">{item.itemName}</span>
                <span className={cn(
                  "font-bold ml-2 shrink-0",
                  scores[item.id] === 5 ? "text-emerald-600" :
                  scores[item.id] === 4 ? "text-blue-600" :
                  scores[item.id] === 3 ? "text-zinc-600" :
                  scores[item.id] === 2 ? "text-orange-600" :
                  scores[item.id] === 1 ? "text-red-600" : "text-zinc-300"
                )}>
                  {scores[item.id] ? `${scores[item.id]}점` : "미입력"}
                </span>
              </div>
            ))}
          </div>
          {Object.keys(scores).length === items.length && (
            <div className="mt-3 pt-3 border-t border-zinc-200 flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-600">평균</span>
              <span className="text-base font-bold text-zinc-900">
                {(Object.values(scores).reduce((a, b) => a + b, 0) / items.length).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 제출 버튼 */}
      {!isReadOnly && (
        <div className="flex justify-end gap-3 pb-8">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={save.isPending}
          >
            <Save className="w-4 h-4 mr-1.5" />
            임시 저장
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={save.isPending || !allScored}
          >
            <Send className="w-4 h-4 mr-1.5" />
            {save.isPending ? "제출 중..." : "최종 제출"}
          </Button>
        </div>
      )}
    </div>
    </Shell>
  );
}
