import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

export interface EvaluationCycle {
  id: string;
  title: string;
  year: number;
  status: "active" | "closed";
  createdAt: string;
}

export interface EmployeeEvaluation {
  id: string;
  cycleId: string;
  profileId: string | null;
  fullName: string;
  department: string | null;
  jobTitle: string | null;
  tenureYears: number | null;
  salaryPrev: number | null;
  scoreSelf: number | null;
  scorePeer: number | null;
  scoreUpper: number | null;
  scorePrevYear: number | null;
  scoreCeoAdjusted: number | null;
  gradeCeo: string | null;
  isConfirmed: boolean;
  progressStatus: "pending" | "reviewing" | "confirmed";
  notes: string | null;
}

export interface EvaluationScore {
  id: string;
  employeeEvalId: string;
  category: string;
  scoreSelf: number | null;
  scorePeer: number | null;
  scoreUpper: number | null;
  scoreCeoAdjusted: number | null;
  displayOrder: number;
}

export interface CeoReviewPayload {
  scoreCeoAdjusted: number | null;
  gradeCeo: string | null;
  isConfirmed: boolean;
  progressStatus: "pending" | "reviewing" | "confirmed";
}

export interface EvaluationScoreUpdatePayload {
  id: string;
  scoreCeoAdjusted: number | null;
}

// ── Mappers ────────────────────────────────────────────────────────────────

function mapCycle(row: Record<string, unknown>): EvaluationCycle {
  return {
    id: row.id as string,
    title: row.title as string,
    year: row.year as number,
    status: (row.status as "active" | "closed") ?? "active",
    createdAt: row.created_at as string,
  };
}

function mapEvaluation(row: Record<string, unknown>): EmployeeEvaluation {
  return {
    id: row.id as string,
    cycleId: row.cycle_id as string,
    profileId: (row.profile_id as string) ?? null,
    fullName: (row.full_name as string) ?? "",
    department: (row.department as string) ?? null,
    jobTitle: (row.job_title as string) ?? null,
    tenureYears: (row.tenure_years as number) ?? null,
    salaryPrev: (row.salary_prev as number) ?? null,
    scoreSelf: (row.score_self as number) ?? null,
    scorePeer: (row.score_peer as number) ?? null,
    scoreUpper: (row.score_upper as number) ?? null,
    scorePrevYear: (row.score_prev_year as number) ?? null,
    scoreCeoAdjusted: (row.score_ceo_adjusted as number) ?? null,
    gradeCeo: (row.grade_ceo as string) ?? null,
    isConfirmed: (row.is_confirmed as boolean) ?? false,
    progressStatus: (row.progress_status as EmployeeEvaluation["progressStatus"]) ?? "pending",
    notes: (row.notes as string) ?? null,
  };
}

function mapScore(row: Record<string, unknown>): EvaluationScore {
  return {
    id: row.id as string,
    employeeEvalId: row.employee_eval_id as string,
    category: row.category as string,
    scoreSelf: (row.score_self as number) ?? null,
    scorePeer: (row.score_peer as number) ?? null,
    scoreUpper: (row.score_upper as number) ?? null,
    scoreCeoAdjusted: (row.score_ceo_adjusted as number) ?? null,
    displayOrder: (row.display_order as number) ?? 0,
  };
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useGetEvaluationCycles() {
  return useQuery({
    queryKey: ["evaluation_cycles"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("evaluation_cycles")
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapCycle);
    },
  });
}

export function useGetEmployeeEvaluations(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["employee_evaluations", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      if (!supabase || !cycleId) return [];
      const { data, error } = await supabase
        .from("employee_evaluations")
        .select("*")
        .eq("cycle_id", cycleId)
        .order("department", { ascending: true })
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapEvaluation);
    },
  });
}

export function useGetEvaluationDetail(evalId: string | undefined) {
  return useQuery({
    queryKey: ["employee_evaluation_detail", evalId],
    enabled: !!evalId,
    queryFn: async () => {
      if (!supabase || !evalId) return null;
      const { data, error } = await supabase
        .from("employee_evaluations")
        .select("*")
        .eq("id", evalId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapEvaluation(data as Record<string, unknown>) : null;
    },
  });
}

export function useGetEvaluationScores(evalId: string | undefined) {
  return useQuery({
    queryKey: ["evaluation_scores", evalId],
    enabled: !!evalId,
    queryFn: async () => {
      if (!supabase || !evalId) return [];
      const { data, error } = await supabase
        .from("evaluation_scores")
        .select("*")
        .eq("employee_eval_id", evalId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapScore);
    },
  });
}

export function useSaveCeoReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ evalId, payload }: { evalId: string; payload: CeoReviewPayload }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("employee_evaluations")
        .update({
          score_ceo_adjusted: payload.scoreCeoAdjusted,
          grade_ceo: payload.gradeCeo,
          is_confirmed: payload.isConfirmed,
          progress_status: payload.progressStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", evalId);
      if (error) throw error;
    },
    onSuccess: (_data, { evalId }) => {
      void queryClient.invalidateQueries({ queryKey: ["employee_evaluation_detail", evalId] });
      void queryClient.invalidateQueries({ queryKey: ["employee_evaluations"] });
    },
  });
}

export function useSaveScoreCeoAdjustments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: EvaluationScoreUpdatePayload[]) => {
      if (!supabase) throw new Error("Supabase not initialized");
      for (const u of updates) {
        const { error } = await supabase
          .from("evaluation_scores")
          .update({ score_ceo_adjusted: u.scoreCeoAdjusted })
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["evaluation_scores"] });
    },
  });
}
