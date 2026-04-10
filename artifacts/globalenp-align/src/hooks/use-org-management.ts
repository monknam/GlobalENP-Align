import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/use-auth";

/** Types */

export interface EmployeeTask {
  id: string;
  employee_id: string;
  task_name: string;
  description: string;
  created_at: string;
}

export interface EmployeeWithTasks {
  id: string;
  employee_no: string;
  full_name: string;
  department: string;
  job_title: string;
  job_role: string | null;
  supervisor_id: string | null;
  is_department_head: boolean;
  employee_tasks?: EmployeeTask[];
}

export interface TOPosition {
  id: string;
  department: string;
  position_name: string;
  title: string;
  target_count: number;
  recruit_status: string;
  approval_status: string;
  target_hire_date: string | null;
  required_tasks: string[];
  is_target: boolean;
  notes: string | null;
}

export interface TORequestPayload {
  department: string;
  requester_name: string;
  target_rank: string;
  headcount: number;
  employment_type: string;
  reasons: string[];
  reason_detail?: string;
  project_info?: string;          // 연관 프로젝트/공사명
  replace_person?: string;        // 대체 대상자 이름 (reason_detail에 포함)
  current_team_work: any;
  new_work_jd?: string;
  required_licenses: string[];
  experience_req?: string;
  preferred_cond?: string;        // 우대 조건
  budget_status?: string;         // 기확보 | 신규 요청
  is_urgent?: boolean;            // 긴급 여부
  desired_hire_date?: string;     // 채용 희망일
  contract_start?: string;
  contract_end?: string;
  remarks?: string;               // 비고
  approval_status?: string;
}

export interface DepartmentOrgData {
  departmentName: string;
  employees: EmployeeWithTasks[];
  toPositions: TOPosition[];
}

/** Hooks */

export const ORG_QUERY_KEY = ["org-chart"];
export const TO_REQUESTS_QUERY_KEY = ["to-requests"];

/** 
 * 현재 부서별 직원 목록(PO)과 배정된 TO 현황을 통합해서 가져오는 훅 
 */
export function useDepartmentOrgChart() {
  return useQuery({
    queryKey: ORG_QUERY_KEY,
    queryFn: async (): Promise<DepartmentOrgData[]> => {
      if (!supabase) throw new Error("Supabase client is not initialized");

      // 1. 직원 목록 및 매핑된 task 가져오기
      const { data: employeesData, error: empError } = await supabase
        .from("employees")
        .select(`
          id, employee_no, full_name, department, job_title, job_role,
          supervisor_id, is_department_head,
          employee_tasks (id, employee_id, task_name, description, created_at)
        `)
        .eq("is_active", true)
        .order("is_department_head", { ascending: false })
        .order("job_title", { ascending: false });

      if (empError) throw empError;

      // 2. TO 포지션 데이터 가져오기
      const { data: toPositionsData, error: toError } = await supabase
        .from("to_positions")
        .select("*")
        .order("created_at", { ascending: true });

      if (toError) throw toError;

      // 3. 부서 단위로 묶기
      const deptMap: Record<string, DepartmentOrgData> = {};

      const safeEmployees = (employeesData || []) as EmployeeWithTasks[];
      const safeTOPositions = (toPositionsData || []) as TOPosition[];

      // 부서 초기화 (직원 기준)
      safeEmployees.forEach((emp) => {
        const dept = emp.department || "소속없음";
        if (!deptMap[dept]) {
          deptMap[dept] = { departmentName: dept, employees: [], toPositions: [] };
        }
        deptMap[dept].employees.push(emp);
      });

      // 부서 초기화 (TO 기준)
      safeTOPositions.forEach((pos) => {
        const dept = pos.department || "소속없음";
        if (!deptMap[dept]) {
          deptMap[dept] = { departmentName: dept, employees: [], toPositions: [] };
        }
        deptMap[dept].toPositions.push(pos);
      });

      return Object.values(deptMap);
    },
  });
}

/**
 * 현업 부서의 신규 TO 신청서 제출 훅
 */
export function useSubmitTORequest() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: TORequestPayload) => {
      if (!supabase) throw new Error("Supabase client is not initialized");

      // 문서번호 자동 채번 (간이 방식: TO-YYYY-랜덤4자리)
      const docNo = `TO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const { data, error } = await supabase
        .from("to_requests")
        .insert({
          ...payload,
          doc_no: docNo,
          submitted_by: user?.id || null, // Supabase Auth User UUID
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TO_REQUESTS_QUERY_KEY });
    },
  });
}

/**
 * 직원 부서/상위관리자 변경 (조직도 DnD 편집)
 */
export function useUpdateEmployeeDept() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      department,
      supervisor_id,
    }: {
      id: string;
      department: string;
      supervisor_id?: string | null;
    }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("employees")
        .update({ department, supervisor_id: supervisor_id ?? null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORG_QUERY_KEY });
    },
  });
}

export type TORequestStatus =
  | "🟡 검토중"
  | "🔵 승인완료"
  | "🔄 채용중"
  | "✅ 완료"
  | "❌ 반려"
  | "⏸ 보류";

export interface TORequest {
  id: string;
  doc_no: string;
  requested_at: string;
  department: string;
  requester_name: string;
  target_rank: string;
  headcount: number;
  employment_type: string;
  reasons: string[];
  new_work_jd: string | null;
  approval_status: TORequestStatus;
  created_at: string;
}

/**
 * 관리자: 전체 TO 신청 목록 조회
 */
export function useGetTORequests() {
  return useQuery({
    queryKey: TO_REQUESTS_QUERY_KEY,
    queryFn: async (): Promise<TORequest[]> => {
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { data, error } = await supabase
        .from("to_requests")
        .select(
          "id, doc_no, requested_at, department, requester_name, target_rank, headcount, employment_type, reasons, new_work_jd, approval_status, created_at"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TORequest[];
    },
  });
}

/**
 * 관리자: TO 신청 상태 변경
 */
export function useUpdateTORequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      approval_status,
    }: {
      id: string;
      approval_status: TORequestStatus;
    }) => {
      if (!supabase) throw new Error("Supabase client is not initialized");
      const { error } = await supabase
        .from("to_requests")
        .update({ approval_status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TO_REQUESTS_QUERY_KEY });
    },
  });
}
