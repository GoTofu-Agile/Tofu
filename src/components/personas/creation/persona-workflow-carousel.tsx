"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Globe,
  Loader2,
  Search,
  Smartphone,
  Star,
} from "lucide-react";
import type {
  WorkflowSourceKind,
  WorkflowSourceRow,
  WorkflowStepView,
} from "./persona-workflow-types";

interface PersonaPreviewCard {
  name: string;
  age?: string;
  role?: string;
  goals?: string[];
  frustrations?: string[];
  behaviors?: string[];
}

interface PersonaWorkflowCarouselProps {
  steps: WorkflowStepView[];
  done: boolean;
  personaPreview?: PersonaPreviewCard;
}

type ActiveStep = {
  id: string;
  title: string;
  status: WorkflowStepView["status"];
  sources: WorkflowSourceRow[];
  findings: string[];
  startTime: number;
  elapsed: number;
  revealedSources: number;
  revealedFindings: number;
  done: boolean;
};

function sourceIcon(kind: WorkflowSourceKind) {
  if (kind === "appStore") return <Star className="h-3.5 w-3.5" />;
  if (kind === "playStore") return <Smartphone className="h-3.5 w-3.5" />;
  if (kind === "webSearch") return <Search className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
}

function SourceBadge({ source }: { source: WorkflowSourceRow }) {
  if (source.status === "loading") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
        {source.badge ?? "Loading"}
      </span>
    );
  }
  if (source.status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] text-green-700">
        <Check className="h-2.5 w-2.5" />
        {source.badge ?? "Done"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground">
      {source.badge ?? "Skipped"}
    </span>
  );
}

export function PersonaWorkflowCarousel({
  steps,
  done,
  personaPreview,
}: PersonaWorkflowCarouselProps) {
  const [activeSteps, setActiveSteps] = useState<ActiveStep[]>([]);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const seenStepIdsRef = useRef<Set<string>>(new Set());

  const isRunning = useMemo(
    () => steps.some((step) => step.status === "active"),
    [steps]
  );

  const generatedCount = useMemo(() => {
    const doneStep = steps.find((step) => step.id === "wf-done");
    const doneText = doneStep?.findings?.[0] ?? "";
    const match = doneText.match(/Generated\s+(\d+)\s+personas?/i);
    return match ? Number(match[1]) : 1;
  }, [steps]);

  const syncFromWorkflowSteps = useCallback(() => {
    const now = Date.now();
    setActiveSteps((prev) => {
      const byId = new Map(prev.map((item) => [item.id, item]));
      const updated: ActiveStep[] = prev.map((item) => {
        const step = steps.find((candidate) => candidate.id === item.id);
        if (!step) return item;

        const elapsedSec = Math.floor((now - item.startTime) / 1000);
        const isDone = step.status === "done";
        const revealedSources = isDone
          ? step.sources.length
          : step.status === "active"
            ? Math.min(step.sources.length, Math.floor((now - item.startTime) / 400))
            : item.revealedSources;
        const revealedFindings = isDone
          ? step.findings.length
          : step.status === "active"
            ? Math.min(
                step.findings.length,
                Math.floor(Math.max(0, now - item.startTime - step.sources.length * 400) / 600)
              )
            : item.revealedFindings;

        return {
          ...item,
          title: step.title,
          status: step.status,
          sources: step.sources,
          findings: step.findings,
          elapsed: isDone ? item.elapsed || elapsedSec : elapsedSec,
          revealedSources,
          revealedFindings,
          done: isDone,
        };
      });

      const next = [...updated];
      for (const step of steps) {
        const shouldShow =
          step.status === "active" ||
          step.status === "done" ||
          seenStepIdsRef.current.has(step.id);
        if (!shouldShow || byId.has(step.id)) continue;

        seenStepIdsRef.current.add(step.id);
        next.push({
          id: step.id,
          title: step.title,
          status: step.status,
          sources: step.sources,
          findings: step.findings,
          startTime: now,
          elapsed: 0,
          revealedSources: 0,
          revealedFindings: 0,
          done: step.status === "done",
        });
      }
      return next;
    });
  }, [steps]);

  useEffect(() => {
    syncFromWorkflowSteps();
  }, [syncFromWorkflowSteps]);

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => {
      syncFromWorkflowSteps();
    }, 100);
    return () => window.clearInterval(id);
  }, [isRunning, syncFromWorkflowSteps]);

  useEffect(() => {
    if (!streamRef.current) return;
    const id = window.requestAnimationFrame(() => {
      const el = streamRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
    return () => window.cancelAnimationFrame(id);
  }, [activeSteps, done]);

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border bg-card">
        <div
          ref={streamRef}
          className="max-h-[68vh] min-h-[68vh] overflow-y-auto px-4 py-5 sm:px-6"
        >
          <div className="space-y-3 pb-5">
            <AnimatePresence initial={false}>
              {activeSteps.map((active) => {
                return (
                  <motion.div
                    key={active.id}
                    initial={{ opacity: 0, y: 20, x: 0 }}
                    animate={{
                      opacity: active.status === "active" ? 1 : active.done ? 0.78 : 0.58,
                      y: 0,
                      x: 0,
                    }}
                    exit={{ opacity: 0, y: 10, x: 0 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="rounded-xl border bg-background/35 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <StepIcon active={active.status === "active"} />
                      <p className="font-medium text-foreground">
                        {active.title} <span className="text-muted-foreground">· {active.elapsed}s</span>
                      </p>
                    </div>

                    <div className="space-y-1.5 pl-6">
                      {active.sources.slice(0, active.revealedSources).map((source, sourceIndex) => (
                        <motion.div
                          key={source.id}
                          initial={{ opacity: 0, y: 10, x: 0 }}
                          animate={{ opacity: 1, y: 0, x: 0 }}
                          transition={{ delay: sourceIndex * 0.05, duration: 0.2, ease: "easeOut" }}
                          className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground"
                        >
                          <span className="text-muted-foreground/80">{sourceIcon(source.kind)}</span>
                          <span className="truncate font-mono italic">{source.label}</span>
                          <span className="ml-auto shrink-0">
                            <SourceBadge source={source} />
                          </span>
                        </motion.div>
                      ))}

                      {active.findings
                        .slice(0, active.revealedFindings)
                        .map((finding, findingIndex) => (
                        <motion.p
                          key={`${active.id}-finding-${findingIndex}`}
                          initial={{ opacity: 0, y: 10, x: 0 }}
                          animate={{ opacity: 1, y: 0, x: 0 }}
                          transition={{ delay: findingIndex * 0.05, duration: 0.2, ease: "easeOut" }}
                          className="text-sm leading-6 text-foreground"
                        >
                          • {finding}
                        </motion.p>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {activeSteps.length === 0 && !isRunning && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground"
              >
                <div className="mx-auto mb-3 h-2 max-w-[200px] overflow-hidden rounded-full bg-muted">
                  <span className="block h-full w-full animate-shimmer opacity-60" />
                </div>
                <p className="animate-pulse">Preparing workflow…</p>
              </motion.div>
            )}
            <AnimatePresence>
              {done ? (
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ type: "spring", stiffness: 260, damping: 25 }}
                  className="rounded-2xl border bg-card p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-foreground">
                      {(personaPreview?.name ?? "New Persona")
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-foreground">
                        {personaPreview?.name ?? "Generated Persona"}
                        {personaPreview?.age ? ` · ${personaPreview.age}` : ""}
                        {personaPreview?.role ? ` · ${personaPreview.role}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {generatedCount > 1
                          ? `Persona group created · ${generatedCount} personas`
                          : "Single persona created"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] text-muted-foreground">
                          <Star className="h-3 w-3" />
                          App Store reviews
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] text-muted-foreground">
                          <Smartphone className="h-3 w-3" />
                          Play Store reviews
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(personaPreview?.goals ?? [
                          "Streamline daily workflow",
                          "Reduce context switching",
                        ]).map((goal) => (
                          <span
                            key={goal}
                            className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300"
                          >
                            {goal}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(personaPreview?.frustrations ?? [
                          "Steep learning curve",
                          "Missing integrations",
                        ]).map((frustration) => (
                          <span
                            key={frustration}
                            className="rounded-full bg-rose-500/10 px-2 py-1 text-xs text-rose-700 dark:text-rose-300"
                          >
                            {frustration}
                          </span>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(personaPreview?.behaviors ?? [
                          "Mobile-first",
                          "Posts product reviews",
                        ]).map((behavior) => (
                          <span
                            key={behavior}
                            className="rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-700 dark:text-sky-300"
                          >
                            {behavior}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
          <div className="pointer-events-none sticky bottom-0 z-10 -mx-6 h-14 bg-gradient-to-t from-card via-card/80 to-transparent" />
        </div>
      </div>
    </div>
  );
}

function StepIcon({ active }: { active: boolean }) {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
      {active ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : (
        <span className="text-xs leading-none text-muted-foreground">⠿</span>
      )}
    </span>
  );
}

