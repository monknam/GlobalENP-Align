import { useState } from "react";
import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Users, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "admin" | "leader" | "member";
  department_id: string | null;
  department_name: string | null;
}

interface DepartmentRow {
  id: string;
  name: string;
}

function useGetProfiles() {
  return useQuery({
    queryKey: ["admin_profiles"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, department_id, department_name")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
    },
  });
}

function useGetDepts() {
  return useQuery({
    queryKey: ["admin_departments"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as DepartmentRow[];
    },
  });
}

function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role, departmentId }: { id: string; role: string; departmentId: string | null }) => {
      if (!supabase) throw new Error("Supabase not initialized");
      const { error } = await supabase
        .from("profiles")
        .update({ role, department_id: departmentId, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin_profiles"] });
    },
  });
}

export default function UsersAdmin() {
  const { isAuthorized, user: currentUser } = useProtectedRoute(["admin", "leader"]);
  const { data: profiles = [], isLoading } = useGetProfiles();
  const { data: departments = [] } = useGetDepts();
  const updateMutation = useUpdateProfile();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ProfileRow | null>(null);
  const [formData, setFormData] = useState({ role: "member" as "admin" | "leader" | "member", departmentId: "" });

  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile) return;
    try {
      await updateMutation.mutateAsync({
        id: editingProfile.id,
        role: formData.role,
        departmentId: formData.departmentId || null,
      });
      toast({ title: "구성원 정보가 반영되었습니다." });
      setIsOpen(false);
    } catch {
      toast({ variant: "destructive", title: "구성원 정보를 반영하지 못했습니다." });
    }
  };

  const openEdit = (profile: ProfileRow) => {
    if (currentUser?.role !== "admin") return;
    setEditingProfile(profile);
    setFormData({ role: profile.role, departmentId: profile.department_id || "" });
    setIsOpen(true);
  };

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> 구성원 운영
        </h1>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">이름 / 이메일</th>
                <th className="px-6 py-4">부서</th>
                <th className="px-6 py-4">역할</th>
                <th className="px-6 py-4 text-right">설정</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">구성원 정보를 불러오는 중...</td></tr>
              ) : (
                profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{profile.full_name || "미설정"}</div>
                      <div className="text-slate-500 text-xs">{profile.email}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{profile.department_name || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        profile.role === "admin" ? "bg-purple-100 text-purple-700" :
                        profile.role === "leader" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {profile.role === "admin" ? "관리자" : profile.role === "leader" ? "리더" : "구성원"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {currentUser?.role === "admin" ? (
                        <button onClick={() => openEdit(profile)} className="text-slate-400 hover:text-primary p-2">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">조회만 가능</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Dialog open={currentUser?.role === "admin" && isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>구성원 권한 및 소속 설정</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">역할</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "leader" | "member" })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="member">구성원</option>
                  <option value="leader">조직 리더</option>
                  <option value="admin">시스템 관리자</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">소속 부서</label>
                <select
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">소속 없음</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full bg-primary text-white py-2 rounded-md font-medium mt-4"
              >
                저장
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Shell>
  );
}
