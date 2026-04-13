import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

// ── Types ──────────────────────────────────────────────────────────

export type EvalGrade = "S" | "A" | "B" | "C" | "D";
export type EvalStatus = "draft" | "submitted";

export interface Season {
  id: string;
  year: number;
  name: string;
  status: "open" | "closed";
  created_at: string;
}

export interface GradeAnchor {
  id: string;
  criteria_id: string;
  grade: EvalGrade;
  anchor_text: string;
  salary_note: string | null;
}

export interface Criteria {
  id: string;
  season_id: string;
  code: string;
  job_group: string | null; // null = 전 직군 공통
  name: string;
  description: string | null;
  sort_order: number;
  grade_anchors: GradeAnchor[];
}

export interface SimpleEmployee {
  id: string;
  full_name: string;
  department: string;
  job_title: string;
  job_group: string | null;
  is_department_head: boolean;
}

export interface EvalScore {
  id: string;
  evaluation_id: string;
  criteria_id: string;
  selected_grade: EvalGrade | null;
}

export interface EvalText {
  id: string;
  evaluation_id: string;
  item_key: "strength" | "improvement";
  content: string | null;
}

export interface SimpleEvaluation {
  id: string;
  season_id: string;
  evaluatee_id: string;
  evaluator_id: string;
  status: EvalStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  employees?: SimpleEmployee;
  simple_evaluation_scores?: EvalScore[];
  simple_evaluation_texts?: EvalText[];
}

export interface TeamMemberEvalStatus {
  employee: SimpleEmployee;
  evaluation: Pick<SimpleEvaluation, "id" | "evaluatee_id" | "status" | "submitted_at"> | null;
}

// ── 부서 → 직군 매핑 ────────────────────────────────────────────────

export const DEPT_JOB_GROUP: Record<string, string> = {
  "연구설계부":     "설계직",
  "연구개발부":     "연구개발직",
  "커미셔닝":       "커미셔닝직",
  "현장관리부":     "커미셔닝직",
  "개발생산부":     "생산직",
  "관리부":         "사무직",
  "경영관리부":     "사무직",
  "영업행정관리부": "사무직",
  "경영지원부":     "사무직",
};

export function getDeptJobGroup(dept: string): string {
  return DEPT_JOB_GROUP[dept] ?? "사무직";
}

export const GRADE_INFO: Record<EvalGrade, { label: string; color: string; bg: string }> = {
  S: { label: "S — 탁월", color: "#00619c",  bg: "#e0f0fc" },
  A: { label: "A — 우수", color: "#3d5d9e",  bg: "#e8edf8" },
  B: { label: "B — 충족", color: "#2e7d32",  bg: "#e8f5e9" },
  C: { label: "C — 미흡", color: "#b45309",  bg: "#fef3c7" },
  D: { label: "D — 부진", color: "#c0392b",  bg: "#fdecea" },
};

// ── Query Keys ─────────────────────────────────────────────────────

export const SEASON_KEY          = ["simple-eval-season"];
export const ALL_SEASONS_KEY     = ["simple-eval-seasons-all"];
export const CRITERIA_KEY        = (sid: string, jg: string) => ["simple-eval-criteria", sid, jg];
export const TEAM_KEY            = (sid: string, dept: string) => ["simple-eval-team", sid, dept];
export const EVAL_DETAIL_KEY     = (eid: string) => ["simple-eval-detail", eid];
export const ADMIN_OVERVIEW_KEY  = (sid: string) => ["simple-eval-admin", sid];

// ── Hooks ──────────────────────────────────────────────────────────

/** 현재 활성(open) 평가 시즌 */
export function useActiveSeason() {
  return useQuery({
    queryKey: SEASON_KEY,
    queryFn: async (): Promise<Season | null> => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { data, error } = await supabase
        .from("evaluation_seasons")
        .select("*")
        .eq("status", "open")
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Season | null;
    },
  });
}

/** 전체 평가 시즌 목록 (관리자용) */
export function useAllSeasons() {
  return useQuery({
    queryKey: ALL_SEASONS_KEY,
    queryFn: async (): Promise<Season[]> => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { data, error } = await supabase
        .from("evaluation_seasons")
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Season[];
    },
  });
}

/** 특정 직군의 평가 기준 항목 + 행동 앵커 */
export function useCriteria(seasonId: string | null, jobGroup: string) {
  return useQuery({
    queryKey: CRITERIA_KEY(seasonId ?? "", jobGroup),
    enabled: !!seasonId,
    queryFn: async (): Promise<Criteria[]> => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { data, error } = await supabase
        .from("evaluation_criteria")
        .select(`*, grade_anchors (id, criteria_id, grade, anchor_text, salary_note)`)
        .eq("season_id", seasonId!)
        .or(`job_group.is.null,job_group.eq.${jobGroup}`)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Criteria[];
    },
  });
}

/** 부서별 팀원 목록 + 평가 현황 */
export function useTeamWithStatus(seasonId: string | null, department: string) {
  return useQuery({
    queryKey: TEAM_KEY(seasonId ?? "", department),
    enabled: !!seasonId && !!department,
    queryFn: async (): Promise<TeamMemberEvalStatus[]> => {
      if (!supabase) throw new Error("Supabase not initialized");

      const { data: employees, error: empErr } = await supabase
        .from("employees")
        .select("id, full_name, department, job_title, job_group, is_department_head")
        .eq("department", department)
        .eq("is_active", true)
        .order("is_department_head", { ascending: false })
        .order("job_title", { ascending: false });
      if (empErr) throw empErr;

      const empList = (employees ?? []) as SimpleEmployee[];
      if (!empList.length) return [];

      const { data: evals, error: evalErr } = await supabase
        .from("simple_evaluations")
        .select("id, evaluatee_id, status, submitted_at")
        .eq("season_id", seasonId!)
        .in("evaluatee_id", empList.map((e) => e.id));
      if (evalErr) throw evalErr;

      const evalMap: Record<string, TeamMemberEvalStatus["evaluation"]> = {};
      for (const e of evals ?? []) evalMap[e.evaluatee_id] = e;

      return empList.map((emp) => ({
        employee: emp,
        evaluation: evalMap[emp.id] ?? null,
      }));
    },
  });
}

/** 평가 상세 (점수 + 서술 포함) */
export function useEvalDetail(evalId: string | null) {
  return useQuery({
    queryKey: EVAL_DETAIL_KEY(evalId ?? ""),
    enabled: !!evalId,
    queryFn: async (): Promise<SimpleEvaluation | null> => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { data, error } = await supabase
        .from("simple_evaluations")
        .select(`
          *,
          employees (id, full_name, department, job_title, job_group, is_department_head),
          simple_evaluation_scores (*),
          simple_evaluation_texts (*)
        `)
        .eq("id", evalId!)
        .maybeSingle();
      if (error) throw error;
      return data as SimpleEvaluation | null;
    },
  });
}

/** 관리자: 전체 평가 현황 */
export function useAdminOverview(seasonId: string | null) {
  return useQuery({
    queryKey: ADMIN_OVERVIEW_KEY(seasonId ?? ""),
    enabled: !!seasonId,
    queryFn: async (): Promise<SimpleEvaluation[]> => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { data, error } = await supabase
        .from("simple_evaluations")
        .select(`
          *,
          employees (id, full_name, department, job_title, job_group, is_department_head)
        `)
        .eq("season_id", seasonId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SimpleEvaluation[];
    },
  });
}

/** 평가 레코드 생성 또는 가져오기 (클릭 시 on-demand 생성) */
export function useEnsureEval() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      seasonId,
      evaluateeId,
    }: {
      seasonId: string;
      evaluateeId: string;
    }): Promise<{ id: string }> => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { data, error } = await supabase
        .from("simple_evaluations")
        .upsert(
          {
            season_id: seasonId,
            evaluatee_id: evaluateeId,
            evaluator_id: user?.id ?? "demo",
            status: "draft",
          },
          { onConflict: "season_id,evaluatee_id" }
        )
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
  });
}

/** 등급 저장 (upsert) */
export function useUpsertScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      evalId,
      criteriaId,
      grade,
    }: {
      evalId: string;
      criteriaId: string;
      grade: EvalGrade;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("simple_evaluation_scores")
        .upsert(
          { evaluation_id: evalId, criteria_id: criteriaId, selected_grade: grade },
          { onConflict: "evaluation_id,criteria_id" }
        );
      if (error) throw error;
    },
    onSuccess: (_, { evalId }) => {
      queryClient.invalidateQueries({ queryKey: EVAL_DETAIL_KEY(evalId) });
    },
  });
}

/** 서술 항목 저장 (upsert) */
export function useUpsertText() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      evalId,
      itemKey,
      content,
    }: {
      evalId: string;
      itemKey: "strength" | "improvement";
      content: string;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("simple_evaluation_texts")
        .upsert(
          { evaluation_id: evalId, item_key: itemKey, content },
          { onConflict: "evaluation_id,item_key" }
        );
      if (error) throw error;
    },
    onSuccess: (_, { evalId }) => {
      queryClient.invalidateQueries({ queryKey: EVAL_DETAIL_KEY(evalId) });
    },
  });
}

/** 평가 제출 */
export function useSubmitEval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (evalId: string) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("simple_evaluations")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", evalId);
      if (error) throw error;
    },
    onSuccess: (_, evalId) => {
      queryClient.invalidateQueries({ queryKey: EVAL_DETAIL_KEY(evalId) });
      queryClient.invalidateQueries({ queryKey: SEASON_KEY });
      queryClient.invalidateQueries({ queryKey: ALL_SEASONS_KEY });
    },
  });
}

/** 시즌 생성 (관리자) */
export function useCreateSeason() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, name }: { year: number; name: string }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { data, error } = await supabase
        .from("evaluation_seasons")
        .insert({ year, name, status: "open" })
        .select()
        .single();
      if (error) throw error;
      return data as Season;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEASON_KEY });
      queryClient.invalidateQueries({ queryKey: ALL_SEASONS_KEY });
    },
  });
}

/** 시즌 상태 변경 (open ↔ closed) */
export function useUpdateSeasonStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "open" | "closed" }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("evaluation_seasons")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SEASON_KEY });
      queryClient.invalidateQueries({ queryKey: ALL_SEASONS_KEY });
    },
  });
}
