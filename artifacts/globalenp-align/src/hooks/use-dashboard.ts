import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";

// ── Types ──────────────────────────────────────────────

export interface QuestionResult {
  questionId: string;
  questionText: string;
  questionNo: number | null;
  questionType: string;
  avgScore: number | null;
  responseCount: number;
  distribution: Record<string, number>;
}

export interface SectionResult {
  sectionId: string;
  sectionName: string;
  description: string | null;
  sortOrder: number;
  avgScore: number | null;
  questionResults: QuestionResult[];
}

export interface DeptStat {
  departmentId: string;
  departmentName: string;
  submittedCount: number;
  totalEligible: number;
  responseRate: number;
}

export interface SurveyDashboard {
  survey: {
    id: string;
    title: string;
    description: string | null;
    year: number;
    quarter: number | null;
    status: string;
    anonymousMinCount: number;
  };
  overallResponseRate: number;
  submittedCount: number;
  totalEligible: number;
  departmentStats: DeptStat[];
  sectionResults: SectionResult[];
}

export interface QualitativeQuestion {
  questionId: string;
  questionNo: number | null;
  questionText: string;
  sectionName: string;
  responses: string[];
  responseCount: number;
}

export interface QualitativeData {
  safe: boolean;
  submittedCount: number;
  minRequired?: number;
  questions: QualitativeQuestion[];
}

export interface ActionItem {
  id: string;
  surveyCycleId: string | null;
  category: "company_wide" | "team_leader" | "management" | "executive";
  title: string;
  description: string | null;
  owner: string | null;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  dueDate: string | null;
  createdAt: string;
}

// ── Dashboard Overview (Supabase direct) ───────────────

export interface DashboardOverview {
  totalUsers: number;
  totalDepartments: number;
  activeSurveys: number;
  recentSurveys: {
    id: string;
    title: string;
    year: number;
    quarter: number | null;
    status: string;
    responseRate: number;
    submittedCount: number;
    totalEligible: number;
  }[];
}

export function useGetDashboardOverview() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async (): Promise<DashboardOverview> => {
      const [usersRes, deptRes, activeRes, surveysRes] = await Promise.all([
        supabase!.from("profiles").select("*", { count: "exact", head: true }),
        supabase!.from("departments").select("*", { count: "exact", head: true }),
        supabase!.from("survey_cycles").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase!
          .from("survey_cycles")
          .select("id, title, year, quarter, status")
          .in("status", ["active", "closed"])
          .order("year", { ascending: false })
          .limit(5),
      ]);

      const totalUsers = usersRes.count ?? 0;
      const cycles = (surveysRes.data ?? []) as {
        id: string;
        title: string;
        year: number;
        quarter: number | null;
        status: string;
      }[];

      const recentSurveys = await Promise.all(
        cycles.map(async (s) => {
          const { count } = await supabase!
            .from("survey_responses")
            .select("*", { count: "exact", head: true })
            .eq("survey_cycle_id", s.id)
            .eq("is_submitted", true);
          const submitted = count ?? 0;
          return {
            ...s,
            submittedCount: submitted,
            totalEligible: totalUsers,
            responseRate: totalUsers > 0 ? (submitted / totalUsers) * 100 : 0,
          };
        })
      );

      return {
        totalUsers,
        totalDepartments: deptRes.count ?? 0,
        activeSurveys: activeRes.count ?? 0,
        recentSurveys,
      };
    },
    enabled: !!supabase && !!user,
    staleTime: 2 * 60 * 1000,
  });
}

// ── Survey Dashboard (Supabase direct) ─────────────────

export function useSurveyDashboard(surveyId: string | null) {
  return useQuery<SurveyDashboard>({
    queryKey: ["dashboard", "survey", surveyId],
    queryFn: async () => {
      // 1. 설문 기본 정보
      const { data: cycleData, error: cycleErr } = await supabase!
        .from("survey_cycles")
        .select("id, title, description, year, quarter, status, anonymous_min_count")
        .eq("id", surveyId!)
        .single();
      if (cycleErr) throw cycleErr;
      const cycle = cycleData as Record<string, unknown>;

      const anonymousMinCount = (cycle.anonymous_min_count as number) ?? 3;

      // 2. 제출 인원 / 전체 인원
      const [submittedRes, totalRes] = await Promise.all([
        supabase!
          .from("survey_responses")
          .select("id, respondent_department_id", { count: "exact" })
          .eq("survey_cycle_id", surveyId!)
          .eq("is_submitted", true),
        supabase!.from("profiles").select("id, department_id", { count: "exact" }),
      ]);
      const submittedCount = submittedRes.count ?? 0;
      const totalEligible = totalRes.count ?? 0;
      const submittedRows = (submittedRes.data ?? []) as { id: string; respondent_department_id: string | null }[];
      const profileRows = (totalRes.data ?? []) as { id: string; department_id: string | null }[];

      // 3. 부서 목록
      const { data: deptData } = await supabase!.from("departments").select("id, name");
      const departments = (deptData ?? []) as { id: string; name: string }[];

      const departmentStats: DeptStat[] = departments.map((dept) => {
        const deptSubmitted = submittedRows.filter((r) => r.respondent_department_id === dept.id).length;
        const deptTotal = profileRows.filter((p) => p.department_id === dept.id).length;
        return {
          departmentId: dept.id,
          departmentName: dept.name,
          submittedCount: deptSubmitted,
          totalEligible: deptTotal,
          responseRate: deptTotal > 0 ? (deptSubmitted / deptTotal) * 100 : 0,
        };
      });

      // 4. 섹션 + 질문 목록
      const { data: sectionData, error: secErr } = await supabase!
        .from("survey_sections")
        .select("id, name, description, sort_order, survey_questions(id, question_no, question_text, question_type, sort_order, is_active)")
        .eq("survey_cycle_id", surveyId!)
        .order("sort_order");
      if (secErr) throw secErr;
      const rawSections = (sectionData ?? []) as Record<string, unknown>[];

      // 5. 제출된 답변 전체 조회
      const { data: answerData, error: ansErr } = await supabase!
        .from("survey_answers")
        .select("survey_question_id, numeric_value, text_value, survey_response_id")
        .in(
          "survey_response_id",
          submittedRows.map((r) => r.id)
        );
      if (ansErr) throw ansErr;
      const answers = (answerData ?? []) as {
        survey_question_id: string;
        numeric_value: number | null;
        text_value: string | null;
        survey_response_id: string;
      }[];

      // 6. 질문별 집계 맵 생성
      const answersByQuestion: Record<string, number[]> = {};
      for (const a of answers) {
        if (a.numeric_value !== null) {
          if (!answersByQuestion[a.survey_question_id]) answersByQuestion[a.survey_question_id] = [];
          answersByQuestion[a.survey_question_id].push(a.numeric_value);
        }
      }

      // 7. 섹션 결과 조립
      const sectionResults: SectionResult[] = rawSections.map((sec) => {
        const questions = ((sec.survey_questions as Record<string, unknown>[]) ?? [])
          .filter((q) => q.is_active)
          .sort((a, b) => (a.sort_order as number) - (b.sort_order as number));

        const questionResults: QuestionResult[] = questions.map((q) => {
          const qid = q.id as string;
          const nums = answersByQuestion[qid] ?? [];
          const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
          const dist: Record<string, number> = {};
          for (const v of nums) {
            dist[String(v)] = (dist[String(v)] ?? 0) + 1;
          }
          return {
            questionId: qid,
            questionText: q.question_text as string,
            questionNo: (q.question_no as number) ?? null,
            questionType: q.question_type as string,
            avgScore: avg !== null ? Math.round(avg * 100) / 100 : null,
            responseCount: nums.length,
            distribution: dist,
          };
        });

        const likertResults = questionResults.filter(
          (qr) => qr.questionType === "likert_5" && qr.avgScore !== null
        );
        const secAvg =
          likertResults.length > 0
            ? Math.round(
                (likertResults.reduce((a, b) => a + (b.avgScore ?? 0), 0) / likertResults.length) * 100
              ) / 100
            : null;

        return {
          sectionId: sec.id as string,
          sectionName: sec.name as string,
          description: (sec.description as string) ?? null,
          sortOrder: sec.sort_order as number,
          avgScore: secAvg,
          questionResults,
        };
      });

      return {
        survey: {
          id: cycle.id as string,
          title: cycle.title as string,
          description: (cycle.description as string) ?? null,
          year: cycle.year as number,
          quarter: (cycle.quarter as number) ?? null,
          status: cycle.status as string,
          anonymousMinCount,
        },
        overallResponseRate: totalEligible > 0 ? (submittedCount / totalEligible) * 100 : 0,
        submittedCount,
        totalEligible,
        departmentStats,
        sectionResults,
      };
    },
    enabled: !!supabase && !!surveyId,
    staleTime: 30_000,
  });
}

// ── Qualitative Responses (Supabase direct) ────────────

export function useQualitative(surveyId: string | null) {
  return useQuery<QualitativeData>({
    queryKey: ["dashboard", "qualitative", surveyId],
    queryFn: async () => {
      // 익명 최소 인원 조회
      const { data: cycleData } = await supabase!
        .from("survey_cycles")
        .select("anonymous_min_count")
        .eq("id", surveyId!)
        .single();
      const minRequired = (cycleData as Record<string, unknown> | null)?.anonymous_min_count as number ?? 3;

      // 제출된 응답 ID 목록
      const { data: respData, count: submittedCount } = await supabase!
        .from("survey_responses")
        .select("id", { count: "exact" })
        .eq("survey_cycle_id", surveyId!)
        .eq("is_submitted", true);
      const submittedIds = (respData ?? []).map((r: Record<string, unknown>) => r.id as string);

      if (submittedIds.length < minRequired) {
        return { safe: false, submittedCount: submittedCount ?? 0, minRequired, questions: [] };
      }

      // long_text 질문 목록
      const { data: sectionData } = await supabase!
        .from("survey_sections")
        .select("name, survey_questions(id, question_no, question_text, question_type, sort_order, is_active)")
        .eq("survey_cycle_id", surveyId!);

      const ltQuestions: { id: string; questionNo: number | null; questionText: string; sectionName: string }[] = [];
      for (const sec of (sectionData ?? []) as Record<string, unknown>[]) {
        for (const q of (sec.survey_questions as Record<string, unknown>[]) ?? []) {
          if (q.question_type === "long_text" && q.is_active) {
            ltQuestions.push({
              id: q.id as string,
              questionNo: (q.question_no as number) ?? null,
              questionText: q.question_text as string,
              sectionName: sec.name as string,
            });
          }
        }
      }

      // long_text 답변 수집
      const { data: answerData } = await supabase!
        .from("survey_answers")
        .select("survey_question_id, text_value")
        .in("survey_response_id", submittedIds)
        .not("text_value", "is", null)
        .neq("text_value", "");

      const answerMap: Record<string, string[]> = {};
      for (const a of (answerData ?? []) as { survey_question_id: string; text_value: string | null }[]) {
        if (!a.text_value) continue;
        if (!answerMap[a.survey_question_id]) answerMap[a.survey_question_id] = [];
        answerMap[a.survey_question_id].push(a.text_value);
      }

      const questions: QualitativeQuestion[] = ltQuestions.map((q) => {
        const responses = answerMap[q.id] ?? [];
        return {
          questionId: q.id,
          questionNo: q.questionNo,
          questionText: q.questionText,
          sectionName: q.sectionName,
          responses,
          responseCount: responses.length,
        };
      });

      return { safe: true, submittedCount: submittedCount ?? 0, minRequired, questions };
    },
    enabled: !!supabase && !!surveyId,
    staleTime: 30_000,
  });
}

// ── Group Comparison Types ─────────────────────────────

export interface GroupSectionData {
  sectionId: string;
  sectionName: string;
  avgScore: number | null;
}

export interface GroupData {
  count: number;
  safe: boolean;
  sections: GroupSectionData[];
}

export interface GroupComparisonData {
  groups: Record<string, GroupData>;
  minRequired: number;
}

export const GROUP_LABELS: Record<string, string> = {
  dev: "개발 직군",
  non_dev: "비개발 직군",
  management: "경영지원",
};
export const GROUP_COLORS: Record<string, string> = {
  dev: "hsl(207 90% 54%)",
  non_dev: "hsl(142 76% 36%)",
  management: "hsl(38 92% 50%)",
};

export function useGroupComparison(surveyId: string | null) {
  return useQuery<GroupComparisonData>({
    queryKey: ["dashboard", "group-comparison", surveyId],
    queryFn: async () => {
      // 익명 최소 인원
      const { data: cycleData } = await supabase!
        .from("survey_cycles")
        .select("anonymous_min_count")
        .eq("id", surveyId!)
        .single();
      const minRequired = (cycleData as Record<string, unknown> | null)?.anonymous_min_count as number ?? 3;

      // 제출된 응답 + 응답자 프로필 (job_group)
      const { data: respData } = await supabase!
        .from("survey_responses")
        .select("id, respondent_user_id")
        .eq("survey_cycle_id", surveyId!)
        .eq("is_submitted", true);

      const respondents = (respData ?? []) as { id: string; respondent_user_id: string }[];
      const userIds = respondents.map((r) => r.respondent_user_id);

      const { data: profileData } = await supabase!
        .from("profiles")
        .select("id, job_group")
        .in("id", userIds);

      const profileMap: Record<string, string | null> = {};
      for (const p of (profileData ?? []) as { id: string; job_group: string | null }[]) {
        profileMap[p.id] = p.job_group;
      }

      // 응답 ID → job_group 매핑
      const responsesByGroup: Record<string, string[]> = { dev: [], non_dev: [], management: [] };
      for (const r of respondents) {
        const group = profileMap[r.respondent_user_id];
        if (group && group in responsesByGroup) {
          responsesByGroup[group].push(r.id);
        }
      }

      // 섹션 목록
      const { data: sectionData } = await supabase!
        .from("survey_sections")
        .select("id, name, sort_order, survey_questions(id, question_type, is_active)")
        .eq("survey_cycle_id", surveyId!)
        .order("sort_order");
      const sections = (sectionData ?? []) as Record<string, unknown>[];

      // 그룹별 집계
      const groups: Record<string, GroupData> = {};

      for (const [groupKey, responseIds] of Object.entries(responsesByGroup)) {
        const count = responseIds.length;
        const safe = count >= minRequired;

        if (!safe || responseIds.length === 0) {
          groups[groupKey] = { count, safe, sections: [] };
          continue;
        }

        const { data: answerData } = await supabase!
          .from("survey_answers")
          .select("survey_question_id, numeric_value")
          .in("survey_response_id", responseIds)
          .not("numeric_value", "is", null);
        const answers = (answerData ?? []) as { survey_question_id: string; numeric_value: number }[];

        const ansMap: Record<string, number[]> = {};
        for (const a of answers) {
          if (!ansMap[a.survey_question_id]) ansMap[a.survey_question_id] = [];
          ansMap[a.survey_question_id].push(a.numeric_value);
        }

        const sectionResults: GroupSectionData[] = sections.map((sec) => {
          const questions = (sec.survey_questions as Record<string, unknown>[]).filter(
            (q) => q.is_active && q.question_type === "likert_5"
          );
          const scores: number[] = [];
          for (const q of questions) {
            const qScores = ansMap[q.id as string] ?? [];
            scores.push(...qScores);
          }
          const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : null;
          return {
            sectionId: sec.id as string,
            sectionName: sec.name as string,
            avgScore: avg,
          };
        });

        groups[groupKey] = { count, safe, sections: sectionResults };
      }

      return { groups, minRequired };
    },
    enabled: !!supabase && !!surveyId,
    staleTime: 30_000,
  });
}

// ── Qualitative Theme Mapping ──────────────────────────

export interface QualitativeTheme {
  id: string;
  label: string;
  description: string;
  questions: QualitativeQuestion[];
  icon: string;
}

export const QUALITATIVE_THEME_MAP: Array<{
  qNos: number[];
  id: string;
  label: string;
  description: string;
  icon: string;
}> = [
  { qNos: [46], id: "strength", label: "강점", description: "구성원이 공통으로 인식하는 조직의 강점", icon: "✅" },
  { qNos: [47, 48], id: "problem", label: "핵심 문제", description: "가장 심각하게 인식되는 조직 문제와 구체적 사례", icon: "⚠️" },
  { qNos: [49], id: "improvement", label: "개선 우선과제", description: "가장 먼저 바꿔야 할 것에 대한 구성원의 견해", icon: "🔧" },
  { qNos: [50], id: "leadership", label: "리더십 피드백", description: "리더십(팀장/임원/대표)에 대한 개선 요청", icon: "👔" },
  { qNos: [51], id: "mgmt_request", label: "경영관리실 요청", description: "경영관리실(HR/운영)에 대한 구체적 요청", icon: "🏢" },
  { qNos: [52, 53], id: "system", label: "시스템 / 도구 / 환경", description: "불편하거나 개선이 필요한 업무 도구 및 환경", icon: "💻" },
  { qNos: [54], id: "open", label: "자유 의견", description: "추가로 전하고 싶은 자유로운 의견", icon: "💬" },
];

export function groupQualitativeByTheme(questions: QualitativeQuestion[]): QualitativeTheme[] {
  return QUALITATIVE_THEME_MAP.map((themeMap) => {
    const qs = questions.filter(
      (q) => q.questionNo !== null && themeMap.qNos.includes(q.questionNo)
    );
    return { ...themeMap, questions: qs };
  }).filter((t) => t.questions.length > 0);
}

// ── Action Items (Supabase direct) ─────────────────────

function mapActionItem(row: Record<string, unknown>): ActionItem {
  return {
    id: row.id as string,
    surveyCycleId: (row.survey_cycle_id as string) ?? null,
    category: row.category as ActionItem["category"],
    title: row.title as string,
    description: (row.description as string) ?? null,
    owner: (row.owner as string) ?? null,
    priority: row.priority as ActionItem["priority"],
    status: row.status as ActionItem["status"],
    dueDate: (row.due_date as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export function useActionItems(surveyId: string | null) {
  return useQuery<ActionItem[]>({
    queryKey: ["action-items", surveyId],
    queryFn: async () => {
      let query = supabase!.from("action_items").select("*").order("created_at", { ascending: false });
      if (surveyId) query = query.eq("survey_cycle_id", surveyId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapActionItem);
    },
    staleTime: 10_000,
    enabled: !!supabase,
  });
}

export function useCreateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Partial<ActionItem>) => {
      const { data, error } = await supabase!
        .from("action_items")
        .insert({
          survey_cycle_id: item.surveyCycleId ?? null,
          category: item.category,
          title: item.title,
          description: item.description ?? null,
          owner: item.owner ?? null,
          priority: item.priority ?? "medium",
          status: item.status ?? "todo",
          due_date: item.dueDate ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return mapActionItem(data as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-items"] }),
  });
}

export function useUpdateActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<ActionItem> & { id: string }) => {
      const { data, error } = await supabase!
        .from("action_items")
        .update({
          category: item.category,
          title: item.title,
          description: item.description ?? null,
          owner: item.owner ?? null,
          priority: item.priority,
          status: item.status,
          due_date: item.dueDate ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapActionItem(data as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-items"] }),
  });
}

export function useDeleteActionItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from("action_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["action-items"] }),
  });
}

// ── Composite Index Helpers ────────────────────────────

export function computeCompositeIndices(sectionResults: SectionResult[]) {
  const sectionMap = Object.fromEntries(sectionResults.map((s) => [s.sectionName, s.avgScore]));

  const avg = (...keys: string[]) => {
    const vals = keys.map((k) => sectionMap[k]).filter((v): v is number => v !== null && v !== undefined);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
  };

  const changeStability = avg("방향성과 전략", "팀 분위기와 심리적 안전감");
  const executionBottleneck = avg("실행력", "협업");
  const atmosphereTemp = avg("팀 분위기와 심리적 안전감", "몰입과 동기부여");

  const label = (score: number | null) => {
    if (score === null) return { label: "데이터 없음", color: "neutral" as const };
    if (score >= 4.0) return { label: "안정적", color: "green" as const };
    if (score >= 3.0) return { label: "주의 필요", color: "yellow" as const };
    return { label: "불안정", color: "red" as const };
  };

  return {
    changeStability: { score: changeStability, ...label(changeStability) },
    executionBottleneck: { score: executionBottleneck, ...label(executionBottleneck) },
    atmosphereTemp: { score: atmosphereTemp, ...label(atmosphereTemp) },
  };
}

export function computeStrengthsAndRisks(sectionResults: SectionResult[]) {
  const withScores = sectionResults
    .filter((s) => s.avgScore !== null)
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0));
  return {
    strengths: withScores.slice(0, 3),
    risks: withScores.slice(-3).reverse(),
  };
}

export function buildDiagnosisSentence(sectionResults: SectionResult[]): string {
  const sectionMap = Object.fromEntries(sectionResults.map((s) => [s.sectionName, s.avgScore]));
  const get = (k: string) => sectionMap[k];

  const direction = get("방향성과 전략");
  const execution = get("실행력");
  const collab = get("협업");
  const climate = get("팀 분위기와 심리적 안전감");
  const health = get("조직 건강성");

  if (!direction && !execution) return "응답 데이터가 아직 충분하지 않아 진단을 생성할 수 없습니다.";

  const parts: string[] = [];

  if (direction && direction >= 3.5) parts.push("방향성 정렬은 양호한 편");
  else if (direction) parts.push("방향성과 전략 공유가 미흡");

  if (execution && collab) {
    if (execution < 3.0 || collab < 3.0) parts.push("실행과 협업에서 병목이 감지됨");
    else parts.push("실행·협업은 비교적 안정적");
  }

  if (climate && climate < 3.0) parts.push("심리적 안전감과 조직 분위기 개선이 시급");
  else if (climate && climate >= 3.5) parts.push("팀 분위기는 긍정적");

  if (health && health < 3.0) parts.push("조직 건강성(신뢰·공정성)이 낮아 우선 관리가 필요");

  if (!parts.length)
    return "전반적으로 평균적인 수준의 조직 상태를 보이고 있습니다. 개별 섹션을 자세히 검토하세요.";
  return parts.join("하며, ") + ".";
}

export function scoreColor(score: number | null): string {
  if (score === null) return "text-[hsl(var(--neutral-400))]";
  if (score >= 4.0) return "text-[hsl(var(--green-500))]";
  if (score >= 3.0) return "text-[hsl(var(--yellow-400))]";
  return "text-[hsl(var(--red-500))]";
}

export function scoreBg(score: number | null): string {
  if (score === null) return "bg-[hsl(var(--neutral-100))]";
  if (score >= 4.0) return "bg-[hsl(142_76%_36%/0.1)]";
  if (score >= 3.0) return "bg-[hsl(38_92%_50%/0.12)]";
  return "bg-[hsl(0_84%_60%/0.1)]";
}
