import { useState } from "react";
import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import { useGetDepartments, useCreateDepartment, useUpdateDepartment, type Department } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Building2, Plus, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function DepartmentsAdmin() {
  const { isAuthorized } = useProtectedRoute(['admin']);
  const { data: departments, isLoading, refetch } = useGetDepartments();
  const departmentList = Array.isArray(departments) ? departments : [];
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "" });

  if (!isAuthorized) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await updateMutation.mutateAsync({ id: editingDept.id, data: formData });
        toast({ title: "조직 정보가 반영되었습니다." });
      } else {
        await createMutation.mutateAsync({ data: formData });
        toast({ title: "새 조직이 추가되었습니다." });
      }
      setIsOpen(false);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "조직 정보를 반영하지 못했습니다." });
    }
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({ name: dept.name, code: dept.code || "" });
    setIsOpen(true);
  };

  const openCreate = () => {
    setEditingDept(null);
    setFormData({ name: "", code: "" });
    setIsOpen(true);
  };

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> 조직 구조 운영
          </h1>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <button onClick={openCreate} className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2">
                <Plus className="w-4 h-4" /> 조직 추가
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingDept ? '조직 정보 수정' : '새 조직 추가'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">조직명</label>
                  <input
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">조직 코드 (선택)</label>
                  <input
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="w-full bg-primary text-white py-2 rounded-md font-medium mt-4">
                  저장
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">조직명</th>
                <th className="px-6 py-4">코드</th>
                <th className="px-6 py-4">상태</th>
                <th className="px-6 py-4 text-right">설정</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">조직 정보를 불러오는 중...</td></tr>
              ) : (
                departmentList.map(dept => (
                  <tr key={dept.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">{dept.name}</td>
                    <td className="px-6 py-4 text-slate-500">{dept.code || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${dept.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {dept.isActive ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEdit(dept)} className="text-slate-400 hover:text-primary p-2">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
