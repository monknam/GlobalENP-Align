import React from "react";
import { useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useAuth } from "@/hooks/use-auth";
import {
  useAllSeasons,
  useActiveSeason,
  useAdminOverview,
  useCreateSeason,
  useUpdateSeasonStatus,
  type SimpleEvaluation,
  type Season,
} from "@/hooks/use-simple-eval";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Clock,
  Users,
  PlusCircle,
  Lock,
  Unlock,
  ChevronRight,
  BarChart3,
  Download,
} from "lucide-react";

// ── 부서별 제출 현황 집계 ──────────────────────────────────────

function groupByDept(evals: SimpleEvaluation[]) {
  const map: Record<
    string,
    { total: number; submitted: number; draft: number; items: SimpleEvaluation[] }
  > = {};
  for (const e of evals) {
    const dept = e.employees?.department ?? "기타";
    if (!map[dept]) map[dept] = { total: 0, submitted: 0, draft: 0, items: [] };
    map[dept].total++;
    if (e.status === "submitted") map[dept].submitted++;
    else map[dept].draft++;
    map[dept].items.push(e);
  }
  return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
}

// ── 등급 뱃지 ─────────────────────────────────────────────────

function StatusChip({ status }: { status: "draft" | "submitted" }) {
  if (status === "submitted")
    return (
      <span className="enp-chip" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
        <CheckCircle2 size={10} /> 제출완료
      </span>
    );
  return (
    <span className="enp-chip" style={{ background: "#fef3c7", color: "#b45309" }}>
      <Clock size={10} /> 작성중
    </span>
  );
}

// ── CSV 다운로드 ──────────────────────────────────────────────

function downloadCSV(evals: SimpleEvaluation[], seasonName: string) {
  const header = ["부서", "이름", "직급", "직군", "상태", "제출일시"];
  const rows = evals.map((e) => [
    e.employees?.department ?? "",
    e.employees?.full_name ?? "",
    e.employees?.job_title ?? "",
    e.employees?.job_group ?? "",
    e.status === "submitted" ? "제출완료" : "작성중",
    e.submitted_at
      ? new Date(e.submitted_at).toLocaleString("ko-KR")
      : "",
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${seasonName}_제출현황.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 시즌 카드 ─────────────────────────────────────────────────

function SeasonCard({
  season,
  isActive,
  onToggle,
  toggling,
}: {
  season: Season;
  isActive: boolean;
  onToggle: () => void;
  toggling: boolean;
}) {
  return (
    <div
      className="enp-card p-4 flex items-center gap-4"
      style={isActive ? { borderLeft: "3px solid hsl(var(--enp-primary))" } : {}}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-[hsl(var(--enp-on-surface))]">{season.name}</p>
          {isActive ? (
            <span className="enp-chip" style={{ background: "#e0f0fc", color: "#00619c" }}>진행중</span>
          ) : (
            <span className="enp-chip" style={{ background: "hsl(var(--enp-surface-mid))", color: "hsl(var(--enp-on-surface-variant))" }}>
              마감
            </span>
          )}
        </div>
        <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] mt-0.5">
          {season.year}년 · 생성일: {new Date(season.created_at).toLocaleDateString("ko-KR")}
        </p>
      </div>
      <button
        className="enp-btn enp-btn-secondary text-xs flex items-center gap-1.5"
        onClick={onToggle}
        disabled={toggling}
      >
        {isActive ? (
          <><Lock size={12} /> 마감</>
        ) : (
          <><Unlock size={12} /> 재개</>
        )}
      </button>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────

export default function SimpleEvalAdmin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const isAdmin = user?.role === "admin";

  const { data: activeSeason } = useActiveSeason();
  const { data: allSeasons = [], isLoading: seasonsLoading } = useAllSeasons();
  const { data: evals = [], isLoading: evalsLoading } = useAdminOverview(
    activeSeason?.id ?? null
  );

  const createSeason = useCreateSeason();
  const updateStatus = useUpdateSeasonStatus();

  // 시즌 생성 폼
  const [showCreate, setShowCreate] = React.useState(false);
  const [newYear, setNewYear] = React.useState(new Date().getFullYear().toString());
  const [newName, setNewName] = React.useState(`${new Date().getFullYear()}년 간이 성과평가`);
  const [creating, setCreating] = React.useState(false);
  const [toggling, setToggling] = React.useState<string | null>(null);

  // 선택된 부서 (상세 보기)
  const [selectedDept, setSelectedDept] = React.useState<string | null>(null);

  const handleCreateSeason = async () => {
    const year = parseInt(newYear);
    if (!year || !newName.trim()) return;
    setCreating(true);
    try {
      await createSeason.mutateAsync({ year, name: newName.trim() });
      setShowCreate(false);
      toast({ title: "시즌이 생성되었습니다", description: newName });
    } catch (e: any) {
      toast({ title: "생성 실패", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleSeason = async (season: Season) => {
    setToggling(season.id);
    try {
      await updateStatus.mutateAsync({
        id: season.id,
        status: season.status === "open" ? "closed" : "open",
      });
      toast({ title: `시즌 ${season.status === "open" ? "마감" : "재개"}됨` });
    } catch (e: any) {
      toast({ title: "변경 실패", description: e.message, variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  const deptGroups = groupByDept(evals);
  const totalSubmitted = evals.filter((e) => e.status === "submitted").length;
  const total = evals.length;

  const selectedGroup = deptGroups.find(([dept]) => dept === selectedDept);

  if (!isAdmin) {
    return (
      <Shell>
        <div className="text-center py-20">
          <p className="text-[hsl(var(--enp-on-surface-variant))]">관리자 전용 페이지입니다.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div>
            <p className="enp-label mb-1">간이 성과평가 · 관리자</p>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "Manrope, Pretendard, sans-serif" }}>
              평가 현황 관리
            </h1>
          </div>
          <div className="flex gap-2">
            {activeSeason && evals.length > 0 && (
              <button
                className="enp-btn enp-btn-secondary text-sm flex items-center gap-1.5"
                onClick={() => downloadCSV(evals, activeSeason.name)}
              >
                <Download size={14} /> CSV
              </button>
            )}
            <button
              className="enp-btn enp-btn-primary text-sm flex items-center gap-1.5"
              onClick={() => setShowCreate(true)}
            >
              <PlusCircle size={14} /> 시즌 생성
            </button>
          </div>
        </div>

        {/* ── 시즌 목록 ─────────────────────────────── */}
        <div className="space-y-2">
          <p className="enp-label">평가 시즌</p>
          {seasonsLoading ? (
            <div className="enp-card p-4 text-sm text-[hsl(var(--enp-on-surface-variant))]">불러오는 중...</div>
          ) : allSeasons.length === 0 ? (
            <div className="enp-card p-8 text-center">
              <p className="text-[hsl(var(--enp-on-surface-variant))] text-sm">
                아직 생성된 시즌이 없습니다.
              </p>
              <button
                className="enp-btn enp-btn-primary mt-3 text-sm"
                onClick={() => setShowCreate(true)}
              >
                첫 시즌 만들기
              </button>
            </div>
          ) : (
            allSeasons.map((s) => (
              <SeasonCard
                key={s.id}
                season={s}
                isActive={s.status === "open"}
                onToggle={() => handleToggleSeason(s)}
                toggling={toggling === s.id}
              />
            ))
          )}
        </div>

        {/* ── 현재 시즌 제출 현황 ───────────────────── */}
        {activeSeason && (
          <>
            {/* 요약 카드 */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "전체 평가", value: total, icon: Users, color: "#00619c", bg: "#e0f0fc" },
                { label: "제출 완료", value: totalSubmitted, icon: CheckCircle2, color: "#2e7d32", bg: "#e8f5e9" },
                { label: "제출률", value: total > 0 ? `${Math.round((totalSubmitted / total) * 100)}%` : "-", icon: BarChart3, color: "#3d5d9e", bg: "#e8edf8" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="enp-card p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: bg }}
                  >
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div>
                    <p className="enp-label">{label}</p>
                    <p
                      className="text-2xl font-bold"
                      style={{ fontFamily: "Manrope, sans-serif", color }}
                    >
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* 부서별 현황 테이블 */}
            <div className="enp-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[hsl(var(--enp-surface-mid))]">
                <h2 className="font-semibold text-[hsl(var(--enp-on-surface))]">
                  부서별 제출 현황
                </h2>
                <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] mt-0.5">
                  {activeSeason.name}
                </p>
              </div>

              {evalsLoading ? (
                <div className="px-6 py-10 text-center text-sm text-[hsl(var(--enp-on-surface-variant))]">
                  불러오는 중...
                </div>
              ) : deptGroups.length === 0 ? (
                <div className="px-6 py-10 text-center text-sm text-[hsl(var(--enp-on-surface-variant))]">
                  제출된 평가가 없습니다.
                </div>
              ) : (
                <div className="divide-y divide-[hsl(var(--enp-surface-mid))]">
                  {deptGroups.map(([dept, stat]) => {
                    const pct = Math.round((stat.submitted / stat.total) * 100);
                    const isOpen = selectedDept === dept;
                    return (
                      <React.Fragment key={dept}>
                        <button
                          className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[hsl(var(--enp-surface-low))] transition-colors text-left"
                          onClick={() => setSelectedDept(isOpen ? null : dept)}
                        >
                          {/* 부서명 */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-[hsl(var(--enp-on-surface))]">{dept}</p>
                            <p className="text-xs text-[hsl(var(--enp-on-surface-variant))] mt-0.5">
                              제출 {stat.submitted} / 전체 {stat.total}명
                            </p>
                          </div>

                          {/* 진행 바 */}
                          <div className="w-32 hidden sm:block">
                            <div className="h-1.5 rounded-full bg-[hsl(var(--enp-surface-mid))] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  background: pct === 100 ? "#2e7d32" : pct >= 50 ? "#00619c" : "#b45309",
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-right text-[hsl(var(--enp-on-surface-variant))] mt-0.5">
                              {pct}%
                            </p>
                          </div>

                          {/* 상태 */}
                          {pct === 100 ? (
                            <span className="enp-chip" style={{ background: "#e8f5e9", color: "#2e7d32" }}>완료</span>
                          ) : (
                            <span className="enp-chip" style={{ background: "#fef3c7", color: "#b45309" }}>진행중</span>
                          )}

                          <ChevronRight
                            size={16}
                            className="text-[hsl(var(--enp-outline))] transition-transform"
                            style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
                          />
                        </button>

                        {/* 부서 내 직원 목록 */}
                        {isOpen && (
                          <div className="bg-[hsl(var(--enp-surface-low))] px-6 py-3 space-y-2">
                            {stat.items.map((e) => (
                              <div
                                key={e.id}
                                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[hsl(var(--enp-surface-lowest))] cursor-pointer hover:shadow-sm transition-shadow"
                                onClick={() => navigate(`/simple-eval/form/${e.id}`)}
                              >
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                  style={{ background: "hsl(var(--enp-primary))" }}
                                >
                                  {e.employees?.full_name?.charAt(0) ?? "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[hsl(var(--enp-on-surface))]">
                                    {e.employees?.full_name}
                                  </p>
                                  <p className="text-xs text-[hsl(var(--enp-on-surface-variant))]">
                                    {e.employees?.job_title}
                                  </p>
                                </div>
                                <StatusChip status={e.status} />
                                {e.submitted_at && (
                                  <span className="text-xs text-[hsl(var(--enp-on-surface-variant))] hidden sm:block">
                                    {new Date(e.submitted_at).toLocaleDateString("ko-KR")}
                                  </span>
                                )}
                                <ChevronRight size={14} className="text-[hsl(var(--enp-outline))]" />
                              </div>
                            ))}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 시즌 생성 모달 ─────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="enp-glass enp-shadow-modal rounded-2xl p-8 max-w-sm w-full mx-4 space-y-5">
            <div>
              <p className="text-lg font-bold text-[hsl(var(--enp-on-surface))]">새 평가 시즌 생성</p>
              <p className="text-sm text-[hsl(var(--enp-on-surface-variant))] mt-1">
                생성 후 Supabase에서 기준 항목 시드를 실행하세요.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="enp-label mb-1.5">연도</p>
                <input
                  className="enp-input"
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="2025"
                />
              </div>
              <div>
                <p className="enp-label mb-1.5">시즌명</p>
                <input
                  className="enp-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="2025년 간이 성과평가"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="flex-1 enp-btn enp-btn-secondary"
                onClick={() => setShowCreate(false)}
                disabled={creating}
              >
                취소
              </button>
              <button
                className="flex-1 enp-btn enp-btn-primary"
                onClick={handleCreateSeason}
                disabled={creating || !newName.trim()}
              >
                {creating ? "생성 중..." : "생성"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
