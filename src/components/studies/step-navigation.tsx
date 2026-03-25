"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FlowStep } from "./study-flow-stepper";
import { FLOW_STEPS } from "./study-flow-stepper";

const STEP_HINTS: Record<string, string> = {
  setup: "Your guide will be generated from your objective",
  guide: "Start interviewing your personas",
  interviews: "Analyze your interview data",
};

interface StepNavigationProps {
  activeStep: FlowStep;
  canGoNext: boolean;
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
}

export function StepNavigation({
  activeStep,
  canGoNext,
  canGoBack,
  onNext,
  onBack,
  nextLabel,
}: StepNavigationProps) {
  const currentIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === FLOW_STEPS.length - 1;
  const hint = STEP_HINTS[activeStep];

  return (
    <div className="sticky bottom-0 z-10 bg-background border-t py-3">
      <div className="flex items-center justify-between">
        {!isFirst && canGoBack ? (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        ) : (
          <div />
        )}

        {!isLast && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={onNext}
              disabled={!canGoNext}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                canGoNext
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-foreground/40 text-background/60 cursor-not-allowed"
              )}
            >
              {nextLabel || "Continue"}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            {hint && canGoNext && (
              <span className="text-[10px] text-muted-foreground/60">
                {hint}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
