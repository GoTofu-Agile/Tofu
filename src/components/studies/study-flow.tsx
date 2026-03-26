"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
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

  // Step state
  const [activeStep, setActiveStep] = useState<FlowStep>(initialStep);

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

  // Sync server props to client state after router.refresh()
  useEffect(() => {
    queueMicrotask(() => {
      setAnalysisReport(initialReport);
      setAnalysisReports(initialReports);
    });
  }, [initialReport, initialReports]);

  // Step completion checks
  const guideQuestions = guide.split("\n").map((l) => l.trim()).filter(Boolean);
  const isSetupComplete = studyType.length > 0 && selectedGroupIds.length > 0;
  const isGuideComplete = guideQuestions.length >= 1;
  const allInterviewsDone = completedCount >= totalCount && totalCount > 0;
  const hasCompletedSessions = completedCount > 0;
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

  function goToStep(step: FlowStep) {
    if (canEnterStep(step)) {
      setActiveStep(step);
    }
  }

  function goNext() {
    const currentIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);
    const nextStep = FLOW_STEPS[currentIndex + 1];
    if (nextStep && canEnterStep(nextStep.key)) {
      setActiveStep(nextStep.key);
    }
  }

  function goBack() {
    const currentIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);
    const prevStep = FLOW_STEPS[currentIndex - 1];
    if (prevStep) {
      setActiveStep(prevStep.key);
    }
  }

  function handleGroupToggle(groupId: string, add: boolean) {
    setSelectedGroupIds((prev) =>
      add ? [...prev, groupId] : prev.filter((id) => id !== groupId)
    );
  }

  function handleInterviewsComplete() {
    setInterviewsRunning(false);
    toast.success("All interviews completed!");
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
  function handleTitleChange(newTitle: string) {
    setTitle(newTitle);
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(async () => {
      if (newTitle.trim()) {
        await updateStudyTitle(studyId, newTitle);
      }
    }, 1000);
  }

  // Steps that handle their own right panel internally
  const stepHandlesOwnPanel = activeStep === "interviews" || activeStep === "insights";

  return (
    <div className="space-y-6">
      {/* Title + Stepper row */}
      <div className="space-y-6">
        {/* Editable title */}
        <div className="flex items-center gap-2 group">
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled Study"
            className={cn(
              "flex-1 border-0 bg-transparent text-2xl font-semibold tracking-tight focus-visible:outline-none",
              title.trim()
                ? "text-foreground"
                : "text-muted-foreground/40 placeholder:text-muted-foreground/40"
            )}
          />
          <Pencil className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/40 transition-colors shrink-0" />
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
              ? `${completedCount}/${totalCount}`
              : undefined
          }
        />
      </div>

      {/* Step Content — steps with own panels render full-width, others get the shared preview panel */}
      <div className="min-h-[400px]">
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
            onGoToSetup={() => setActiveStep("setup")}
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
            onGoToInsights={() => setActiveStep("insights")}
          />
        )}

        {activeStep === "insights" && (
          <FlowStepInsights
            studyId={studyId}
            completedCount={completedCount}
            totalCount={totalCount}
            avgDurationMs={avgDurationMs}
            reports={analysisReports}
            onReportGenerated={handleReportGenerated}
          />
        )}
      </div>

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
  );
}
