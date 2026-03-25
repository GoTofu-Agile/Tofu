"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlowStep = "setup" | "guide" | "interviews" | "insights";

export const FLOW_STEPS: { key: FlowStep; label: string }[] = [
  { key: "setup", label: "Setup" },
  { key: "guide", label: "Interview Guide" },
  { key: "interviews", label: "Interviews" },
  { key: "insights", label: "Insights" },
];

interface StudyFlowStepperProps {
  activeStep: FlowStep;
  completedSteps: Set<FlowStep>;
  canEnterStep: (step: FlowStep) => boolean;
  onStepClick: (step: FlowStep) => void;
  isInterviewsRunning?: boolean;
  interviewProgress?: string;
}

export function StudyFlowStepper({
  activeStep,
  completedSteps,
  canEnterStep,
  onStepClick,
  isInterviewsRunning,
  interviewProgress,
}: StudyFlowStepperProps) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {FLOW_STEPS.map((s, i) => {
        const isCompleted = completedSteps.has(s.key);
        const isActive = activeStep === s.key;
        const canEnter = canEnterStep(s.key);
        const isInterviewStep =
          s.key === "interviews" && isInterviewsRunning;
        const prevCompleted = i > 0 && completedSteps.has(FLOW_STEPS[i - 1].key);

        return (
          <div key={s.key} className="flex items-center">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-8 mx-1 transition-all duration-500",
                  prevCompleted
                    ? "bg-foreground animate-line-fill"
                    : "bg-border"
                )}
              />
            )}
            <button
              onClick={() => canEnter && onStepClick(s.key)}
              disabled={!canEnter}
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
                isActive
                  ? "bg-foreground text-background shadow-[0_0_0_3px_rgba(0,0,0,0.05)]"
                  : isCompleted
                    ? "bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                    : canEnter
                      ? "bg-stone-50 text-stone-500 hover:bg-stone-100 cursor-pointer"
                      : "bg-stone-50 text-stone-300 cursor-not-allowed"
              )}
            >
              {isCompleted && !isActive && (
                <CheckCircle2 className="h-3.5 w-3.5 animate-scale-in" />
              )}
              {isInterviewStep && !isActive && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {s.label}
              {isInterviewStep && interviewProgress && (
                <span className="text-[10px] opacity-70">
                  {interviewProgress}
                </span>
              )}
              {/* Mini progress bar for running interviews */}
              {isInterviewStep && !isActive && interviewProgress && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground/40 transition-all duration-500"
                    style={{
                      width: (() => {
                        const parts = interviewProgress.split("/");
                        if (parts.length === 2) {
                          const pct =
                            (parseInt(parts[0]) / parseInt(parts[1])) * 100;
                          return `${pct}%`;
                        }
                        return "0%";
                      })(),
                    }}
                  />
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
