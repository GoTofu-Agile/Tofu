"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FlowStep } from "./study-flow-stepper";
import { FLOW_STEPS } from "./study-flow-stepper";

const STEP_HINTS: Record<string, string> = {
  setup: "Next: generate your interview guide",
  guide: "Next: run interviews",
  interviews: "Next: generate insights",
};

const STEP_BLOCKERS: Record<string, string> = {
  setup: "Select at least one persona group to continue.",
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
  const currentIndex = FLOW_STEPS.findIndex((s) => s.key === activeStep);
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === FLOW_STEPS.length - 1;
  const hint = canGoNext ? STEP_HINTS[activeStep] : STEP_BLOCKERS[activeStep];

  return (
    <div className="sticky bottom-0 z-10 bg-background border-t py-3">
      <div className="flex items-center justify-between">
        {!isFirst && canGoBack ? (
          <motion.button
            onClick={onBack}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.97 }}
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
              whileHover={canGoNext ? { scale: 1.03, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" } : undefined}
              whileTap={canGoNext ? { scale: 0.97 } : undefined}
              animate={canGoNext ? { scale: [0.98, 1] } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                canGoNext
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-foreground/40 text-background/60 cursor-not-allowed"
              )}
            >
              {nextLabel || "Continue"}
              <motion.span
                animate={canGoNext ? { x: [0, 4, 0] } : { x: 0 }}
                transition={canGoNext ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : {}}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.span>
            </motion.button>
            <AnimatePresence mode="wait">
              {hint && (
                <motion.span
                  key={hint}
                  initial={{ opacity: 0, y: -4 }}
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
