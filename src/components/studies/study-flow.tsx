"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { updateStudyTitle } from "@/app/(dashboard)/studies/actions";
import { StudyFlowStepper, type FlowStep, FLOW_STEPS } from "./study-flow-stepper";
import { StepNavigation } from "./step-navigation";
import { FlowStepSetup } from "./flow-steps/flow-step-setup";
import { FlowStepGuide } from "./flow-steps/flow-step-guide";
import { FlowStepInterviews } from "./flow-steps/flow-step-interviews";
import { FlowStepInsights } from "./flow-steps/flow-step-insights";

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
  description?: string | null;
  _count: { personas: number };
}

interface StudyFlowProps {
  initialStep: FlowStep;
  studyId: string;
  studyTitle: string;
  studyType: string;
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
  analysisReports: Array<{
    id: string;
    summary: string | null;
    themes: unknown;
    keyFindings: unknown;
    sentimentBreakdown: unknown;
    recommendations: unknown;
    createdAt: Date;
  }>;
  availableGroups: AvailableGroup[];
  selectedGroupIds: string[];
  orgContext: {
    productName?: string | null;
    productDescription?: string | null;
    targetAudience?: string | null;
    industry?: string | null;
  } | null;
  avgDurationMs: number;
}

// Step transition direction tracking
const stepOrder: FlowStep[] = ["setup", "guide", "interviews", "insights"];

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export function StudyFlow({
  initialStep,
  studyId,
  studyTitle,
  studyType: initialStudyType,
  interviewGuide,
  description,
  personasByGroup,
  personaSessionMap,
  pendingCount,
  completedCount,
  totalCount,
  analysisReport: initialReport,
  analysisReports: initialReports,
  availableGroups,
  selectedGroupIds: initialSelectedGroupIds,
  orgContext,
  avgDurationMs,
}: StudyFlowProps) {
  const router = useRouter();
  const reduced = useReducedMotion();

  // Restore scroll position after navigating back from session detail
  useEffect(() => {
    const key = `scroll:${studyId}`;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      sessionStorage.removeItem(key);
      requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
    }
  }, [studyId]);

  // Step state
  const [activeStep, setActiveStep] = useState<FlowStep>(initialStep);
  const [direction, setDirection] = useState(0);

  // Study data state — clear default "Untitled Study" so placeholder shows
  const [title, setTitle] = useState(
    studyTitle === "Untitled Study" ? "" : studyTitle
  );
  const [studyType, setStudyType] = useState(initialStudyType);
  const [guide, setGuide] = useState(interviewGuide || "");
  const [objective, setObjective] = useState(description || "");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialSelectedGroupIds);
  const [analysisReport, setAnalysisReport] = useState(initialReport);
  const [analysisReports, setAnalysisReports] = useState(initialReports);
  const [interviewsRunning, setInterviewsRunning] = useState(false);
  /** Live batch progress (SSE) can exceed server props until router.refresh() finishes. */
  const [clientMaxInterviewCompleted, setClientMaxInterviewCompleted] = useState(0);
  const completionToastShownRef = useRef(false);
  useEffect(() => {
    if (interviewsRunning) {
      completionToastShownRef.current = false;
    }
  }, [interviewsRunning]);

  useEffect(() => {
    setClientMaxInterviewCompleted(0);
  }, [studyId]);


  // Sync server props to client state after router.refresh()
  useEffect(() => {
    requestAnimationFrame(() => {
      setAnalysisReport(initialReport);
      setAnalysisReports(initialReports);
    });
  }, [initialReport, initialReports]);

  // Step completion checks
  const guideQuestions = useMemo(
    () => guide.split("\n").map((l) => l.trim()).filter(Boolean),
    [guide]
  );
  const isSetupComplete =
    title.trim().length > 0 && studyType.length > 0 && selectedGroupIds.length > 0;
  const isGuideComplete = guideQuestions.length >= 1;
  const effectiveInterviewCompleted = Math.max(
    completedCount,
    clientMaxInterviewCompleted
  );
  const allInterviewsDone =
    effectiveInterviewCompleted >= totalCount && totalCount > 0;
  const hasCompletedSessions = effectiveInterviewCompleted > 0;
  const hasReport = !!analysisReport;

  // Selected group names for display in Guide step
  const selectedGroupNames = useMemo(
    () =>
      availableGroups
        .filter((g) => selectedGroupIds.includes(g.id))
        .map((g) => g.name),
    [availableGroups, selectedGroupIds]
  );

  const selectedGroupsForPreview = useMemo(
    () =>
      availableGroups
        .filter((g) => selectedGroupIds.includes(g.id))
        .map((g) => ({ name: g.name, personaCount: g._count.personas })),
    [availableGroups, selectedGroupIds]
  );

  const totalPersonas = useMemo(
    () => selectedGroupsForPreview.reduce((sum, g) => sum + g.personaCount, 0),
    [selectedGroupsForPreview]
  );

  const completedSteps = useMemo(() => {
    const set = new Set<FlowStep>();
    if (isSetupComplete) set.add("setup");
    if (isGuideComplete) set.add("guide");
    if (allInterviewsDone) set.add("interviews");
    if (hasReport) set.add("insights");
    return set;
  }, [isSetupComplete, isGuideComplete, allInterviewsDone, hasReport]);

  const canEnterStep = useCallback(
    (step: FlowStep): boolean => {
      switch (step) {
        case "setup":
          return true;
        case "guide":
          return isSetupComplete;
        case "interviews":
          return isGuideComplete;
        case "insights":
          return hasCompletedSessions;
        default:
          return false;
      }
    },
    [isSetupComplete, isGuideComplete, hasCompletedSessions]
  );

  const canEnterStepRef = useRef(canEnterStep);
  canEnterStepRef.current = canEnterStep;

  /** Deep-link from Ask GoTofu etc.: /studies/:id#insights (panel stays open on client nav). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stepByHash: Record<string, FlowStep> = {
      setup: "setup",
      guide: "guide",
      interviews: "interviews",
      insight: "insights",
      insights: "insights",
    };
    function applyHashToStep() {
      const raw = window.location.hash.replace(/^#/, "").toLowerCase();
      if (!raw) return;
      const step = stepByHash[raw];
      if (!step || !canEnterStepRef.current(step)) return;
      setDirection(0);
      setActiveStep(step);
      requestAnimationFrame(() => {
        document
          .getElementById("study-step-panel")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    applyHashToStep();
    window.addEventListener("hashchange", applyHashToStep);
    return () => window.removeEventListener("hashchange", applyHashToStep);
  }, [studyId]);

  function goToStep(step: FlowStep) {
    if (canEnterStep(step)) {
      const oldIdx = stepOrder.indexOf(activeStep);
      const newIdx = stepOrder.indexOf(step);
      setDirection(newIdx > oldIdx ? 1 : -1);
      setActiveStep(step);
    }
  }

  function goNext() {
    const currentIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);
    const nextStep = FLOW_STEPS[currentIndex + 1];
    if (nextStep && canEnterStep(nextStep.key)) {
      setDirection(1);
      setActiveStep(nextStep.key);
    }
  }

  function goBack() {
    const currentIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);
    const prevStep = FLOW_STEPS[currentIndex - 1];
    if (prevStep) {
      setDirection(-1);
      setActiveStep(prevStep.key);
    }
  }

  function handleGroupToggle(groupId: string, add: boolean) {
    setSelectedGroupIds((prev) =>
      add ? [...prev, groupId] : prev.filter((id) => id !== groupId)
    );
  }

  const handleLiveInterviewCompleted = useCallback((n: number) => {
    setClientMaxInterviewCompleted((prev) => Math.max(prev, n));
  }, []);

  function handleInterviewsComplete() {
    setInterviewsRunning(false);
    if (!completionToastShownRef.current) {
      toast.success("All interviews completed!");
      completionToastShownRef.current = true;
    }
    router.refresh();
  }

  function handleReportGenerated() {
    router.refresh();
  }

  function canGoNext(): boolean {
    switch (activeStep) {
      case "setup":
        return isSetupComplete;
      case "guide":
        return isGuideComplete;
      case "interviews":
        return hasCompletedSessions;
      case "insights":
        return false; // last step
      default:
        return false;
    }
  }

  function nextLabel(): string {
    switch (activeStep) {
      case "setup":
        return "Continue to Guide";
      case "guide":
        return "Continue to Interviews";
      case "interviews":
        return "Continue to Insights";
      default:
        return "Continue";
    }
  }

  const currentIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);
  const isFirstStep = currentIndex === 0;

  // Title save with debounce
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    };
  }, []);

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
      titleTimeoutRef.current = setTimeout(async () => {
        if (newTitle.trim()) {
          const result = await updateStudyTitle(studyId, newTitle);
          if (result?.error) {
            toast.error(result.error);
          }
        }
      }, 1000);
    },
    [studyId]
  );

  return (
    <div className="space-y-6">
      {/* Title + Stepper row */}
      <div className="space-y-6">
        {/* Editable title */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Study title
            </label>
            <span className="text-xs font-semibold text-destructive">*</span>
          </div>
          <div className="flex items-center gap-2 group rounded-xl border border-border/70 bg-card px-3 py-2.5 shadow-[var(--shadow-soft)]">
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Enter a clear study title (required)"
            autoFocus={!studyTitle || studyTitle === "Untitled Study"}
            className={cn(
              "flex-1 border-0 bg-transparent text-xl font-semibold tracking-tight focus-visible:outline-none",
              title.trim()
                ? "text-foreground"
                : "text-foreground/65 placeholder:text-foreground/45"
            )}
          />
          <Pencil className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
        </div>
          <p className="text-[11px] text-muted-foreground">
            Required. Use a short, specific title so teammates can quickly understand this study.
          </p>
        </div>

        {/* Stepper */}
        <StudyFlowStepper
          activeStep={activeStep}
          completedSteps={completedSteps}
          canEnterStep={canEnterStep}
          onStepClick={goToStep}
          isInterviewsRunning={interviewsRunning}
          interviewProgress={
            interviewsRunning
              ? `${effectiveInterviewCompleted}/${totalCount}`
              : undefined
          }
        />
      </div>

      {/* Step Content with AnimatePresence transitions */}
      <div className="min-h-[400px] relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            id="study-step-panel"
            key={activeStep}
            custom={direction}
            variants={reduced ? undefined : stepVariants}
            initial={reduced ? false : "enter"}
            animate={reduced ? undefined : "center"}
            exit={reduced ? { opacity: 0 } : "exit"}
            transition={reduced ? { duration: 0 } : {
              x: { type: "spring", stiffness: 300, damping: 25 },
              opacity: { duration: 0.2 },
            }}
          >
            {activeStep === "setup" && (
              <FlowStepSetup
                studyId={studyId}
                title={title}
                onTitleChange={setTitle}
                studyType={studyType}
                onStudyTypeChange={setStudyType}
                objective={objective}
                onObjectiveChange={setObjective}
                availableGroups={availableGroups}
                selectedGroupIds={selectedGroupIds}
                onGroupToggle={handleGroupToggle}
                orgContext={orgContext}
              />
            )}

            {activeStep === "guide" && (
              <FlowStepGuide
                studyId={studyId}
                studyType={studyType}
                title={title}
                objective={objective}
                selectedGroupNames={selectedGroupNames}
                selectedGroups={selectedGroupsForPreview}
                totalPersonas={totalPersonas}
                orgContext={orgContext}
                guide={guide}
                onGuideChange={setGuide}
                onGoToSetup={() => goToStep("setup")}
              />
            )}

                       {activeStep === "interviews" && (
              <FlowStepInterviews
                studyId={studyId}
                studyTitle={title}
                interviewGuide={guide || null}
                personasByGroup={personasByGroup}
                personaSessionMap={personaSessionMap}
                pendingCount={pendingCount}
                completedCount={completedCount}
                totalCount={totalCount}
                onComplete={handleInterviewsComplete}
                onRunningChange={setInterviewsRunning}
                onGoToInsights={() => goToStep("insights")}
                onLiveInterviewCompleted={handleLiveInterviewCompleted}
              />
            )}

            {activeStep === "insights" && (
              <FlowStepInsights
                studyId={studyId}
                completedCount={effectiveInterviewCompleted}
                totalCount={totalCount}
                avgDurationMs={avgDurationMs}
                reports={analysisReports}
                onReportGenerated={handleReportGenerated}
                onGoToInterviews={() => goToStep("interviews")}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {/* Sticky Navigation */}
        <StepNavigation
          activeStep={activeStep}
          canGoNext={canGoNext()}
          canGoBack={!isFirstStep}
          onNext={goNext}
          onBack={goBack}
          nextLabel={nextLabel()}
        />
      </div>
    </div>
  );
}
