"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  key: string;
  label: string;
  detail?: string;
}

interface InsightsProgressProps {
  steps: ProgressStep[];
  currentStep: string | null;
  completedSteps: Set<string>;
  stepDetails: Record<string, string>;
}

export function InsightsProgress({
  steps,
  currentStep,
  completedSteps,
  stepDetails,
}: InsightsProgressProps) {
  return (
    <div className="space-y-3">
      {steps.map((step) => {
        const isCompleted = completedSteps.has(step.key);
        const isActive = currentStep === step.key;
        const detail = stepDetails[step.key];

        return (
          <div
            key={step.key}
            className={cn(
              "flex items-start gap-3 transition-all duration-300",
              isCompleted
                ? "text-green-600"
                : isActive
                  ? "text-foreground"
                  : "text-muted-foreground/30"
            )}
          >
            <div className="mt-0.5 shrink-0">
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 animate-scale-in" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-sm",
                  isActive && "font-medium",
                  isCompleted && "font-medium"
                )}
              >
                {step.label}
              </p>
              {detail && (
                <p className="text-xs text-muted-foreground mt-0.5 animate-fade-in-up">
                  {detail}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
