import { useState } from "react";
import { useProtectedRoute } from "@/hooks/use-auth";
import { Shell } from "@/components/layout/Shell";
import {
  useGetSurvey,
  useUpdateSurvey,
  useCreateSection,
  useCreateQuestion,
  useActivateSurvey,
  useCloseSurvey,
} from "@/hooks/use-surveys";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Settings, Plus, GripVertical, PlayCircle, StopCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function SurveyEdit() {
  const { isAuthorized } = useProtectedRoute(["admin"]);
  const [, params] = useRoute("/admin/surveys/:id/edit");
  const id = params?.id || "";

  const { data: survey, isLoading, refetch } = useGetSurvey(id);
  const updateMutation = useUpdateSurvey();
  const createSectionMutation = useCreateSection();
  const createQuestionMutation = useCreateQuestion();
  const activateMutation = useActivateSurvey();
  const closeMutation = useCloseSurvey();

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"info" | "builder">("info");
  const [sectionOpen, setSectionOpen] = useState(false);
  const [qOpen, setQOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("");

  const [secForm, setSecForm] = useState({ name: "", desc: "", sort: 1 });
  const [qForm, setQForm] = useState({ text: "", type: "likert_5", required: true, sort: 1 });

  if (!isAuthorized) return null;
  if (isLoading) return <Shell>불러오는 중...</Shell>;
  if (!survey) return <Shell>설문을 찾을 수 없습니다.</Shell>;

  const handleActivate = async () => {
    if (confirm("설문을 시작하시겠습니까? 시작 후에는 문항을 수정할 수 없습니다.")) {
      await activateMutation.mutateAsync({ id });
      refetch();
      toast({ title: "설문 시작됨" });
    }
  };

  const handleClose = async () => {
    if (confirm("설문을 종료하시겠습니까? 더 이상 응답을 받을 수 없습니다.")) {
      await closeMutation.mutateAsync({ id });
      refetch();
      toast({ title: "설문 종료됨" });
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSectionMutation.mutateAsync({
      surveyId: id,
      data: { name: secForm.name, description: secForm.desc, sortOrder: secForm.sort },
    });
    setSectionOpen(false);
    refetch();
    toast({ title: "섹션 추가됨" });
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    await createQuestionMutation.mutateAsync({
      sectionId: activeSectionId,
      surveyId: id,
      data: {
        questionText: qForm.text,
        questionType: qForm.type as "likert_5" | "short_text" | "long_text",
        isRequired: qForm.required,
        sortOrder: qForm.sort,
      },
    });
    setQOpen(false);
    refetch();
    toast({ title: "문항 추가됨" });
  };

  const handleUpdateIntro = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await updateMutation.mutateAsync({
      id,
      data: {
        introTitle: fd.get("introTitle") as string,
        introPurpose: fd.get("introPurpose") as string,
        introDirection: fd.get("introDirection") as string,
        introConfidentiality: fd.get("introConfidentiality") as string,
        introGuide: fd.get("introGuide") as string,
      },
    });
    toast({ title: "안내문 저장됨" });
  };

  return (
    <Shell>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6 text-[hsl(var(--primary-400))]" /> 설문 설계: {survey.title}
            </h1>
            <p className="text-[hsl(var(--neutral-500))] text-sm mt-1">
              상태:{" "}
              <span className="font-medium">
                {survey.status === "draft" ? "초안" : survey.status === "active" ? "진행 중" : "종료됨"}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {survey.status === "draft" && (
              <button
                onClick={handleActivate}
                disabled={activateMutation.isPending}
                className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <PlayCircle className="w-4 h-4" /> 배포 시작
              </button>
            )}
            {survey.status === "active" && (
              <button
                onClick={handleClose}
                disabled={closeMutation.isPending}
                className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <StopCircle className="w-4 h-4" /> 강제 종료
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[hsl(var(--neutral-200))]">
          {(["info", "builder"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-[hsl(var(--primary-400))] text-[hsl(var(--primary-400))]"
                  : "border-transparent text-[hsl(var(--neutral-500))] hover:text-[hsl(var(--neutral-700))]"
              }`}
            >
              {tab === "info" ? "기본 설정 & 안내문" : "문항 설계"}
            </button>
          ))}
        </div>

        {/* Info Tab */}
        {activeTab === "info" && (
          <div className="ts-card p-6">
            <h3 className="font-semibold mb-4 text-[hsl(var(--neutral-900))]">도입부 안내문 설정</h3>
            <form onSubmit={handleUpdateIntro} className="space-y-4">
              {[
                { name: "introTitle", label: "안내문 제목", defaultValue: survey.introTitle ?? "" },
                { name: "introPurpose", label: "진단 목적", defaultValue: survey.introPurpose ?? "" },
                { name: "introDirection", label: "응답 방향", defaultValue: survey.introDirection ?? "" },
                { name: "introConfidentiality", label: "익명성 안내", defaultValue: survey.introConfidentiality ?? "" },
                { name: "introGuide", label: "응답 가이드", defaultValue: survey.introGuide ?? "" },
              ].map((field) => (
                <div key={field.name}>
                  <label className="text-sm font-medium text-[hsl(var(--neutral-700))]">{field.label}</label>
                  <textarea
                    name={field.name}
                    defaultValue={field.defaultValue}
                    rows={3}
                    className="ts-input resize-y mt-1"
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="ts-btn-primary px-6 py-2.5 text-sm disabled:opacity-50"
              >
                저장
              </button>
            </form>
          </div>
        )}

        {/* Builder Tab */}
        {activeTab === "builder" && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Dialog open={sectionOpen} onOpenChange={setSectionOpen}>
                <DialogTrigger asChild>
                  <button
                    disabled={survey.status !== "draft"}
                    className="bg-[hsl(var(--neutral-900))] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> 새 섹션(페이지) 추가
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>섹션 추가</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSection} className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium">섹션명</label>
                      <input
                        value={secForm.name}
                        onChange={(e) => setSecForm({ ...secForm, name: e.target.value })}
                        required
                        className="ts-input mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">설명</label>
                      <input
                        value={secForm.desc}
                        onChange={(e) => setSecForm({ ...secForm, desc: e.target.value })}
                        className="ts-input mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">정렬 순서</label>
                      <input
                        type="number"
                        value={secForm.sort}
                        onChange={(e) => setSecForm({ ...secForm, sort: parseInt(e.target.value) })}
                        className="ts-input mt-1"
                      />
                    </div>
                    <button type="submit" className="ts-btn-primary w-full py-2.5 text-sm">
                      저장
                    </button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {survey.sections?.map((sec) => (
              <div
                key={sec.id}
                className="border border-[hsl(var(--neutral-200))] rounded-2xl overflow-hidden bg-white shadow-sm"
              >
                <div className="bg-[hsl(var(--neutral-50))] p-4 border-b border-[hsl(var(--neutral-200))] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <GripVertical className="text-[hsl(var(--neutral-400))] w-5 h-5" />
                    <h3 className="font-bold text-[hsl(var(--neutral-900))]">{sec.name}</h3>
                  </div>
                  <button
                    disabled={survey.status !== "draft"}
                    onClick={() => {
                      setActiveSectionId(sec.id);
                      setQOpen(true);
                    }}
                    className="text-sm text-[hsl(var(--primary-400))] hover:bg-[hsl(var(--primary-50))] px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    + 문항 추가
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {sec.questions.length === 0 ? (
                    <p className="text-sm text-[hsl(var(--neutral-400))] text-center py-4">문항이 없습니다.</p>
                  ) : (
                    sec.questions.map((q, i) => (
                      <div
                        key={q.id}
                        className="flex items-start gap-3 p-3 hover:bg-[hsl(var(--neutral-50))] rounded-xl border border-transparent hover:border-[hsl(var(--neutral-100))] transition-colors"
                      >
                        <span className="text-[hsl(var(--neutral-400))] font-medium text-sm pt-0.5">{i + 1}.</span>
                        <div>
                          <p className="text-sm font-medium text-[hsl(var(--neutral-900))]">
                            {q.questionText}
                            {q.isRequired && (
                              <span className="text-[hsl(var(--red-500))] ml-1">*</span>
                            )}
                          </p>
                          <p className="text-xs text-[hsl(var(--neutral-400))] mt-1">
                            유형:{" "}
                            {q.questionType === "likert_5"
                              ? "5점 척도"
                              : q.questionType === "short_text"
                              ? "단답형"
                              : "서술형"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}

            <Dialog open={qOpen} onOpenChange={setQOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>문항 추가</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateQuestion} className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">문항 내용</label>
                    <textarea
                      rows={3}
                      value={qForm.text}
                      onChange={(e) => setQForm({ ...qForm, text: e.target.value })}
                      required
                      className="ts-input resize-none mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">유형</label>
                    <select
                      value={qForm.type}
                      onChange={(e) => setQForm({ ...qForm, type: e.target.value })}
                      className="ts-input mt-1"
                    >
                      <option value="likert_5">5점 척도 (객관식)</option>
                      <option value="short_text">단답형 — 선택지 포함 시 "문항▸옵션1/옵션2" 형식 사용</option>
                      <option value="long_text">서술형 텍스트</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="req"
                      checked={qForm.required}
                      onChange={(e) => setQForm({ ...qForm, required: e.target.checked })}
                    />
                    <label htmlFor="req" className="text-sm font-medium">
                      필수 응답
                    </label>
                  </div>
                  <div>
                    <label className="text-sm font-medium">정렬 순서</label>
                    <input
                      type="number"
                      value={qForm.sort}
                      onChange={(e) => setQForm({ ...qForm, sort: parseInt(e.target.value) })}
                      className="ts-input mt-1"
                    />
                  </div>
                  <button type="submit" className="ts-btn-primary w-full py-2.5 text-sm">
                    저장
                  </button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </Shell>
  );
}
