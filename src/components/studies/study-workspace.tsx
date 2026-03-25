"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  FileText,
  Sparkles,
  ArrowUpRight,
  Download,
  Wand2,
  Loader2,
  Check,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudyLifecycleStepper, type LifecycleStage } from "./study-lifecycle-stepper";
import { StudyNextAction } from "./study-next-action";
import { StudyPersonaList } from "./study-persona-list";
import { ExpandGroupButton } from "./expand-group-button";
import { AnalysisWorkspace } from "./analysis-workspace";
import {
  updateStudyTitle,
  updateStudyType,
  updateStudyGuide,
  toggleStudyGroup,
} from "@/app/(dashboard)/studies/actions";

interface PersonaGroup {
  groupId: string;
  groupName: string;
  personas: Array<{
    id: string;
    name: string;
    archetype: string | null;
    occupation: string | null;
    age: number | null;
    gender: string | null;
    groupName: string;
  }>;
}

interface AvailableGroup {
  id: string;
  name: string;
  _count: { personas: number };
}

interface StudyWorkspaceProps {
  stage: LifecycleStage;
  studyId: string;
  studyType: string;
  studyTitle: string;
  interviewGuide: string | null;
  description: string | null;
  personasByGroup: PersonaGroup[];
  personaSessionMap: Record<string, { sessionId: string; status: string }>;
  pendingCount: number;
  completedCount: number;
  totalCount: number;
  analysisReport: {
    summary: string | null;
    themes: unknown;
    keyFindings: unknown;
    sentimentBreakdown: unknown;
    recommendations: unknown;
    createdAt: Date;
  } | null;
  availableGroups: AvailableGroup[];
  selectedGroupIds: string[];
}

const STUDY_TYPES = [
  { value: "INTERVIEW", label: "Interview" },
  { value: "SURVEY", label: "Survey" },
];

export function StudyWorkspace({
  stage,
  studyId,
  studyType,
  studyTitle,
  interviewGuide,
  description,
  personasByGroup,
  personaSessionMap,
  pendingCount,
  completedCount,
  totalCount,
  analysisReport,
  availableGroups,
  selectedGroupIds: initialSelectedGroupIds,
}: StudyWorkspaceProps) {
  const router = useRouter();
  const isDraft = stage === "setup";
  const isPostInterviews = stage === "analyzing" || stage === "done";
  const hasCompletedSessions = completedCount > 0;
  const hasStarted = stage !== "setup";

  // Inline editing state
  const [title, setTitle] = useState(studyTitle);
  const [type, setType] = useState(studyType);
  const [guide, setGuide] = useState(interviewGuide || "");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialSelectedGroupIds);
  const [savingTitle, setSavingTitle] = useState(false);
  const [savingGuide, setSavingGuide] = useState(false);
  const [generatingGuide, setGeneratingGuide] = useState(false);
  const guideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const guideQuestions = guide
    ? guide.split("\n").map((l) => l.trim()).filter(Boolean)
    : [];

  // Auto-save title on blur
  async function handleTitleBlur() {
    if (title === studyTitle) return;
    setSavingTitle(true);
    await updateStudyTitle(studyId, title);
    setSavingTitle(false);
  }

  // Auto-save type
  async function handleTypeChange(newType: string) {
    setType(newType);
    await updateStudyType(studyId, newType as "INTERVIEW" | "SURVEY");
    router.refresh();
  }

  // Debounced guide save
  function handleGuideChange(value: string) {
    setGuide(value);
    if (guideTimeoutRef.current) clearTimeout(guideTimeoutRef.current);
    guideTimeoutRef.current = setTimeout(async () => {
      setSavingGuide(true);
      await updateStudyGuide(studyId, value);
      setSavingGuide(false);
    }, 1500);
  }

  // Toggle persona group
  async function handleToggleGroup(groupId: string) {
    const isSelected = selectedGroupIds.includes(groupId);
    setSelectedGroupIds((prev) =>
      isSelected ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
    await toggleStudyGroup(studyId, groupId, !isSelected);
    router.refresh();
  }

  // Generate guide with AI
  async function handleGenerateGuide() {
    setGeneratingGuide(true);
    try {
      const res = await fetch("/api/studies/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          studyType: type,
          description: description || title,
        }),
      });
      const data = await res.json();
      if (data.questions) {
        const newGuide = data.questions.join("\n");
        setGuide(newGuide);
        await updateStudyGuide(studyId, newGuide);
        if (data.title && title === "Untitled Study") {
          setTitle(data.title);
          await updateStudyTitle(studyId, data.title);
        }
        toast.success("Interview guide generated!");
      }
    } catch {
      toast.error("Failed to generate guide");
    } finally {
      setGeneratingGuide(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Lifecycle Stepper + Next Action */}
      {!isDraft && (
        <div className="space-y-4">
          <StudyLifecycleStepper stage={stage} />
          <StudyNextAction
            stage={stage}
            studyId={studyId}
            pendingCount={pendingCount}
            completedCount={completedCount}
            totalCount={totalCount}
          />
        </div>
      )}

      {/* Section: Study Setup (inline editing when DRAFT) */}
      {isDraft && (
        <section className="space-y-6">
          {/* Inline Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Name your study..."
            className="text-2xl font-semibold tracking-tight bg-transparent border-0 outline-none w-full placeholder:text-muted-foreground/30 focus:placeholder:text-muted-foreground/50"
          />
          {savingTitle && (
            <span className="text-[10px] text-muted-foreground/50">Saving...</span>
          )}

          {/* Study Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Study Type</label>
            <div className="flex gap-2">
              {STUDY_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTypeChange(t.value)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                    type === t.value
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Persona Groups Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Persona Groups
            </label>
            {availableGroups.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-center">
                <Users className="mx-auto h-5 w-5 text-muted-foreground/30" />
                <p className="mt-1 text-xs text-muted-foreground">
                  No persona groups yet.{" "}
                  <Link href="/personas/new" className="underline">
                    Create some first
                  </Link>
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {availableGroups.map((g) => {
                  const isSelected = selectedGroupIds.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => handleToggleGroup(g.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-all ${
                        isSelected
                          ? "border-foreground/30 bg-stone-50"
                          : "border-border hover:border-foreground/20"
                      }`}
                    >
                      <div>
                        <span className="text-sm font-medium">{g.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {g._count.personas} personas
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Interview Guide */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Interview Guide
                {savingGuide && (
                  <span className="ml-2 text-[10px] text-muted-foreground/50">saving...</span>
                )}
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateGuide}
                disabled={generatingGuide}
                className="h-7 text-xs"
              >
                {generatingGuide ? (
                  <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="mr-1.5 h-3 w-3" />
                )}
                Generate with AI
              </Button>
            </div>
            <textarea
              value={guide}
              onChange={(e) => handleGuideChange(e.target.value)}
              placeholder={"Write your interview questions, one per line...\n\n1. Tell me about your daily routine...\n2. What tools do you currently use?\n3. What challenges have you faced?"}
              rows={8}
              className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:border-foreground/30"
            />
          </div>

          {/* Ready to start CTA */}
          {selectedGroupIds.length > 0 && guideQuestions.length > 0 && (
            <StudyNextAction
              stage={stage}
              studyId={studyId}
              pendingCount={pendingCount}
              completedCount={completedCount}
              totalCount={totalCount}
            />
          )}
        </section>
      )}

      {/* Section 2: Interview Grid */}
      {(totalCount > 0 || hasStarted) && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">
              Interviews
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {completedCount}/{totalCount} completed
              </span>
            </h3>
            {completedCount >= 2 && (
              <div className="flex items-center gap-3">
                <Link
                  href={`/studies/${studyId}/compare`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Compare
                </Link>
                <a
                  href={`/api/studies/${studyId}/export`}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="h-3 w-3" />
                  CSV
                </a>
              </div>
            )}
          </div>

          {personasByGroup.map((group) => (
            <div key={group.groupId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{group.groupName}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.personas.length} personas
                  </span>
                </div>
                <ExpandGroupButton groupId={group.groupId} />
              </div>
              <StudyPersonaList
                personas={group.personas}
                studyId={studyId}
                personaSessionMap={personaSessionMap}
                defaultCollapsed={isPostInterviews}
              />
            </div>
          ))}
        </section>
      )}

      {/* Section 3: Study Reference (collapsible, only when not draft) */}
      {!isDraft && guideQuestions.length > 0 && (
        <details className="group rounded-xl border">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-3 text-sm font-medium hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Interview Guide ({guideQuestions.length} questions)
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t px-5 py-4 space-y-2">
            {guideQuestions.map((q, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {q}
              </p>
            ))}
          </div>
        </details>
      )}

      {/* Section 4: Analysis & Insights */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className={`h-4 w-4 ${isPostInterviews || hasCompletedSessions ? "text-foreground" : "text-muted-foreground/30"}`} />
            <h3 className={`text-base font-semibold ${isPostInterviews || hasCompletedSessions ? "" : "text-muted-foreground/40"}`}>
              Analysis & Insights
            </h3>
          </div>
          {analysisReport && (
            <Link
              href={`/studies/${studyId}/results`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Full dashboard
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        {!hasCompletedSessions ? (
          <div className="rounded-xl border border-dashed p-6 text-center opacity-40">
            <Sparkles className="mx-auto h-6 w-6 text-muted-foreground/30" />
            <p className="mt-2 text-sm text-muted-foreground">
              Complete interviews to unlock AI-powered analysis
            </p>
          </div>
        ) : (
          <AnalysisWorkspace
            studyId={studyId}
            completedCount={completedCount}
            totalCount={totalCount}
            hasCompletedSessions={hasCompletedSessions}
            analysisReport={analysisReport}
          />
        )}
      </section>
    </div>
  );
}
