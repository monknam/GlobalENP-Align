import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  employeeNo: string;
  fullName: string;
  gender: string | null;
  department: string | null;
  jobTitle: string | null;
  jobRole: string | null;
  hireDate: string | null;
  jobGroup: "manufacturing" | "field" | "technical" | "admin" | "executive";
  isDepartmentHead: boolean;
  isActive: boolean;
  supervisorId: string | null;
  supervisorName?: string | null;
}

export interface EvalCycle {
  id: string;
  title: string;
  year: number;
  status: "draft" | "active" | "closed";
  selfEvalStart: string | null;
  selfEvalEnd: string | null;
  firstEvalStart: string | null;
  firstEvalEnd: string | null;
  createdAt: string;
}

export interface EvalItem {
  id: string;
  jobGroup: "common" | "manufacturing" | "field" | "technical" | "admin";
  itemKey: string;
  itemName: string;
  itemDescription: string | null;
  itemType: "attitude" | "performance";
  displayOrder: number;
  hasEvidence: boolean;
  level5Desc: string | null;
  level4Desc: string | null;
  level3Desc: string | null;
  level2Desc: string | null;
  level1Desc: string | null;
}

export type WorkflowStatus =
  | "pending_self"
  | "pending_first"
  | "pending_committee"
  | "pending_second"
  | "confirmed";

export interface EvalInstance {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName?: string;
  department?: string | null;
  jobTitle?: string | null;
  jobGroup?: string;
  workflowStatus: WorkflowStatus;
  secondEvalRequired: boolean;
  updatedAt: string;
}

export interface EvalSubmission {
  id: string;
  instanceId: string;
  evaluatorId: string;
  evaluatorName?: string;
  step: "self" | "first" | "second" | "committee";
  status: "draft" | "submitted";
  overallComment: string | null;
  submittedAt: string | null;
  updatedAt: string;
}

export interface EvalScore {
  id: string;
  submissionId: string;
  itemId: string;
  score: number;
  evidenceText: string | null;
}

export interface EvalFinalResult {
  id: string;
  instanceId: string;
  scoreSelfAvg: number | null;
  scoreFirstAvg: number | null;
  scoreSecondAvg: number | null;
  finalScore: number | null;
  finalGrade: "S" | "A" | "B" | "C" | "D" | null;
  committeeComment: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
}

// ── Test-mode actor (localStorage) ────────────────────────────────────────
// 로그인 구현 전 테스트용: 현재 "누구로 행동하는지" 저장

const ACTOR_KEY = "eval_test_actor_id";

export function getTestActorId(): string | null {
  return localStorage.getItem(ACTOR_KEY);
}

export function setTestActorId(id: string | null) {
  if (id) localStorage.setItem(ACTOR_KEY, id);
  else localStorage.removeItem(ACTOR_KEY);
}

// ── Mappers ────────────────────────────────────────────────────────────────

function mapEmployee(r: Record<string, unknown>): Employee {
  return {
    id: r.id as string,
    employeeNo: r.employee_no as string,
    fullName: r.full_name as string,
    gender: (r.gender as string) ?? null,
    department: (r.department as string) ?? null,
    jobTitle: (r.job_title as string) ?? null,
    jobRole: (r.job_role as string) ?? null,
    hireDate: (r.hire_date as string) ?? null,
    jobGroup: r.job_group as Employee["jobGroup"],
    isDepartmentHead: (r.is_department_head as boolean) ?? false,
    isActive: (r.is_active as boolean) ?? true,
    supervisorId: (r.supervisor_id as string) ?? null,
    supervisorName: (r.supervisor as Record<string, unknown>)?.full_name as string ?? null,
  };
}

function mapCycle(r: Record<string, unknown>): EvalCycle {
  return {
    id: r.id as string,
    title: r.title as string,
    year: r.year as number,
    status: r.status as EvalCycle["status"],
    selfEvalStart: (r.self_eval_start as string) ?? null,
    selfEvalEnd: (r.self_eval_end as string) ?? null,
    firstEvalStart: (r.first_eval_start as string) ?? null,
    firstEvalEnd: (r.first_eval_end as string) ?? null,
    createdAt: r.created_at as string,
  };
}

function mapItem(r: Record<string, unknown>): EvalItem {
  return {
    id: r.id as string,
    jobGroup: r.job_group as EvalItem["jobGroup"],
    itemKey: r.item_key as string,
    itemName: r.item_name as string,
    itemDescription: (r.item_description as string) ?? null,
    itemType: r.item_type as EvalItem["itemType"],
    displayOrder: r.display_order as number,
    hasEvidence: (r.has_evidence as boolean) ?? false,
    level5Desc: (r.level_5_desc as string) ?? null,
    level4Desc: (r.level_4_desc as string) ?? null,
    level3Desc: (r.level_3_desc as string) ?? null,
    level2Desc: (r.level_2_desc as string) ?? null,
    level1Desc: (r.level_1_desc as string) ?? null,
  };
}

function mapInstance(r: Record<string, unknown>): EvalInstance {
  const emp = r.employees as Record<string, unknown> | null;
  return {
    id: r.id as string,
    cycleId: r.cycle_id as string,
    employeeId: r.employee_id as string,
    employeeName: emp?.full_name as string ?? undefined,
    department: emp?.department as string ?? null,
    jobTitle: emp?.job_title as string ?? null,
    jobGroup: emp?.job_group as string ?? undefined,
    workflowStatus: r.workflow_status as WorkflowStatus,
    secondEvalRequired: (r.second_eval_required as boolean) ?? false,
    updatedAt: r.updated_at as string,
  };
}

function mapSubmission(r: Record<string, unknown>): EvalSubmission {
  const ev = r.evaluator as Record<string, unknown> | null;
  return {
    id: r.id as string,
    instanceId: r.instance_id as string,
    evaluatorId: r.evaluator_id as string,
    evaluatorName: ev?.full_name as string ?? undefined,
    step: r.step as EvalSubmission["step"],
    status: r.status as EvalSubmission["status"],
    overallComment: (r.overall_comment as string) ?? null,
    submittedAt: (r.submitted_at as string) ?? null,
    updatedAt: r.updated_at as string,
  };
}

function mapScore(r: Record<string, unknown>): EvalScore {
  return {
    id: r.id as string,
    submissionId: r.submission_id as string,
    itemId: r.item_id as string,
    score: r.score as number,
    evidenceText: (r.evidence_text as string) ?? null,
  };
}

function mapFinalResult(r: Record<string, unknown>): EvalFinalResult {
  return {
    id: r.id as string,
    instanceId: r.instance_id as string,
    scoreSelfAvg: (r.score_self_avg as number) ?? null,
    scoreFirstAvg: (r.score_first_avg as number) ?? null,
    scoreSecondAvg: (r.score_second_avg as number) ?? null,
    finalScore: (r.final_score as number) ?? null,
    finalGrade: (r.final_grade as EvalFinalResult["finalGrade"]) ?? null,
    committeeComment: (r.committee_comment as string) ?? null,
    confirmedBy: (r.confirmed_by as string) ?? null,
    confirmedAt: (r.confirmed_at as string) ?? null,
  };
}

// ── Employees ──────────────────────────────────────────────────────────────

export function useGetEmployees(onlyActive = true) {
  return useQuery({
    queryKey: ["employees", onlyActive],
    queryFn: async () => {
      if (!supabase) return [];
      let q = supabase
        .from("employees")
        .select("*, supervisor:supervisor_id(full_name)")
        .order("department", { ascending: true })
        .order("full_name", { ascending: true });
      if (onlyActive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map(mapEmployee);
    },
  });
}

export function useGetEmployee(id: string | null) {
  return useQuery({
    queryKey: ["employee", id],
    enabled: !!id,
    queryFn: async () => {
      if (!supabase || !id) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("*, supervisor:supervisor_id(full_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapEmployee(data as Record<string, unknown>) : null;
    },
  });
}

// ── Cycles ─────────────────────────────────────────────────────────────────

export function useGetEvalCycles() {
  return useQuery({
    queryKey: ["eval_cycles"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("eval_cycles")
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapCycle);
    },
  });
}

export function useCreateEvalCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      year: number;
      selfEvalStart?: string;
      selfEvalEnd?: string;
      firstEvalStart?: string;
      firstEvalEnd?: string;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { data, error } = await supabase
        .from("eval_cycles")
        .insert({
          title: payload.title,
          year: payload.year,
          status: "draft",
          self_eval_start: payload.selfEvalStart ?? null,
          self_eval_end: payload.selfEvalEnd ?? null,
          first_eval_start: payload.firstEvalStart ?? null,
          first_eval_end: payload.firstEvalEnd ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return mapCycle(data as Record<string, unknown>);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eval_cycles"] }),
  });
}

export function useUpdateCycleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EvalCycle["status"] }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("eval_cycles")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eval_cycles"] }),
  });
}

// ── Items ──────────────────────────────────────────────────────────────────

export function useGetEvalItems(jobGroup: Employee["jobGroup"] | null) {
  return useQuery({
    queryKey: ["eval_items", jobGroup],
    enabled: !!jobGroup,
    queryFn: async () => {
      if (!supabase || !jobGroup) return [];
      const { data, error } = await supabase
        .from("eval_items")
        .select("*")
        .in("job_group", ["common", jobGroup])
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapItem);
    },
  });
}

// ── Instances ──────────────────────────────────────────────────────────────

export function useGetEvalInstances(cycleId: string | undefined) {
  return useQuery({
    queryKey: ["eval_instances", cycleId],
    enabled: !!cycleId,
    queryFn: async () => {
      if (!supabase || !cycleId) return [];
      const { data, error } = await supabase
        .from("eval_instances")
        .select("*, employees(full_name, department, job_title, job_group)")
        .eq("cycle_id", cycleId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapInstance);
    },
  });
}

export function useGetEvalInstance(instanceId: string | undefined) {
  return useQuery({
    queryKey: ["eval_instance", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      if (!supabase || !instanceId) return null;
      const { data, error } = await supabase
        .from("eval_instances")
        .select("*, employees(full_name, department, job_title, job_group)")
        .eq("id", instanceId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapInstance(data as Record<string, unknown>) : null;
    },
  });
}

// 사이클 활성화 시 비임원 직원 전체로 인스턴스 일괄 생성
export function useCreateCycleInstances() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cycleId: string) => {
      if (!supabase) throw new Error("Supabase not initialized");
      // 비임원 직원 조회
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("id, supervisor_id")
        .eq("is_active", true)
        .neq("job_group", "executive");
      if (empErr) throw empErr;

      // 인스턴스 생성
      const instances = (emps ?? []).map((e: Record<string, unknown>) => ({
        cycle_id: cycleId,
        employee_id: e.id,
        workflow_status: "pending_self",
      }));
      const { error: insErr } = await supabase
        .from("eval_instances")
        .upsert(instances, { onConflict: "cycle_id,employee_id" });
      if (insErr) throw insErr;

      // 평가자 배정 (supervisor_id 기반 1차 상사)
      const assignments = (emps ?? [])
        .filter((e: Record<string, unknown>) => e.supervisor_id)
        .map((e: Record<string, unknown>) => ({
          cycle_id: cycleId,
          evaluatee_id: e.id,
          evaluator_id: e.supervisor_id,
          evaluator_role: "first",
        }));
      if (assignments.length > 0) {
        const { error: asgErr } = await supabase
          .from("eval_assignments")
          .upsert(assignments, { onConflict: "cycle_id,evaluatee_id,evaluator_role" });
        if (asgErr) throw asgErr;
      }

      // 사이클 상태 → active
      const { error: cycErr } = await supabase
        .from("eval_cycles")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", cycleId);
      if (cycErr) throw cycErr;
    },
    onSuccess: (_d, cycleId) => {
      qc.invalidateQueries({ queryKey: ["eval_cycles"] });
      qc.invalidateQueries({ queryKey: ["eval_instances", cycleId] });
    },
  });
}

export function useAdvanceWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceId,
      nextStatus,
    }: {
      instanceId: string;
      nextStatus: WorkflowStatus;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("eval_instances")
        .update({ workflow_status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", instanceId);
      if (error) throw error;
    },
    onSuccess: (_d, { instanceId }) => {
      qc.invalidateQueries({ queryKey: ["eval_instance", instanceId] });
      qc.invalidateQueries({ queryKey: ["eval_instances"] });
    },
  });
}

export function useRequestSecondEval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceId,
      evaluatorId,
    }: {
      instanceId: string;
      evaluatorId: string;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      // 인스턴스 상태 변경
      const { error: e1 } = await supabase
        .from("eval_instances")
        .update({
          workflow_status: "pending_second",
          second_eval_required: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", instanceId);
      if (e1) throw e1;

      // 인스턴스의 cycle_id, employee_id 조회
      const { data: inst, error: e2 } = await supabase
        .from("eval_instances")
        .select("cycle_id, employee_id")
        .eq("id", instanceId)
        .single();
      if (e2) throw e2;

      // 2차 평가자 배정 upsert
      const { error: e3 } = await supabase
        .from("eval_assignments")
        .upsert(
          {
            cycle_id: (inst as Record<string, unknown>).cycle_id,
            evaluatee_id: (inst as Record<string, unknown>).employee_id,
            evaluator_id: evaluatorId,
            evaluator_role: "second",
          },
          { onConflict: "cycle_id,evaluatee_id,evaluator_role" }
        );
      if (e3) throw e3;
    },
    onSuccess: (_d, { instanceId }) => {
      qc.invalidateQueries({ queryKey: ["eval_instance", instanceId] });
      qc.invalidateQueries({ queryKey: ["eval_instances"] });
    },
  });
}

// ── Submissions ────────────────────────────────────────────────────────────

export function useGetSubmissions(instanceId: string | undefined) {
  return useQuery({
    queryKey: ["eval_submissions", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      if (!supabase || !instanceId) return [];
      const { data, error } = await supabase
        .from("eval_submissions")
        .select("*, evaluator:evaluator_id(full_name)")
        .eq("instance_id", instanceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapSubmission);
    },
  });
}

export function useGetSubmission(
  instanceId: string | undefined,
  step: EvalSubmission["step"] | undefined
) {
  return useQuery({
    queryKey: ["eval_submission", instanceId, step],
    enabled: !!instanceId && !!step,
    queryFn: async () => {
      if (!supabase || !instanceId || !step) return null;
      const { data, error } = await supabase
        .from("eval_submissions")
        .select("*, evaluator:evaluator_id(full_name)")
        .eq("instance_id", instanceId)
        .eq("step", step)
        .maybeSingle();
      if (error) throw error;
      return data ? mapSubmission(data as Record<string, unknown>) : null;
    },
  });
}

export function useGetScores(submissionId: string | undefined) {
  return useQuery({
    queryKey: ["eval_scores", submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      if (!supabase || !submissionId) return [];
      const { data, error } = await supabase
        .from("eval_scores")
        .select("*")
        .eq("submission_id", submissionId);
      if (error) throw error;
      return (data ?? []).map(mapScore);
    },
  });
}

export function useSaveEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceId,
      evaluatorId,
      step,
      overallComment,
      scores,
      submit,
    }: {
      instanceId: string;
      evaluatorId: string;
      step: EvalSubmission["step"];
      overallComment: string;
      scores: Array<{ itemId: string; score: number; evidenceText?: string }>;
      submit: boolean;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");

      const now = new Date().toISOString();

      // 제출 upsert
      const { data: sub, error: subErr } = await supabase
        .from("eval_submissions")
        .upsert(
          {
            instance_id: instanceId,
            evaluator_id: evaluatorId,
            step,
            status: submit ? "submitted" : "draft",
            overall_comment: overallComment,
            submitted_at: submit ? now : null,
            updated_at: now,
          },
          { onConflict: "instance_id,step" }
        )
        .select()
        .single();
      if (subErr) throw subErr;

      const submissionId = (sub as Record<string, unknown>).id as string;

      // 점수 upsert
      for (const s of scores) {
        const { error: scoreErr } = await supabase
          .from("eval_scores")
          .upsert(
            {
              submission_id: submissionId,
              item_id: s.itemId,
              score: s.score,
              evidence_text: s.evidenceText ?? null,
            },
            { onConflict: "submission_id,item_id" }
          );
        if (scoreErr) throw scoreErr;
      }

      // 제출 확정 시 워크플로우 진행
      if (submit) {
        const nextMap: Partial<Record<EvalSubmission["step"], WorkflowStatus>> = {
          self: "pending_first",
          first: "pending_committee",
          second: "pending_committee",
        };
        const next = nextMap[step];
        if (next) {
          const { error: wfErr } = await supabase
            .from("eval_instances")
            .update({ workflow_status: next, updated_at: now })
            .eq("id", instanceId);
          if (wfErr) throw wfErr;
        }
      }

      return submissionId;
    },
    onSuccess: (_d, { instanceId, step }) => {
      qc.invalidateQueries({ queryKey: ["eval_submissions", instanceId] });
      qc.invalidateQueries({ queryKey: ["eval_submission", instanceId, step] });
      qc.invalidateQueries({ queryKey: ["eval_instance", instanceId] });
      qc.invalidateQueries({ queryKey: ["eval_instances"] });
    },
  });
}

// ── Final Results ──────────────────────────────────────────────────────────

export function useGetFinalResult(instanceId: string | undefined) {
  return useQuery({
    queryKey: ["eval_final_result", instanceId],
    enabled: !!instanceId,
    queryFn: async () => {
      if (!supabase || !instanceId) return null;
      const { data, error } = await supabase
        .from("eval_final_results")
        .select("*")
        .eq("instance_id", instanceId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapFinalResult(data as Record<string, unknown>) : null;
    },
  });
}

// 제출 ID 목록으로 평균 점수 계산 헬퍼
async function calcAvgForSubmission(submissionId: string): Promise<number | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("eval_scores")
    .select("score")
    .eq("submission_id", submissionId)
    .gt("score", 0);
  if (!data || data.length === 0) return null;
  const sum = (data as Array<{ score: number }>).reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / data.length) * 100) / 100;
}

export function useConfirmEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      instanceId,
      finalGrade,
      committeeComment,
      confirmedBy,
      selfSubmissionId,
      firstSubmissionId,
      secondSubmissionId,
    }: {
      instanceId: string;
      finalGrade: EvalFinalResult["finalGrade"];
      committeeComment: string;
      confirmedBy: string;
      selfSubmissionId: string | null;
      firstSubmissionId: string | null;
      secondSubmissionId: string | null;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const now = new Date().toISOString();

      // 각 단계 평균 계산
      const [scoreSelfAvg, scoreFirstAvg, scoreSecondAvg] = await Promise.all([
        selfSubmissionId ? calcAvgForSubmission(selfSubmissionId) : Promise.resolve(null),
        firstSubmissionId ? calcAvgForSubmission(firstSubmissionId) : Promise.resolve(null),
        secondSubmissionId ? calcAvgForSubmission(secondSubmissionId) : Promise.resolve(null),
      ]);

      // 최종 점수: 2차 있으면 (1차+2차)/2, 없으면 1차 평균
      const finalScore =
        scoreFirstAvg !== null && scoreSecondAvg !== null
          ? Math.round(((scoreFirstAvg + scoreSecondAvg) / 2) * 100) / 100
          : scoreFirstAvg;

      const { error: resErr } = await supabase
        .from("eval_final_results")
        .upsert(
          {
            instance_id: instanceId,
            score_self_avg: scoreSelfAvg,
            score_first_avg: scoreFirstAvg,
            score_second_avg: scoreSecondAvg,
            final_score: finalScore,
            final_grade: finalGrade,
            committee_comment: committeeComment,
            confirmed_by: confirmedBy,
            confirmed_at: now,
            updated_at: now,
          },
          { onConflict: "instance_id" }
        );
      if (resErr) throw resErr;

      const { error: instErr } = await supabase
        .from("eval_instances")
        .update({ workflow_status: "confirmed", updated_at: now })
        .eq("id", instanceId);
      if (instErr) throw instErr;
    },
    onSuccess: (_d, { instanceId }) => {
      qc.invalidateQueries({ queryKey: ["eval_final_result", instanceId] });
      qc.invalidateQueries({ queryKey: ["eval_instance", instanceId] });
      qc.invalidateQueries({ queryKey: ["eval_instances"] });
    },
  });
}

// ── My pending evaluations (supervisor view) ───────────────────────────────
// 내가 평가해야 할 인스턴스 목록

export function useGetMyPendingEvals(evaluatorId: string | null, cycleId: string | undefined) {
  return useQuery({
    queryKey: ["my_pending_evals", evaluatorId, cycleId],
    enabled: !!evaluatorId && !!cycleId,
    queryFn: async () => {
      if (!supabase || !evaluatorId || !cycleId) return [];
      // 내가 배정된 evaluatee_id 조회
      const { data: assignments, error: aErr } = await supabase
        .from("eval_assignments")
        .select("evaluatee_id, evaluator_role")
        .eq("evaluator_id", evaluatorId)
        .eq("cycle_id", cycleId);
      if (aErr) throw aErr;

      if (!assignments || assignments.length === 0) return [];

      // evaluatee_id → evaluator_role 매핑 (role-status 교차 검증용)
      const roleByEvaluatee = new Map<string, string>(
        (assignments as Array<{ evaluatee_id: string; evaluator_role: string }>).map(
          (a) => [a.evaluatee_id, a.evaluator_role],
        ),
      );

      const evaluateeIds = Array.from(roleByEvaluatee.keys());
      const { data: instances, error: iErr } = await supabase
        .from("eval_instances")
        .select("*, employees(full_name, department, job_title, job_group)")
        .eq("cycle_id", cycleId)
        .in("employee_id", evaluateeIds);
      if (iErr) throw iErr;

      // 내 역할(evaluator_role)이 현재 workflow 단계와 일치하는 것만 반환
      // first → pending_first 일 때만, second → pending_second 일 때만
      return (instances ?? [])
        .filter((inst: Record<string, unknown>) => {
          const role = roleByEvaluatee.get(inst.employee_id as string);
          const status = inst.workflow_status as string;
          if (role === "first") return status === "pending_first";
          if (role === "second") return status === "pending_second";
          return false;
        })
        .map(mapInstance);
    },
  });
}
