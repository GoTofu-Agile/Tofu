"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion, safeSpring } from "@/lib/hooks/use-reduced-motion";

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
  const reduced = useReducedMotion();
  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const isCompleted = completedSteps.has(step.key);
        const isActive = currentStep === step.key;
        const detail = stepDetails[step.key];

        return (
          <motion.div
            key={step.key}
            initial={reduced ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduced ? { duration: 0 } : { delay: i * 0.1, type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "flex items-start gap-3 transition-colors duration-300",
              isCompleted
                ? "text-green-600"
                : isActive
                  ? "text-foreground"
                  : "text-muted-foreground/30"
            )}
          >
            <div className="mt-0.5 shrink-0">
              <AnimatePresence mode="wait">
                {isCompleted ? (
                  <motion.div
                    key="check"
                    initial={reduced ? false : { scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={safeSpring(500, 20, reduced)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </motion.div>
                ) : isActive ? (
                  <motion.div
                    key="loading"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="circle"
                    animate={reduced ? undefined : { opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Circle className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="min-w-0">
              <motion.p
                animate={isActive ? { opacity: 1 } : {}}
                className={cn(
                  "text-sm",
                  isActive && "font-medium animate-pulse",
                  isCompleted && "font-medium"
                )}
              >
                {step.label}
              </motion.p>
              <AnimatePresence>
                {detail && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-xs text-muted-foreground mt-0.5"
                  >
                    {detail}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
