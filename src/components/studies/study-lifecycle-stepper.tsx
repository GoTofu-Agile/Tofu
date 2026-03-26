"use client";

import { CheckCircle2 } from "lucide-react";

export type LifecycleStage = "setup" | "interviewing" | "analyzing" | "done";

const STAGES: { key: LifecycleStage; label: string }[] = [
  { key: "setup", label: "Setup" },
  { key: "interviewing", label: "Interviewing" },
  { key: "analyzing", label: "Analyzing" },
  { key: "done", label: "Done" },
];

interface StudyLifecycleStepperProps {
  stage: LifecycleStage;
}

export function StudyLifecycleStepper({ stage }: StudyLifecycleStepperProps) {
  const activeIndex = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="flex items-center gap-1">
      {STAGES.map((s, i) => {
        const isCompleted = i < activeIndex;
        const isActive = i === activeIndex;

        return (
          <div key={s.key} className="flex items-center">
            {i > 0 && <div className="h-px w-8 bg-border mx-1" />}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                isActive
                  ? "bg-foreground text-background"
                  : isCompleted
                    ? "bg-stone-100 text-stone-600"
                    : "bg-stone-50 text-stone-300"
              }`}
            >
              {isCompleted && <CheckCircle2 className="h-3.5 w-3.5" />}
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
