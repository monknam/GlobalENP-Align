import React from "react";
import { useParams, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useEvalDetail,
  useCriteria,
  useUpsertScore,
  useUpsertText,
  useSubmitEval,
  useActiveSeason,
  getDeptJobGroup,
  GRADE_INFO,
  type EvalGrade,
  type Criteria,
  type GradeAnchor,
} from "@/hooks/use-simple-eval";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  CheckCircle2,
  Save,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── 등급 선택 버튼 ───────────────────────────────────────────────

function GradeButton({
  grade,
  selected,
  onClick,
  disabled,
}: {
  grade: EvalGrade;
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const info = GRADE_INFO[grade];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 border-2"
      style={
        selected
          ? {
              background: info.color,
              color: "#fff",
              borderColor: info.color,
              boxShadow: `0 4px 12px ${info.color}40`,
              transform: "translateY(-1px)",
            }
          : {
              background: info.bg,
              color: info.color,
              borderColor: "transparent",
            }
      }
    >
      {grade}
    </button>
  );
}

// ── 행동 앵커 패널 ───────────────────────────────────────────────

function AnchorPanel({
  anchors,
  selected,
}: {
  anchors: GradeAnchor[];
  selected: EvalGrade | null;
}) {
  if (!selected) {
    return (
      <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] italic px-1">
        등급을 선택하면 행동 기준 설명이 표시됩니다.
      </p>
    );
  }
  const anchor = anchors.find((a) => a.grade === selected);
  if (!anchor) return null;
  const info = GRADE_INFO[selected];
  return (
    <div
      className="rounded-lg p-3 text-sm space-y-1.5"
      style={{ background: info.bg, borderLeft: `3px solid ${info.color}` }}
    >
      <p className="font-semibold text-xs" style={{ color: info.color }}>
        {info.label}
      </p>
      <p className="text-[hsl(var(--enp-on-surface))]">{anchor.anchor_text}</p>
      {anchor.salary_note && (
        <p className="text-xs text-[hsl(var(--enp-on-surface-variant))]">
          💰 연봉 조정 참고: {anchor.salary_note}
        </p>
      )}
    </div>
  );
}

// ── 기준 항목 카드 ───────────────────────────────────────────────

function CriteriaCard({
  criteria,
  currentGrade,
  onGradeSelect,
  disabled,
  index,
}: {
  criteria: Criteria;
  currentGrade: EvalGrade | null;
  onGradeSelect: (grade: EvalGrade) => void;
  disabled: boolean;
  index: number;
}) {
  const [open, setOpen] = React.useState(true);
  const isCommon = criteria.job_group === null;

  return (
    <div className="enp-card overflow-hidden">
      {/* 항목 헤더 */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[hsl(var(--enp-surface-low))] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{
            background: currentGrade ? GRADE_INFO[currentGrade].bg : "hsl(var(--enp-surface-mid))",
            color: currentGrade ? GRADE_INFO[currentGrade].color : "hsl(var(--enp-on-surface-variant))",
          }}
        >
          {currentGrade ?? index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-[hsl(var(--enp-on-surface))]">
              {criteria.name}
            </p>
            {isCommon ? (
              <span className="enp-chip" style={{ background: "#e0f0fc", color: "#00619c" }}>공통</span>
            ) : (
              <span className="enp-chip" style={{ background: "#e8edf8", color: "#3d5d9e" }}>직군</span>
            )}
          </div>
          {criteria.description && (
            <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] mt-0.5 truncate">
              {criteria.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentGrade ? (
            <CheckCircle2 size={16} className="text-[#2e7d32]" />
          ) : (
            <AlertCircle size={16} className="text-[hsl(var(--enp-outline))]" />
          )}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* 항목 본문 */}
      {open && (
        <div className="px-5 pb-5 space-y-3">
          {/* 설명 */}
          {criteria.description && (
            <p className="text-xs text-[hsl(var(--enp-on-surface-variant))]">
              {criteria.description}
            </p>
          )}

          {/* 등급 버튼 */}
          <div className="flex gap-2">
            {(["S", "A", "B", "C", "D"] as EvalGrade[]).map((g) => (
              <GradeButton
                key={g}
                grade={g}
                selected={currentGrade === g}
                onClick={() => onGradeSelect(g)}
                disabled={disabled}
              />
            ))}
          </div>

          {/* 행동 앵커 */}
          <AnchorPanel anchors={criteria.grade_anchors ?? []} selected={currentGrade} />
        </div>
      )}
    </div>
  );
}

// ── 서술 항목 ────────────────────────────────────────────────────

function TextItem({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  const charOk = value.trim().length >= 10;
  return (
    <div className="enp-card p-5 space-y-3">
      <div>
        <p className="font-semibold text-sm text-[hsl(var(--enp-on-surface))]">{label}</p>
        <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] mt-0.5">{hint}</p>
      </div>
      <textarea
        className="enp-input resize-none"
        rows={4}
        placeholder="구체적인 사례나 행동 수준으로 작성하세요 (10자 이상)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ fontFamily: "inherit" }}
      />
      <div className="flex items-center justify-between">
        <span
          className="text-xs"
          style={{ color: charOk ? "#2e7d32" : "hsl(var(--enp-on-surface-variant))" }}
        >
          {value.trim().length}자 {charOk ? "✓" : `(10자 이상 필요)`}
        </span>
      </div>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────

export default function SimpleEvalForm() {
  const { evalId } = useParams<{ evalId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: season } = useActiveSeason();
  const { data: evalDetail, isLoading } = useEvalDetail(evalId ?? null);

  const jobGroup = evalDetail?.employees
    ? getDeptJobGroup(evalDetail.employees.department)
    : "";

  const { data: criteriaList, isLoading: criteriaLoading } = useCriteria(
    season?.id ?? null,
    jobGroup
  );

  const upsertScore = useUpsertScore();
  const upsertText = useUpsertText();
  const submitEval = useSubmitEval();

  const isSubmitted = evalDetail?.status === "submitted";

  // 로컬 상태 — DB에 저장된 값으로 초기화
  const [scores, setScores] = React.useState<Record<string, EvalGrade>>({});
  const [strength, setStrength] = React.useState("");
  const [improvement, setImprovement] = React.useState("");
  const [initialized, setInitialized] = React.useState(false);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // DB 데이터로 로컬 상태 초기화
  React.useEffect(() => {
    if (!evalDetail || initialized) return;
    const scoreMap: Record<string, EvalGrade> = {};
    for (const s of evalDetail.simple_evaluation_scores ?? []) {
      if (s.selected_grade) scoreMap[s.criteria_id] = s.selected_grade;
    }
    setScores(scoreMap);
    for (const t of evalDetail.simple_evaluation_texts ?? []) {
      if (t.item_key === "strength") setStrength(t.content ?? "");
      if (t.item_key === "improvement") setImprovement(t.content ?? "");
    }
    setInitialized(true);
  }, [evalDetail, initialized]);

  // 등급 선택 → 즉시 저장
  const handleGradeSelect = React.useCallback(
    async (criteriaId: string, grade: EvalGrade) => {
      if (!evalId || isSubmitted) return;
      setScores((prev) => ({ ...prev, [criteriaId]: grade }));
      setSaving(criteriaId);
      try {
        await upsertScore.mutateAsync({ evalId, criteriaId, grade });
      } catch {
        toast({ title: "저장 실패", description: "등급 저장 중 오류가 발생했습니다.", variant: "destructive" });
      } finally {
        setSaving(null);
      }
    },
    [evalId, isSubmitted, upsertScore, toast]
  );

  // 서술 저장 (blur 시)
  const handleTextBlur = React.useCallback(
    async (itemKey: "strength" | "improvement", content: string) => {
      if (!evalId || isSubmitted) return;
      try {
        await upsertText.mutateAsync({ evalId, itemKey, content });
      } catch {
        /* silent */
      }
    },
    [evalId, isSubmitted, upsertText]
  );

  // 제출 가능 여부
  const totalCriteria = criteriaList?.length ?? 0;
  const completedScores = Object.keys(scores).filter((cid) =>
    criteriaList?.some((c) => c.id === cid)
  ).length;
  const strengthOk = strength.trim().length >= 10;
  const improvementOk = improvement.trim().length >= 10;
  const canSubmit = completedScores === totalCriteria && strengthOk && improvementOk && !isSubmitted;

  // 제출 처리
  const handleSubmit = React.useCallback(async () => {
    if (!evalId || !canSubmit) return;
    setSubmitting(true);
    try {
      // 서술 최종 저장
      await upsertText.mutateAsync({ evalId, itemKey: "strength", content: strength });
      await upsertText.mutateAsync({ evalId, itemKey: "improvement", content: improvement });
      await submitEval.mutateAsync(evalId);
      setShowConfirm(false);
      toast({ title: "평가 제출 완료", description: "제출되었습니다. 더 이상 수정할 수 없습니다." });
      setTimeout(() => navigate("/simple-eval"), 1500);
    } catch {
      toast({ title: "제출 실패", description: "다시 시도해주세요.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }, [evalId, canSubmit, upsertText, strength, improvement, submitEval, toast, navigate]);

  if (isLoading || criteriaLoading) {
    return (
      <Shell>
        <div className="text-center py-20 text-[hsl(var(--enp-on-surface-variant))]">
          불러오는 중...
        </div>
      </Shell>
    );
  }

  if (!evalDetail) {
    return (
      <Shell>
        <div className="text-center py-20">
          <p className="text-[hsl(var(--enp-on-surface-variant))]">평가 데이터를 찾을 수 없습니다.</p>
          <button className="enp-btn enp-btn-primary mt-4" onClick={() => navigate("/simple-eval")}>
            목록으로
          </button>
        </div>
      </Shell>
    );
  }

  const emp = evalDetail.employees!;

  return (
    <Shell>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* 상단 네비 */}
        <div className="flex items-center gap-3">
          <button
            className="enp-btn enp-btn-secondary text-sm px-3 py-2 flex items-center gap-1.5"
            onClick={() => navigate("/simple-eval")}
          >
            <ChevronLeft size={15} /> 목록
          </button>
          <div className="flex-1" />
          {isSubmitted ? (
            <span className="enp-chip" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
              <CheckCircle2 size={11} /> 제출완료
            </span>
          ) : (
            <span className="enp-chip" style={{ background: "#fef3c7", color: "#b45309" }}>
              임시저장 중
            </span>
          )}
        </div>

        {/* 피평가자 정보 */}
        <div className="enp-card p-5 flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, hsl(var(--enp-primary)) 0%, hsl(var(--enp-secondary)) 100%)" }}
          >
            {emp.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-[hsl(var(--enp-on-surface))]">{emp.full_name}</p>
              {emp.is_department_head && (
                <span className="enp-chip" style={{ background: "#e0f0fc", color: "#00619c" }}>부서장</span>
              )}
            </div>
            <p className="text-sm text-[hsl(var(--enp-on-surface-variant))]">
              {emp.department} · {emp.job_title} · {jobGroup}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="enp-label">진행률</p>
            <p
              className="text-xl font-bold"
              style={{ fontFamily: "Manrope, sans-serif", color: "hsl(var(--enp-primary))" }}
            >
              {totalCriteria > 0
                ? Math.round(((completedScores + (strengthOk ? 1 : 0) + (improvementOk ? 1 : 0)) / (totalCriteria + 2)) * 100)
                : 0}
              %
            </p>
          </div>
        </div>

        {/* 제출완료 배너 */}
        {isSubmitted && (
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "#e8f5e9", border: "1px solid #a5d6a7" }}>
            <CheckCircle2 size={20} className="shrink-0 mt-0.5" style={{ color: "#2e7d32" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "#1b5e20" }}>제출 완료된 평가입니다</p>
              <p className="text-xs mt-0.5" style={{ color: "#2e7d32" }}>
                {evalDetail.submitted_at &&
                  new Date(evalDetail.submitted_at).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" })}
                에 제출 — 내용은 읽기 전용입니다.
              </p>
            </div>
          </div>
        )}

        {/* ── Section A: 공통 항목 ───────────────────────── */}
        <div>
          <p className="enp-label mb-3">공통 평가 항목 (3개)</p>
          <div className="space-y-3">
            {criteriaList
              ?.filter((c) => c.job_group === null)
              .map((c, i) => (
                <CriteriaCard
                  key={c.id}
                  index={i + 1}
                  criteria={c}
                  currentGrade={scores[c.id] ?? null}
                  onGradeSelect={(g) => handleGradeSelect(c.id, g)}
                  disabled={isSubmitted || saving === c.id}
                />
              ))}
          </div>
        </div>

        {/* ── Section B: 직군 특화 항목 ─────────────────── */}
        <div>
          <p className="enp-label mb-3">{jobGroup} 특화 항목 (3개)</p>
          <div className="space-y-3">
            {criteriaList
              ?.filter((c) => c.job_group !== null)
              .map((c, i) => (
                <CriteriaCard
                  key={c.id}
                  index={i + 4}
                  criteria={c}
                  currentGrade={scores[c.id] ?? null}
                  onGradeSelect={(g) => handleGradeSelect(c.id, g)}
                  disabled={isSubmitted || saving === c.id}
                />
              ))}
          </div>
        </div>

        {/* ── Section C: 서술 항목 ────────────────────────── */}
        <div>
          <p className="enp-label mb-3">자유 서술 항목</p>
          <div className="space-y-3">
            <TextItem
              label="⑦ 올해 가장 잘한 것"
              hint="연봉 인상 근거 메모로 활용. 구체적인 사례나 성과 중심으로 작성하세요."
              value={strength}
              onChange={setStrength}
              disabled={isSubmitted}
            />
            <TextItem
              label="⑧ 내년에 반드시 개선해야 할 것"
              hint="인상 보류·조정 시 근거. 개인적 관찰에 기반한 구체적 행동 수준으로 작성하세요."
              value={improvement}
              onChange={setImprovement}
              disabled={isSubmitted}
            />
          </div>
        </div>

        {/* ── 서술 저장 버튼 (blur 대신 수동) ── */}
        {!isSubmitted && (
          <div
            className="enp-card p-4 flex items-center justify-between gap-4"
            style={{ position: "sticky", bottom: 24 }}
          >
            <div className="text-sm text-[hsl(var(--enp-on-surface-variant))]">
              {completedScores}/{totalCriteria}개 등급 선택 ·{" "}
              {strengthOk && improvementOk ? (
                <span style={{ color: "#2e7d32" }}>서술 항목 완료</span>
              ) : (
                <span>서술 {[!strengthOk && "①", !improvementOk && "②"].filter(Boolean).join("/")} 미작성</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="enp-btn enp-btn-secondary text-sm flex items-center gap-1.5"
                onClick={() => handleTextBlur("strength", strength).then(() => handleTextBlur("improvement", improvement))}
              >
                <Save size={14} /> 저장
              </button>
              <button
                className="enp-btn enp-btn-primary text-sm flex items-center gap-1.5"
                disabled={!canSubmit || submitting}
                onClick={() => setShowConfirm(true)}
              >
                <Send size={14} /> 제출
              </button>
            </div>
          </div>
        )}

        {/* 제출 확인 모달 */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="enp-glass enp-shadow-modal rounded-2xl p-8 max-w-sm w-full mx-4 space-y-4">
              <div>
                <p className="text-lg font-bold text-[hsl(var(--enp-on-surface))]">평가를 제출하시겠습니까?</p>
                <p className="text-sm text-[hsl(var(--enp-on-surface-variant))] mt-1">
                  제출 후에는 수정이 불가합니다. <strong>{emp.full_name}</strong>님의 평가 결과가 확정됩니다.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 enp-btn enp-btn-secondary"
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                >
                  취소
                </button>
                <button
                  className="flex-1 enp-btn enp-btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "제출 중..." : "제출 확인"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
