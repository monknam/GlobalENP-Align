import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import { useGetSurveys } from "@/hooks/use-surveys";
import { formatDate } from "@/lib/utils";
import { Link } from "wouter";
import { ClipboardList, Calendar, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SurveyList() {
  const { isAuthorized } = useProtectedRoute();
  const { data: surveys, isLoading } = useGetSurveys();
  const surveyList = Array.isArray(surveys) ? surveys : [];

  if (!isAuthorized) return null;

  return (
    <Shell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--neutral-900))] flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary-50))] text-[hsl(var(--primary-400))] flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
            조직 진단
          </h1>
          <p className="text-[hsl(var(--neutral-500))] text-sm mt-2 ml-10">현재 참여 가능하거나 진행 이력이 있는 우리 조직의 진단 목록입니다.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-[hsl(var(--neutral-200))] rounded-xl"></div>
            ))}
          </div>
        ) : surveyList.length === 0 ? (
          <div className="ts-card p-14 flex flex-col items-center justify-center text-center">
            <ClipboardList className="w-14 h-14 text-[hsl(var(--neutral-300))] mb-4" />
            <h3 className="font-semibold text-[hsl(var(--neutral-700))]">현재 참여 가능한 진단이 없습니다.</h3>
            <p className="text-[hsl(var(--neutral-500))] text-sm mt-1">새로운 내부 진단이 시작되면 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {surveyList.map((survey, index) => (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Link href={`/surveys/${survey.id}/intro`} className="block">
                  <div className="ts-card p-6 hover:border-[hsl(var(--primary-300))] hover:shadow-md transition-all duration-200 group cursor-pointer">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={survey.status} />
                          <span className="text-xs text-[hsl(var(--neutral-500))] flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {survey.year}{survey.quarter && ` Q${survey.quarter}`}
                          </span>
                        </div>
                        <h2 className="font-bold text-[hsl(var(--neutral-900))] group-hover:text-[hsl(var(--primary-400))] transition-colors">
                          {survey.title}
                        </h2>
                        {survey.startAt && survey.endAt && (
                          <p className="text-xs text-[hsl(var(--neutral-400))]">
                            {formatDate(survey.startAt)} ~ {formatDate(survey.endAt)}
                          </p>
                        )}
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-[hsl(var(--neutral-100))] group-hover:bg-[hsl(var(--primary-400))] flex items-center justify-center text-[hsl(var(--neutral-400))] group-hover:text-white transition-colors shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Shell>
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
