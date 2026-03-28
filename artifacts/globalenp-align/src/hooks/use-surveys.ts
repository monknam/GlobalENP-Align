import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./use-auth";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SurveyCycle {
  id: string;
  title: string;
  description: string | null;
  year: number;
  quarter: number | null;
  status: string;
  startAt: string | null;
  endAt: string | null;
  introTitle: string | null;
  introPurpose: string | null;
  introDirection: string | null;
  introConfidentiality: string | null;
  introGuide: string | null;
  anonymousMinCount: number;
  sections?: SurveySection[];
}

export interface SurveySection {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  questions: SurveyQuestion[];
}

export interface SurveyQuestion {
  id: string;
  questionNo: number | null;
  questionText: string;
  questionType: "likert_5" | "short_text" | "long_text";
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface SurveyResponse {
  id: string;
  isSubmitted: boolean;
  answers: SurveyAnswer[];
}

export interface SurveyAnswer {
  id: string;
  surveyQuestionId: string;
  numericValue: number | null;
  textValue: string | null;
}

// ── Mappers ────────────────────────────────────────────────────────────────

function mapCycle(row: Record<string, unknown>): SurveyCycle {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    year: row.year as number,
    quarter: (row.quarter as number) ?? null,
    status: row.status as string,
    startAt: (row.start_at as string) ?? null,
    endAt: (row.end_at as string) ?? null,
    introTitle: (row.intro_title as string) ?? null,
    introPurpose: (row.intro_purpose as string) ?? null,
    introDirection: (row.intro_direction as string) ?? null,
    introConfidentiality: (row.intro_confidentiality as string) ?? null,
    introGuide: (row.intro_guide as string) ?? null,
    anonymousMinCount: (row.anonymous_min_count as number) ?? 3,
  };
}

function mapQuestion(row: Record<string, unknown>): SurveyQuestion {
  return {
    id: row.id as string,
    questionNo: (row.question_no as number) ?? null,
    questionText: row.question_text as string,
    questionType: row.question_type as "likert_5" | "short_text" | "long_text",
    isRequired: row.is_required as boolean,
    sortOrder: row.sort_order as number,
    isActive: row.is_active as boolean,
  };
}

function mapSection(row: Record<string, unknown>): SurveySection {
  const questions = ((row.survey_questions as Record<string, unknown>[]) ?? [])
    .filter((q) => q.is_active)
    .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
    .map(mapQuestion);
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? null,
    sortOrder: row.sort_order as number,
    questions,
  };
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useGetSurveys() {
  return useQuery({
    queryKey: ["surveys"],
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("survey_cycles")
        .select("*")
        .in("status", ["active", "closed"])
        .order("year", { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(mapCycle);
    },
    enabled: !!supabase,
  });
}

export function useGetSurvey(id: string) {
  return useQuery({
    queryKey: ["surveys", id],
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("survey_cycles")
        .select("*, survey_sections(*, survey_questions(*))")
        .eq("id", id)
        .single();
      if (error) throw error;
      const row = data as Record<string, unknown>;
      const cycle = mapCycle(row);
      cycle.sections = ((row.survey_sections as Record<string, unknown>[]) ?? [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map(mapSection);
      return cycle;
    },
    enabled: !!supabase && !!id,
  });
}

export function useGetMyResponse(surveyId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["surveys", surveyId, "my-response", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("survey_responses")
        .select("*, survey_answers(*)")
        .eq("survey_cycle_id", surveyId)
        .eq("respondent_user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const row = data as Record<string, unknown>;
      return {
        id: row.id as string,
        isSubmitted: row.is_submitted as boolean,
        answers: ((row.survey_answers as Record<string, unknown>[]) ?? []).map((a) => ({
          id: a.id as string,
          surveyQuestionId: a.survey_question_id as string,
          numericValue: (a.numeric_value as number) ?? null,
          textValue: (a.text_value as string) ?? null,
        })),
      } as SurveyResponse;
    },
    enabled: !!supabase && !!surveyId && !!user,
    retry: false,
  });
}

export function useStartResponse() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ surveyId }: { surveyId: string }) => {
      // 기존 응답 확인
      const { data: existing } = await supabase!
        .from("survey_responses")
        .select("id, is_submitted")
        .eq("survey_cycle_id", surveyId)
        .eq("respondent_user_id", user!.id)
        .maybeSingle();
      if (existing) return existing;

      // 부서 정보 조회
      const { data: profile } = await supabase!
        .from("profiles")
        .select("department_id")
        .eq("id", user!.id)
        .maybeSingle();

      const { data, error } = await supabase!
        .from("survey_responses")
        .insert({
          survey_cycle_id: surveyId,
          respondent_user_id: user!.id,
          respondent_department_id: (profile as Record<string, unknown> | null)?.department_id ?? null,
          is_submitted: false,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { surveyId }) => {
      void queryClient.invalidateQueries({ queryKey: ["surveys", surveyId, "my-response"] });
    },
  });
}

export function useSaveAnswers() {
  return useMutation({
    mutationFn: async ({
      responseId,
      data: { answers },
    }: {
      responseId: string;
      data: { answers: { surveyQuestionId: string; numericValue: number | null; textValue: string | null }[] };
    }) => {
      const rows = answers.map((a) => ({
        survey_response_id: responseId,
        survey_question_id: a.surveyQuestionId,
        numeric_value: a.numericValue,
        text_value: a.textValue,
      }));
      const { error } = await supabase!
        .from("survey_answers")
        .upsert(rows, { onConflict: "survey_response_id,survey_question_id" });
      if (error) throw error;
    },
  });
}

export function useSubmitResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ responseId }: { responseId: string }) => {
      const { error } = await supabase!
        .from("survey_responses")
        .update({ is_submitted: true, submitted_at: new Date().toISOString() })
        .eq("id", responseId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["surveys"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ── Admin Mutations ─────────────────────────────────────────

export function useUpdateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        title: string;
        description: string;
        introTitle: string;
        introPurpose: string;
        introDirection: string;
        introConfidentiality: string;
        introGuide: string;
      }>;
    }) => {
      const row: Record<string, unknown> = {};
      if (data.title !== undefined) row.title = data.title;
      if (data.description !== undefined) row.description = data.description;
      if (data.introTitle !== undefined) row.intro_title = data.introTitle;
      if (data.introPurpose !== undefined) row.intro_purpose = data.introPurpose;
      if (data.introDirection !== undefined) row.intro_direction = data.introDirection;
      if (data.introConfidentiality !== undefined) row.intro_confidentiality = data.introConfidentiality;
      if (data.introGuide !== undefined) row.intro_guide = data.introGuide;

      const { error } = await supabase!.from("survey_cycles").update(row).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["surveys", id] });
      void queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
}

export function useActivateSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase!
        .from("survey_cycles")
        .update({ status: "active", start_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["surveys", id] });
      void queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
}

export function useCloseSurvey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase!
        .from("survey_cycles")
        .update({ status: "closed", end_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["surveys", id] });
      void queryClient.invalidateQueries({ queryKey: ["surveys"] });
    },
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      surveyId,
      data,
    }: {
      surveyId: string;
      data: { name: string; description?: string; sortOrder: number };
    }) => {
      const { error } = await supabase!.from("survey_sections").insert({
        survey_cycle_id: surveyId,
        name: data.name,
        description: data.description ?? null,
        sort_order: data.sortOrder,
      });
      if (error) throw error;
    },
    onSuccess: (_, { surveyId }) => {
      void queryClient.invalidateQueries({ queryKey: ["surveys", surveyId] });
    },
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sectionId,
      surveyId,
      data,
    }: {
      sectionId: string;
      surveyId: string;
      data: {
        questionText: string;
        questionType: "likert_5" | "short_text" | "long_text";
        isRequired: boolean;
        sortOrder: number;
      };
    }) => {
      const { error } = await supabase!.from("survey_questions").insert({
        survey_section_id: sectionId,
        question_text: data.questionText,
        question_type: data.questionType,
        is_required: data.isRequired,
        sort_order: data.sortOrder,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: (_, { surveyId }) => {
      void queryClient.invalidateQueries({ queryKey: ["surveys", surveyId] });
    },
  });
}
