import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import { useGetSurvey, useStartResponse } from "@/hooks/use-surveys";
import { useRoute, Link, useLocation } from "wouter";
import { Shield, Target, Info, ArrowRight, CheckCircle, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function SurveyIntro() {
  const { isAuthorized } = useProtectedRoute();
  const [, params] = useRoute("/surveys/:id/intro");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const id = params?.id || "";
  const { data: survey, isLoading } = useGetSurvey(id);
  const startMutation = useStartResponse();

  if (!isAuthorized) return null;

  const handleStart = () => {
    startMutation.mutate({ surveyId: id }, {
      onSuccess: () => setLocation(`/surveys/${id}/respond`),
      onError: () => toast({ title: "오류 발생", description: "진단 참여를 시작할 수 없습니다.", variant: "destructive" })
    });
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="max-w-3xl mx-auto animate-pulse space-y-6">
          <div className="h-8 bg-[hsl(var(--neutral-200))] rounded-lg w-1/3"></div>
          <div className="h-48 bg-[hsl(var(--neutral-100))] rounded-xl"></div>
          <div className="h-64 bg-[hsl(var(--neutral-100))] rounded-xl"></div>
        </div>
      </Shell>
    );
  }

  if (!survey) {
    return <Shell><p className="text-[hsl(var(--neutral-500))]">해당 진단을 찾을 수 없습니다.</p></Shell>;
  }

  return (
    <Shell>
      <div className="max-w-3xl mx-auto">
        <Link href="/surveys" className="text-sm font-medium text-[hsl(var(--neutral-500))] hover:text-[hsl(var(--primary-400))] mb-6 inline-flex items-center gap-1 transition-colors">
          ← 진단 목록으로 돌아가기
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-5"
        >
          {/* Hero Header */}
          <div className="ts-card overflow-hidden">
            <div className="bg-[hsl(var(--primary-400))] px-8 py-10 text-white">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-semibold mb-3 tracking-wide">
                {survey.year} {survey.quarter ? `Q${survey.quarter}` : ''} · 사내 조직 진단
              </span>
              <h1 className="text-2xl md:text-3xl font-bold mb-3 leading-snug">
                {survey.introTitle || survey.title}
              </h1>
              <p className="text-white/85 text-sm leading-relaxed max-w-xl">
                {survey.description}
              </p>
            </div>

            <div className="px-8 py-8 space-y-8">
              {/* Purpose & Direction */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[hsl(var(--neutral-900))] font-semibold text-sm">
                    <Target className="w-4 h-4 text-[hsl(var(--primary-400))]" />
                    진단 목적
                  </div>
                  <p className="text-[hsl(var(--neutral-600))] text-sm leading-relaxed">
                    {survey.introPurpose}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[hsl(var(--neutral-900))] font-semibold text-sm">
                    <Info className="w-4 h-4 text-[hsl(var(--primary-400))]" />
                    내부 활용 방향
                  </div>
                  <p className="text-[hsl(var(--neutral-600))] text-sm leading-relaxed">
                    {survey.introDirection}
                  </p>
                </div>
              </div>

              <hr className="border-[hsl(var(--neutral-200))]" />

              {/* Anonymity Notice — design system required box */}
              <div className="ts-notice-box">
                <div className="flex items-center gap-2 font-semibold text-[hsl(var(--neutral-900))] mb-3">
                  <Lock className="w-4 h-4 text-[hsl(var(--primary-400))]" />
                  익명성 및 내부 활용 원칙
                </div>
                <p className="text-[hsl(var(--neutral-700))] text-sm leading-relaxed mb-4">
                  {survey.introConfidentiality}
                </p>
                <ul className="space-y-2">
                  {[
                    "개별 응답은 운영자도 직접 열람할 수 없습니다.",
                    "응답 수가 적은 조직 단위 결과는 공개되지 않습니다.",
                    "이 결과는 인사평가가 아니라 우리 조직의 개선을 위해 사용됩니다."
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[hsl(var(--neutral-600))]">
                      <CheckCircle className="w-4 h-4 text-[hsl(var(--primary-400))] shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Guide */}
              {survey.introGuide && (
                <div className="bg-[hsl(var(--neutral-50))] border border-[hsl(var(--neutral-200))] rounded-lg p-5">
                  <p className="text-xs font-semibold text-[hsl(var(--neutral-500))] uppercase tracking-wider mb-2">작성 가이드</p>
                  <p className="text-sm text-[hsl(var(--neutral-600))] leading-relaxed whitespace-pre-line">
                    {survey.introGuide}
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleStart}
                  disabled={startMutation.isPending || survey.status !== 'active'}
                  className="ts-btn-primary flex items-center gap-2.5 px-10 py-3.5 text-base"
                >
                  {survey.status !== 'active'
                    ? '현재 참여할 수 없습니다'
                    : startMutation.isPending
                    ? '진단을 준비하는 중...'
                    : '진단 참여 시작'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Shell>
  );
}
