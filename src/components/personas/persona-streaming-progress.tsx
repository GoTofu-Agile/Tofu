"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Search, Sparkles, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { PulsingDots } from "@/components/motion/persona-creation-motion";
import { getPersonaProgressStepCopy } from "@/lib/personas/progress-copy";

export type CreationProgressPhase = "researching" | "generating" | "done";

interface PersonaStreamingProgressProps {
  phase: CreationProgressPhase;
  genCompleted: number;
  genTotal: number;
  currentName?: string;
  researchLabel?: string;
  className?: string;
}

const steps = [
  { id: "research", label: "Gather signals", icon: Search },
  { id: "generate", label: "Build personas", icon: Sparkles },
  { id: "quality", label: "Score quality", icon: Shield },
] as const;

function stepState(
  phase: CreationProgressPhase,
  index: number
): "pending" | "active" | "done" {
  if (phase === "done") return "done";
  if (phase === "researching") {
    if (index === 0) return "active";
    return "pending";
  }
  if (phase === "generating") {
    if (index === 0) return "done";
    if (index === 1) return "active";
    return "pending";
  }
  return "pending";
}

export function PersonaStreamingProgress({
  phase,
  genCompleted,
  genTotal,
  currentName,
  researchLabel,
  className,
}: PersonaStreamingProgressProps) {
  const reduced = useReducedMotion();
  const showBar = phase !== "done" || genTotal > 0;
  const stepCopy = getPersonaProgressStepCopy({
    phase,
    researchLabel,
    genCompleted,
    genTotal,
  });

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {steps.map((s, i) => {
          const state = stepState(phase, i);
          const Icon = s.icon;
          return (
            <motion.div
              key={s.id}
              layout
              className="flex min-w-0 flex-1 items-center gap-2"
              initial={false}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
            >
              <motion.div
                layout
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl border text-muted-foreground transition-colors",
                  state === "done" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
                  state === "active" &&
                    "border-primary/40 bg-primary/5 text-primary shadow-[0_0_0_3px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_3px_rgba(255,255,255,0.06)]",
                  state === "pending" && "opacity-60"
                )}
              >
                {state === "active" ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : state === "done" ? (
                  <motion.span
                    initial={reduced ? false : { scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  >
                    <Check className="size-4" aria-hidden />
                  </motion.span>
                ) : (
                  <Icon className="size-4 opacity-70" aria-hidden />
                )}
              </motion.div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {s.label}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {s.id === "research" && state === "done" ? (
                    stepCopy.research
                  ) : s.id === "research" && phase === "researching" ? (
                    researchLabel ? (
                      stepCopy.research
                    ) : (
                      <PulsingDots label="In progress" />
                    )
                  ) : s.id === "generate" && phase === "generating" ? (
                    genTotal > 0 ? (
                      stepCopy.generate
                    ) : (
                      <PulsingDots label={stepCopy.generate} />
                    )
                  ) : s.id === "generate" && phase === "done" ? (
                    stepCopy.generate
                  ) : s.id === "quality" && phase === "done" ? (
                    stepCopy.quality
                  ) : (
                    "\u00a0"
                  )}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {phase === "generating" && currentName ? (
          <motion.div
            key={currentName}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
            transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
            className="mt-4 rounded-xl border border-dashed border-primary/25 bg-primary/[0.03] px-3 py-2.5"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Now generating
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {currentName}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {showBar && genTotal > 0 && phase !== "researching" ? (
        <div className="mt-4">
          <div
            className="relative h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={genCompleted}
            aria-valuemin={0}
            aria-valuemax={genTotal}
            aria-label="Personas generated"
          >
            <motion.div
              className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-primary/80 to-primary"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, (genCompleted / Math.max(1, genTotal)) * 100)}%`,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            >
              {!reduced ? (
                <span
                  className="pointer-events-none absolute inset-0 opacity-40 progress-shimmer"
                  aria-hidden
                />
              ) : null}
            </motion.div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
