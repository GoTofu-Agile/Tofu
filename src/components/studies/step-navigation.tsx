"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion, safeSpring } from "@/lib/hooks/use-reduced-motion";
import type { FlowStep } from "./study-flow-stepper";
import { FLOW_STEPS } from "./study-flow-stepper";

const STEP_HINTS: Record<string, string> = {
  setup: "Next: generate your interview guide",
  guide: "Next: run interviews",
  interviews: "Next: generate insights",
};

const STEP_BLOCKERS: Record<string, string> = {
  setup: "Add a study title, choose a study type, and select at least one persona group.",
  guide: "Add at least one interview question to continue.",
  interviews: "Complete at least one interview to continue.",
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
  const reduced = useReducedMotion();
  const currentIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === FLOW_STEPS.length - 1;
  const hint = canGoNext ? STEP_HINTS[activeStep] : STEP_BLOCKERS[activeStep];

  return (
    <div
      className="sticky z-30 -mx-4 border-t bg-background px-4 py-3 sm:-mx-[var(--page-padding-x)] sm:px-[var(--page-padding-x)]"
      style={{ bottom: "calc(-1 * var(--page-padding-y))" }}
    >
      {/* Top gradient fade */}
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      <div className="flex items-center justify-between">
        {!isFirst && canGoBack ? (
          <motion.button
            onClick={onBack}
            whileHover={reduced ? undefined : { x: -3 }}
            whileTap={reduced ? undefined : { scale: 0.97 }}
            transition={safeSpring(400, 25, reduced)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </motion.button>
        ) : (
          <div />
        )}

        {!isLast && (
          <div className="flex flex-col items-end gap-1">
            <motion.button
              onClick={onNext}
              disabled={!canGoNext}
              whileHover={canGoNext && !reduced ? { scale: 1.03, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" } : undefined}
              whileTap={canGoNext && !reduced ? { scale: 0.97 } : undefined}
              animate={canGoNext && !reduced ? { scale: [0.98, 1] } : { scale: 1 }}
              transition={safeSpring(400, 17, reduced)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                canGoNext
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-foreground/40 text-background/60 cursor-not-allowed"
              )}
            >
              {nextLabel || "Continue"}
              <motion.span
                animate={canGoNext && !reduced ? { x: [0, 4, 0] } : { x: 0 }}
                transition={canGoNext ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : {}}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.span>
            </motion.button>
            <AnimatePresence mode="wait">
              {hint && (
                <motion.span
                  key={hint}
                  initial={reduced ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="text-[10px] text-muted-foreground/60"
                >
                  {hint}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
