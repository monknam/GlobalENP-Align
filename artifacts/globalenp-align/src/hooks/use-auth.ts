import { useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { useToast } from "@/hooks/use-toast";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AppProfile {
  id: string;
  email: string | null;
  fullName: string | null;
  role: "admin" | "leader" | "member";
  departmentId: string | null;
  departmentName: string | null;
  employmentStatus: "active" | "inactive" | "leave" | null;
  employeeGroup: "dev" | "non_dev" | "management" | null;
  isSystemAdmin: boolean;
}

export interface AuthUser extends AppProfile {
  authUser: SupabaseUser;
}

const AUTH_SESSION_QUERY_KEY = ["auth", "session"] as const;
const AUTH_USER_QUERY_KEY = ["auth", "user"] as const;
const LEGACY_AUTH_USER_QUERY_KEY = ["auth", "legacy-user"] as const;
const DEV_AUTH_STORAGE_KEY = "globalenp.dev-auth-user";
const ROLE_OVERRIDE_KEY = "globalenp.role-override";

// 로그인 시 역할 선택 화면을 거쳐야 하는 계정 목록
const MULTI_ROLE_EMAILS: string[] = [];

export function setRoleOverride(role: AppProfile["role"]) {
  try { sessionStorage.setItem(ROLE_OVERRIDE_KEY, role); } catch { /* noop */ }
}

function getRoleOverride(): AppProfile["role"] | null {
  try { return sessionStorage.getItem(ROLE_OVERRIDE_KEY) as AppProfile["role"] | null; } catch { return null; }
}

function clearRoleOverride() {
  try { sessionStorage.removeItem(ROLE_OVERRIDE_KEY); } catch { /* noop */ }
}

interface LegacyAuthUser {
  id: string;
  email: string;
  fullName: string | null;
  role: "admin" | "leader" | "member";
  departmentId: string | null;
  departmentName: string | null;
  employmentStatus?: "active" | "inactive" | "leave" | null;
  employeeGroup?: "dev" | "non_dev" | "management" | null;
  isSystemAdmin: boolean;
}

async function legacyFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `API error ${response.status}`);
  }

  return response.json();
}

function isLocalDevAuthEnabled() {
  if (typeof window === "undefined") return false;
  return import.meta.env.VITE_ENABLE_LOCAL_DEV_AUTH === "true";
}

function getStoredDevUser(): AuthUser | null {
  if (typeof window === "undefined" || !isLocalDevAuthEnabled()) return null;

  const raw = window.localStorage.getItem(DEV_AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    return null;
  }
}

function setStoredDevUser(user: AuthUser | null) {
  if (typeof window === "undefined" || !isLocalDevAuthEnabled()) return;

  if (!user) {
    window.localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(user));
}

async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

async function getProfile(authUser: SupabaseUser): Promise<AuthUser> {
  if (!supabase) {
    return {
      id: authUser.id,
      email: authUser.email ?? null,
      fullName: authUser.user_metadata?.full_name ?? null,
      role: (authUser.user_metadata?.role ?? "member") as AuthUser["role"],
      departmentId: null,
      departmentName: null,
      employmentStatus: null,
      employeeGroup: null,
      isSystemAdmin: false,
      authUser,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, department_id, department_name, employment_status, employee_group, is_system_admin")
    .eq("id", authUser.id)
    .maybeSingle();

  if (error) {
    const fallbackRole = (authUser.user_metadata?.role ?? "member") as AuthUser["role"];

    return {
      id: authUser.id,
      email: authUser.email ?? null,
      fullName: authUser.user_metadata?.full_name ?? null,
      role: fallbackRole,
      departmentId: null,
      departmentName: null,
      employmentStatus: null,
      employeeGroup: null,
      isSystemAdmin: false,
      authUser,
    };
  }

  const role = (data?.role ?? authUser.user_metadata?.role ?? "member") as AuthUser["role"];

  return {
    id: authUser.id,
    email: data?.email ?? authUser.email ?? null,
    fullName: data?.full_name ?? authUser.user_metadata?.full_name ?? null,
    role,
    departmentId: data?.department_id ?? null,
    departmentName: data?.department_name ?? null,
    employmentStatus: data?.employment_status ?? null,
    employeeGroup: data?.employee_group ?? null,
    isSystemAdmin: data?.is_system_admin ?? false,
    authUser,
  };
}

async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return getProfile(session.user);
}

async function getLegacyCurrentUser(): Promise<AuthUser | null> {
  try {
    const user = await legacyFetch<LegacyAuthUser>("/api/auth/me");
    return {
      ...user,
      employmentStatus: user.employmentStatus ?? null,
      employeeGroup: user.employeeGroup ?? null,
      authUser: {
        id: user.id,
        app_metadata: {},
        user_metadata: {},
        aud: "legacy",
        created_at: new Date().toISOString(),
      } as SupabaseUser,
    };
  } catch {
    return getStoredDevUser();
  }
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const sessionQuery = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: getSession,
    staleTime: 5 * 60 * 1000,
  });

  const userQuery = useQuery({
    queryKey: AUTH_USER_QUERY_KEY,
    queryFn: getCurrentUser,
    enabled: !!sessionQuery.data?.user,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const legacyUserQuery = useQuery({
    queryKey: LEGACY_AUTH_USER_QUERY_KEY,
    queryFn: getLegacyCurrentUser,
    enabled: !hasSupabaseEnv,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: LoginRequest) => {
      if (!hasSupabaseEnv) {
        try {
          return await legacyFetch<LegacyAuthUser>("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
        } catch {
          if (isLocalDevAuthEnabled() && email === "admin@globalenp.com" && password === "admin1234") {
            return {
              id: "dev-admin",
              email,
              fullName: "관리자",
              role: "admin" as const,
              departmentId: null,
              departmentName: null,
              employmentStatus: "active" as const,
              employeeGroup: "management" as const,
              isSystemAdmin: true,
            };
          }

          throw new Error("백엔드가 실행 중이 아니고 로컬 개발 로그인도 사용할 수 없습니다.");
        }
      }

      if (!supabase) {
        throw new Error("Supabase environment variables are missing. Check artifacts/globalenp-align/.env.example.");
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      if (!hasSupabaseEnv) {
        const legacyUser = data as LegacyAuthUser;
        setStoredDevUser({
          ...legacyUser,
          employmentStatus: legacyUser.employmentStatus ?? null,
          employeeGroup: legacyUser.employeeGroup ?? null,
          authUser: {
            id: legacyUser.id,
            app_metadata: {},
            user_metadata: {},
            aud: "legacy",
            created_at: new Date().toISOString(),
          } as SupabaseUser,
        });
      }

      await queryClient.invalidateQueries({ queryKey: AUTH_SESSION_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: AUTH_USER_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: LEGACY_AUTH_USER_QUERY_KEY });

      // 멀티롤 계정은 역할 선택 화면으로
      const loginEmail = hasSupabaseEnv
        ? (data as { user?: { email?: string } })?.user?.email
        : (data as LegacyAuthUser)?.email;
      if (loginEmail && MULTI_ROLE_EMAILS.includes(loginEmail)) {
        setLocation("/role-select");
      } else {
        setLocation("/");
      }
      toast({ title: "로그인 성공", description: "환영합니다." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "로그인 실패",
        description: error.message || "이메일 또는 비밀번호를 확인해주세요.",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      clearRoleOverride();
      if (!hasSupabaseEnv) {
        try {
          await legacyFetch("/api/auth/logout", { method: "POST" });
        } catch {
          // Ignore logout failures to avoid trapping the user in a broken session state.
        }
        setStoredDevUser(null);
        return;
      }

      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, null);
      queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
      queryClient.setQueryData(LEGACY_AUTH_USER_QUERY_KEY, null);
      setLocation("/login");
      toast({ title: "로그아웃", description: "성공적으로 로그아웃 되었습니다." });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "로그아웃 실패",
        description: error.message || "잠시 후 다시 시도해주세요.",
      });
    },
  });

  const isLoading = hasSupabaseEnv
    ? sessionQuery.isLoading || (sessionQuery.data?.user ? userQuery.isLoading : false)
    : legacyUserQuery.isLoading;
  const rawUser = hasSupabaseEnv ? userQuery.data ?? null : legacyUserQuery.data ?? null;
  const roleOverride = getRoleOverride();
  const user = rawUser && roleOverride ? { ...rawUser, role: roleOverride } : rawUser;
  const isAuthenticated = hasSupabaseEnv ? !!sessionQuery.data?.user : !!legacyUserQuery.data;

  return {
    user,
    session: sessionQuery.data ?? null,
    isLoading,
    isAuthenticated,
    login: (data: LoginRequest) => loginMutation.mutate(data),
    isLoggingIn: loginMutation.isPending,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}

export function useProtectedRoute(allowedRoles?: string[]) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      setLocation("/");
    }
  }, [allowedRoles, isAuthenticated, isLoading, setLocation, user]);

  return {
    user,
    isLoading,
    isAuthorized: isAuthenticated && (!allowedRoles || (user && allowedRoles.includes(user.role))),
  };
}
