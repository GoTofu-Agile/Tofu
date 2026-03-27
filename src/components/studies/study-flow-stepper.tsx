"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion, safeSpring } from "@/lib/hooks/use-reduced-motion";

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
  const reduced = useReducedMotion();

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {FLOW_STEPS.map((s, i) => {
        const isCompleted = completedSteps.has(s.key);
        const isActive = activeStep === s.key;
        const canEnter = canEnterStep(s.key);
        const isInterviewStep =
          s.key === "interviews" && isInterviewsRunning;
        const prevCompleted = i > 0 && completedSteps.has(FLOW_STEPS[i - 1].key);

        // Parse progress for counter animation
        let completedNum = 0;
        let totalNum = 0;
        if (interviewProgress) {
          const parts = interviewProgress.split("/");
          if (parts.length === 2) {
            completedNum = parseInt(parts[0]);
            totalNum = parseInt(parts[1]);
          }
        }

        return (
          <div key={s.key} className="flex items-center">
            {i > 0 && (
              <motion.div
                className={cn(
                  "h-px w-6 sm:w-8 mx-1",
                  prevCompleted ? "bg-foreground" : "bg-border"
                )}
                key={`connector-${s.key}-${prevCompleted}`}
                initial={prevCompleted && !reduced ? { scaleX: 0 } : { scaleX: 1 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: reduced ? 0 : 0.5, ease: "easeOut" }}
                style={{ transformOrigin: "left" }}
              />
            )}
            <motion.button
              onClick={() => canEnter && onStepClick(s.key)}
              disabled={!canEnter}
              whileHover={canEnter && !reduced ? { scale: 1.05, y: -1 } : undefined}
              whileTap={canEnter && !reduced ? { scale: 0.97 } : undefined}
              animate={isActive && !reduced ? { scale: [0.95, 1.05, 1] } : { scale: 1 }}
              transition={isActive
                ? { duration: 0.3, ease: "easeOut" }
                : safeSpring(400, 17, reduced)
              }
              className={cn(
                "relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200",
                isActive
                  ? cn(
                      "bg-foreground text-background",
                      !reduced && "animate-active-glow"
                    )
                  : isCompleted
                    ? "bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                    : canEnter
                      ? "bg-stone-50 text-stone-500 hover:bg-stone-100 cursor-pointer"
                      : "bg-stone-50 text-stone-300 cursor-not-allowed"
              )}
            >
              {isCompleted && !isActive && (
                <motion.span
                  initial={reduced ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={safeSpring(500, 20, reduced)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </motion.span>
              )}
              {isInterviewStep && !isActive && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              {s.label}
              {/* Animated interview counter */}
              {isInterviewStep && interviewProgress && (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={completedNum}
                    initial={reduced ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: 6 }}
                    transition={{ duration: reduced ? 0 : 0.15 }}
                    className="text-[10px] opacity-70 tabular-nums"
                  >
                    {completedNum}/{totalNum}
                  </motion.span>
                </AnimatePresence>
              )}
              {/* Mini progress bar for running interviews */}
              {isInterviewStep && !isActive && interviewProgress && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-foreground/40"
                    initial={{ width: "0%" }}
                    animate={{
                      width: totalNum > 0 ? `${(completedNum / totalNum) * 100}%` : "0%",
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              )}
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}
