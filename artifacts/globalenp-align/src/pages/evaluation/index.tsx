import React from "react";
import { Link, useParams } from "wouter";
import { Shell } from "@/components/layout/Shell";
import {
  useGetEvalCycles,
  useCreateEvalCycle,
  useCreateCycleInstances,
  useGetEvalInstances,
  useGetEmployees,
  getTestActorId,
  setTestActorId,
  type WorkflowStatus,
} from "@/hooks/use-evaluation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, ChevronRight, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";

// ── 워크플로우 상태 표시 ───────────────────────────────────────

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  pending_self: "자기평가 대기",
  pending_first: "1차 평가 대기",
  pending_committee: "커미티 검토 대기",
  pending_second: "2차 평가 대기",
  confirmed: "확정 완료",
};

const STATUS_COLOR: Record<WorkflowStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending_self: "outline",
  pending_first: "secondary",
  pending_committee: "default",
  pending_second: "secondary",
  confirmed: "outline",
};

function WorkflowBadge({ status }: { status: WorkflowStatus }) {
  const colorMap: Record<WorkflowStatus, string> = {
    pending_self: "bg-zinc-100 text-zinc-600",
    pending_first: "bg-blue-50 text-blue-700",
    pending_committee: "bg-amber-50 text-amber-700",
    pending_second: "bg-purple-50 text-purple-700",
    confirmed: "bg-green-50 text-green-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorMap[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

// ── 사이클 생성 다이얼로그 ─────────────────────────────────────

function CreateCycleDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [year, setYear] = React.useState(String(new Date().getFullYear()));
  const create = useCreateEvalCycle();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const cycle = await create.mutateAsync({ title: title.trim(), year: Number(year) });
      setOpen(false);
      setTitle("");
      onCreated(cycle.id);
      toast({ title: "평가 사이클 생성 완료" });
    } catch {
      toast({ title: "오류가 발생했습니다", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusCircle className="w-4 h-4 mr-1.5" />
          새 평가 사이클
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>평가 사이클 생성</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>사이클 명칭</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 2026 상반기 인사평가"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>연도</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min={2020}
              max={2030}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "생성 중..." : "생성"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── 테스트 모드 직원 선택기 ────────────────────────────────────

function TestActorSelector() {
  const { data: employees = [] } = useGetEmployees();
  const [actorId, setActorId] = React.useState<string>(getTestActorId() ?? "");

  const handleChange = (val: string) => {
    setActorId(val);
    setTestActorId(val === "__none__" ? null : val);
    window.location.reload();
  };

  const current = employees.find((e) => e.id === actorId);

  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
      <span className="text-amber-700 font-medium">테스트 모드 — 현재 사용자:</span>
      <Select value={actorId || "__none__"} onValueChange={handleChange}>
        <SelectTrigger className="h-7 text-xs w-48 border-amber-300 bg-white">
          <SelectValue>
            {current ? `${current.fullName} (${current.department ?? "임원"})` : "선택 안 됨"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">선택 안 됨</SelectItem>
          {employees.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.fullName} · {e.jobTitle} · {e.department ?? "임원"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ── 사이클 상세: 인스턴스 목록 ────────────────────────────────

function CycleDetail({ cycleId }: { cycleId: string }) {
  const { data: cycles = [] } = useGetEvalCycles();
  const { data: instances = [], isLoading } = useGetEvalInstances(cycleId);
  const createInstances = useCreateCycleInstances();
  const { toast } = useToast();

  const cycle = cycles.find((c) => c.id === cycleId);
  if (!cycle) return null;

  const statusCounts = instances.reduce(
    (acc, i) => {
      acc[i.workflowStatus] = (acc[i.workflowStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const handleActivate = async () => {
    try {
      await createInstances.mutateAsync(cycleId);
      toast({ title: "평가 사이클 시작 완료", description: "전 직원 인스턴스가 생성되었습니다." });
    } catch {
      toast({ title: "오류", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-zinc-900">{cycle.title}</h2>
          <p className="text-sm text-zinc-500">{cycle.year}년 · {instances.length}명</p>
        </div>
        {cycle.status === "draft" && instances.length === 0 && (
          <Button onClick={handleActivate} disabled={createInstances.isPending}>
            {createInstances.isPending ? "생성 중..." : "평가 시작 (전 직원 인스턴스 생성)"}
          </Button>
        )}
      </div>

      {/* 요약 통계 */}
      {instances.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(["pending_self","pending_first","pending_committee","pending_second","confirmed"] as WorkflowStatus[]).map((s) => (
            <div key={s} className="bg-white rounded-lg border px-3 py-2">
              <p className="text-xs text-zinc-500">{STATUS_LABEL[s]}</p>
              <p className="text-xl font-bold text-zinc-900">{statusCounts[s] ?? 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* 인스턴스 테이블 */}
      {isLoading ? (
        <p className="text-sm text-zinc-400 py-8 text-center">불러오는 중...</p>
      ) : instances.length === 0 ? (
        <div className="text-center py-12 text-zinc-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">평가 대상자가 없습니다. 평가를 시작하세요.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {instances.map((inst) => (
            <div key={inst.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-zinc-900">{inst.employeeName}</span>
                  <span className="text-xs text-zinc-400">{inst.jobTitle}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{inst.department}</p>
              </div>
              <WorkflowBadge status={inst.workflowStatus} />
              {inst.workflowStatus !== "confirmed" && (
                <Link href={`/evaluation/${cycleId}/${inst.id}/committee`}>
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    커미티 검토
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              )}
              {inst.workflowStatus === "confirmed" && (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────

export default function EvaluationPage() {
  const params = useParams<{ cycleId?: string }>();
  const { data: cycles = [], isLoading } = useGetEvalCycles();
  const [selectedCycleId, setSelectedCycleId] = React.useState<string | null>(
    params.cycleId ?? null
  );

  React.useEffect(() => {
    if (params.cycleId) setSelectedCycleId(params.cycleId);
  }, [params.cycleId]);

  // 사이클 생성 후 자동 선택
  const handleCycleCreated = (id: string) => setSelectedCycleId(id);

  const cycleStatusBadge = (status: string) => {
    if (status === "active") return <span className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">진행 중</span>;
    if (status === "closed") return <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">종료</span>;
    return <span className="text-xs font-medium text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded border">초안</span>;
  };

  return (
    <Shell guestMode>
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">인사평가 관리</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            자기평가 → 1차 상사 평가 → 커미티 검토 → 확정
          </p>
        </div>
        <CreateCycleDialog onCreated={handleCycleCreated} />
      </div>

      {/* 테스트 모드 */}
      <TestActorSelector />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 사이클 목록 (좌측) */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">평가 사이클</p>
          {isLoading ? (
            <div className="text-sm text-zinc-400 px-1">불러오는 중...</div>
          ) : cycles.length === 0 ? (
            <div className="text-sm text-zinc-400 px-1">사이클 없음</div>
          ) : (
            cycles.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCycleId(c.id)}
                className={`w-full text-left px-3 py-3 rounded-lg border text-sm transition-colors ${
                  selectedCycleId === c.id
                    ? "border-blue-300 bg-blue-50 text-blue-900"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium truncate">{c.title}</span>
                  {cycleStatusBadge(c.status)}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{c.year}년</p>
              </button>
            ))
          )}
        </div>

        {/* 사이클 상세 (우측) */}
        <div className="lg:col-span-3">
          {selectedCycleId ? (
            <CycleDetail cycleId={selectedCycleId} />
          ) : (
            <div className="flex items-center justify-center h-48 text-zinc-400">
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">사이클을 선택하거나 새로 만드세요.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 내 평가 섹션 (테스트용) */}
      <MyEvalSection />
    </div>
    </Shell>
  );
}

// ── 내 평가 현황 (테스트 모드) ────────────────────────────────

function MyEvalSection() {
  const actorId = getTestActorId();
  const { data: cycles = [] } = useGetEvalCycles();
  const activeCycle = cycles.find((c) => c.status === "active");
  const { data: instances = [] } = useGetEvalInstances(activeCycle?.id);

  if (!actorId || !activeCycle) return null;

  // 내 평가 인스턴스
  const myInstance = instances.find((i) => i.employeeId === actorId);
  // 내가 평가해야 할 인스턴스 (1차 상사인 경우)
  // — 여기서는 단순 표시만. 실제 상사 배정은 eval_assignments 기준
  const pendingForMe = instances.filter(
    (i) => i.workflowStatus === "pending_first" || i.workflowStatus === "pending_second"
  );

  return (
    <div className="space-y-3 pt-2 border-t">
      <h2 className="text-base font-semibold text-zinc-700">내 평가 현황 (테스트)</h2>

      {myInstance && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">내 평가 진행 상태</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <WorkflowBadge status={myInstance.workflowStatus} />
              {myInstance.workflowStatus === "pending_self" && (
                <Link href={`/evaluation/form/${myInstance.id}/self`}>
                  <Button size="sm">자기평가 작성하기</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingForMe.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-600">
              평가 대기 직원 ({pendingForMe.length}명)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingForMe.slice(0, 5).map((inst) => (
              <div key={inst.id} className="flex items-center justify-between py-1">
                <div>
                  <span className="text-sm font-medium text-zinc-800">{inst.employeeName}</span>
                  <span className="text-xs text-zinc-400 ml-2">{inst.department}</span>
                </div>
                <Link href={`/evaluation/form/${inst.id}/${inst.workflowStatus === "pending_second" ? "second" : "first"}`}>
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    평가 작성
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
