import { useState, useEffect } from "react";
import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import { useGetSurvey, useGetMyResponse, useSaveAnswers, useSubmitResponse } from "@/hooks/use-surveys";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function SurveyRespond() {
  const { isAuthorized } = useProtectedRoute();
  const [, params] = useRoute("/surveys/:id/respond");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const id = params?.id || "";
  const { data: survey, isLoading: isLoadingSurvey } = useGetSurvey(id);
  const { data: responseData, isLoading: isLoadingResponse, refetch } = useGetMyResponse(id);

  const saveMutation = useSaveAnswers();
  const submitMutation = useSubmitResponse();

  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [localAnswers, setLocalAnswers] = useState<Record<string, { num?: number; text?: string }>>({});

  useEffect(() => {
    if (responseData?.answers) {
      const initial: Record<string, { num?: number; text?: string }> = {};
      responseData.answers.forEach(ans => {
        initial[ans.surveyQuestionId] = {
          num: ans.numericValue ?? undefined,
          text: ans.textValue ?? undefined
        };
      });
      setLocalAnswers(initial);
    }
  }, [responseData]);

  useEffect(() => {
    if (!isLoadingResponse && !responseData) {
      setLocation(`/surveys/${id}/intro`);
    } else if (responseData?.isSubmitted) {
      toast({ title: "안내", description: "이미 제출이 완료된 설문입니다." });
      setLocation(`/surveys`);
    }
  }, [isLoadingResponse, responseData, setLocation, id, toast]);

  if (!isAuthorized || isLoadingSurvey || isLoadingResponse || !survey || !responseData) {
    return (
      <Shell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[hsl(var(--neutral-200))] border-t-[hsl(var(--primary-400))]"></div>
        </div>
      </Shell>
    );
  }

  const sections = survey.sections || [];
  const currentSection = sections[currentSectionIdx];
  const isLastSection = currentSectionIdx === sections.length - 1;
  const isFirstSection = currentSectionIdx === 0;

  const handleAnswerChange = (questionId: string, type: string, value: string | number) => {
    setLocalAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        ...(type === 'likert_5' ? { num: value as number } : { text: value as string })
      }
    }));
  };

  const getAnswersPayload = () =>
    Object.entries(localAnswers).map(([qId, val]) => ({
      surveyQuestionId: qId,
      numericValue: val.num ?? null,
      textValue: val.text ?? null
    }));

  const handleSaveDraft = async () => {
    await saveMutation.mutateAsync({
      responseId: responseData.id,
      data: { answers: getAnswersPayload() }
    });
      toast({ title: "임시 저장 완료", description: "현재까지의 응답이 저장되었습니다." });
    refetch();
  };

  const handleNext = async () => {
    const missing = currentSection.questions.find(q => {
      if (!q.isRequired) return false;
      const ans = localAnswers[q.id];
      if (!ans) return true;
      if (q.questionType === 'likert_5' && !ans.num) return true;
      if (q.questionType !== 'likert_5' && (!ans.text || ans.text.trim() === '')) return true;
      return false;
    });

    if (missing) {
      toast({ variant: "destructive", title: "필수 항목 누락", description: "필수 문항에 모두 응답해주세요." });
      return;
    }

    await saveMutation.mutateAsync({
      responseId: responseData.id,
      data: { answers: getAnswersPayload() }
    });

    if (!isLastSection) {
      setCurrentSectionIdx(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (!isFirstSection) {
      setCurrentSectionIdx(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    const missing = sections.some(sec =>
      sec.questions.some(q => {
        if (!q.isRequired) return false;
        const ans = localAnswers[q.id];
        return !ans || (q.questionType === 'likert_5' && !ans.num) || (q.questionType !== 'likert_5' && (!ans.text || ans.text.trim() === ''));
      })
    );

    if (missing) {
      toast({ variant: "destructive", title: "제출 실패", description: "작성하지 않은 필수 문항이 있습니다. 이전 섹션을 확인해주세요." });
      return;
    }

    if (confirm("진단 응답을 최종 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.")) {
      try {
        await saveMutation.mutateAsync({ responseId: responseData.id, data: { answers: getAnswersPayload() } });
        await submitMutation.mutateAsync({ responseId: responseData.id });
        toast({ title: "제출 완료", description: "내부 진단 참여에 감사드립니다." });
        setLocation(`/surveys`);
      } catch {
        toast({ variant: "destructive", title: "오류", description: "제출 중 문제가 발생했습니다." });
      }
    }
  };

  const progressPct = ((currentSectionIdx + 1) / sections.length) * 100;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto pb-24">
        {/* Progress Header */}
        <div className="ts-card sticky top-4 z-30 p-4 md:p-5 mb-8">
          <div className="flex justify-between items-center text-sm mb-3">
            <span className="font-medium text-[hsl(var(--neutral-700))]">{survey.title}</span>
            <span className="font-semibold text-[hsl(var(--primary-400))]">
              {currentSectionIdx + 1} / {sections.length}
            </span>
          </div>
          <div className="w-full h-2 bg-[hsl(var(--neutral-200))] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[hsl(var(--primary-400))]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          {/* Section Dots */}
          <div className="flex justify-between mt-3 px-0.5">
            {sections.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 mx-0.5 rounded-full transition-colors",
                  i <= currentSectionIdx ? "bg-[hsl(var(--primary-400))]" : "bg-[hsl(var(--neutral-200))]"
                )}
              />
            ))}
          </div>
        </div>

        {/* Section Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSectionIdx}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="mb-8">
              <div className="inline-block px-3 py-1 bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))] rounded-full text-xs font-semibold mb-3">
                {currentSectionIdx + 1}섹션
              </div>
              <h2 className="text-2xl font-bold text-[hsl(var(--neutral-900))]">{currentSection.name}</h2>
              {currentSection.description && (
                <p className="text-[hsl(var(--neutral-500))] mt-2 text-sm leading-relaxed">{currentSection.description}</p>
              )}
            </div>

            {currentSection.questions.map((q, idx) => {
              const choiceOptions = getShortTextOptions(q.questionText);
              const displayQuestionText = getDisplayQuestionText(q.questionText);

              return (
              <div key={q.id} className="ts-card p-6 md:p-7">
                {/* Question Header */}
                <div className="flex gap-4 mb-6">
                  <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))] font-bold text-sm flex items-center justify-center shrink-0">
                    {q.questionNo || idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-[hsl(var(--neutral-900))] font-medium leading-snug">
                      {displayQuestionText}
                      {q.isRequired && <span className="text-[hsl(var(--red-500))] ml-1">*</span>}
                    </p>
                    {!q.isRequired && (
                      <span className="text-xs text-[hsl(var(--neutral-400))] mt-1 inline-block">선택 항목</span>
                    )}
                  </div>
                </div>

                {/* Input */}
                <div className="pl-0 md:pl-11">
                  {q.questionType === 'likert_5' && (
                    <LikertScale
                      value={localAnswers[q.id]?.num}
                      onChange={(v) => handleAnswerChange(q.id, 'likert_5', v)}
                    />
                  )}
                  {q.questionType === 'short_text' && (
                    choiceOptions.length > 0 ? (
                      <ChoiceOptions
                        value={localAnswers[q.id]?.text}
                        options={choiceOptions}
                        onChange={(option) => handleAnswerChange(q.id, "short_text", option)}
                      />
                    ) : (
                      <input
                        type="text"
                        value={localAnswers[q.id]?.text || ''}
                        onChange={(e) => handleAnswerChange(q.id, 'short_text', e.target.value)}
                        placeholder="입력해주세요"
                        className="ts-input"
                      />
                    )
                  )}
                  {q.questionType === 'long_text' && (
                    <textarea
                      value={localAnswers[q.id]?.text || ''}
                      onChange={(e) => handleAnswerChange(q.id, 'long_text', e.target.value)}
                      placeholder="우리 조직의 개선에 도움이 되도록 의견을 남겨주세요. (생략 가능)"
                      rows={4}
                      className="ts-input resize-y"
                    />
                  )}
                </div>
              </div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Bottom Navigation */}
        <div className="mt-10 flex items-center justify-between pt-6 border-t border-[hsl(var(--neutral-200))]">
          <button
            onClick={handlePrev}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ts-btn-secondary",
              isFirstSection ? "invisible" : ""
            )}
          >
            <ChevronLeft className="w-4 h-4" /> 이전
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saveMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[hsl(var(--neutral-500))] hover:bg-[hsl(var(--neutral-100))] transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> 임시 저장
            </button>

            {isLastSection ? (
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || saveMutation.isPending}
                className="ts-btn-primary flex items-center gap-2 px-7 py-2.5 text-sm"
              >
                <Check className="w-4 h-4" /> 응답 제출
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={saveMutation.isPending}
                className="ts-btn-primary flex items-center gap-2 px-7 py-2.5 text-sm"
              >
                다음 <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function getDisplayQuestionText(questionText: string) {
  return questionText.split("▸")[0]?.trim() || questionText;
}

function getShortTextOptions(questionText: string) {
  if (questionText.includes("직무 유형")) {
    return ["개발", "기획 / PM", "경영관리", "기타"];
  }

  if (questionText.includes("근속 기간")) {
    return ["1년 미만", "1~3년", "3~5년", "5년 이상"];
  }

  const rawOptions = questionText.split("▸")[1];
  if (!rawOptions) return [];

  return rawOptions
    .split("/")
    .map((option) => option.trim())
    .filter(Boolean);
}

function ChoiceOptions({
  value,
  options,
  onChange,
}: {
  value?: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {options.map((option) => {
        const isSelected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
              isSelected
                ? "border-[hsl(var(--primary-400))] bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))]"
                : "border-[hsl(var(--neutral-200))] bg-white text-[hsl(var(--neutral-700))] hover:border-[hsl(var(--primary-200))] hover:bg-[hsl(var(--neutral-50))]"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function LikertScale({ value, onChange }: { value?: number; onChange: (val: number) => void }) {
  const options = [
    { val: 1, label: "전혀\n그렇지 않다" },
    { val: 2, label: "그렇지\n않다" },
    { val: 3, label: "보통\n이다" },
    { val: 4, label: "그렇다" },
    { val: 5, label: "매우\n그렇다" }
  ];

  return (
    <div className="space-y-2">
      {/* Scale labels */}
      <div className="flex justify-between text-[10px] text-[hsl(var(--neutral-400))] px-1">
        <span>전혀 그렇지 않다</span>
        <span>매우 그렇다</span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {options.map(opt => {
          const isSelected = value === opt.val;
          return (
            <button
              key={opt.val}
              onClick={() => onChange(opt.val)}
              className={cn(
                "ts-likert-btn flex flex-col items-center justify-center py-3 md:py-4 px-1",
                isSelected && "ts-likert-selected"
              )}
            >
              <span className={cn(
                "text-lg font-bold mb-1",
                isSelected ? "text-white" : "text-[hsl(var(--neutral-700))]"
              )}>
                {opt.val}
              </span>
              <span className={cn(
                "text-[9px] md:text-[10px] font-medium text-center leading-tight whitespace-pre-line",
                isSelected ? "text-white/90" : "text-[hsl(var(--neutral-400))]"
              )}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
