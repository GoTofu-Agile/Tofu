"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Mail, Sparkles, X } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { useAssistant } from "@/components/assistant/assistant-provider";
import {
  getPersonaProgressBadgeLabel,
  getPersonaProgressHeadline,
} from "@/lib/personas/progress-copy";
import { PERSONA_WIDGET_STORAGE_KEY as WIDGET_STORAGE_KEY } from "@/lib/personas/publish-widget-run";

type StepStatus = "pending" | "running" | "done";

function statusForIndex(index: number, activeIndex: number, isDone: boolean): StepStatus {
  if (isDone) return "done";
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "running";
  return "pending";
}

const PERSONA_STEPS = [
  "Understanding request...",
  "Generating personas...",
  "Structuring attributes...",
  "Finalizing output...",
] as const;

type WidgetRun = {
  runId: string;
  groupId: string;
  phase: "starting" | "researching" | "generating" | "done" | "error";
  completed: number;
  total: number;
  currentName: string | null;
  message: string | null;
  dismissed?: boolean;
  updatedAt: number;
};

function readRun(): WidgetRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WIDGET_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WidgetRun;
  } catch {
    return null;
  }
}

function writeRun(run: WidgetRun | null) {
  if (typeof window === "undefined") return;
  if (!run) {
    window.localStorage.removeItem(WIDGET_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(run));
}

export function PersonaGenerationFloatingWidget({ notifyEnabled = false }: { notifyEnabled?: boolean }) {
  const reduced = useReducedMotion();
  const { isOpen: panelOpen } = useAssistant();
  const [run, setRun] = useState<WidgetRun | null>(() => {
    const initial = readRun();
    return initial && !initial.dismissed ? initial : null;
  });

  useEffect(() => {
    const onStorage = () => {
      const next = readRun();
      setRun(next && !next.dismissed ? next : null);
    };
    const onCustom = () => onStorage();
    window.addEventListener("storage", onStorage);
    window.addEventListener("persona-generation-widget-update", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("persona-generation-widget-update", onCustom);
    };
  }, []);

  const runId = run?.runId;
  const runPhase = run?.phase;
  const pollEnabled =
    !!runId && runPhase !== "done" && runPhase !== "error";

  const { data: polled } = useQuery({
    queryKey: ["persona-generation-status", runId],
    enabled: pollEnabled,
    staleTime: 0,
    queryFn: async () => {
      const res = await fetch(
        `/api/personas/generation-status?runId=${encodeURIComponent(runId!)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("generation-status failed");
      return (await res.json()) as WidgetRun;
    },
    refetchInterval: (q) => {
      const p = q.state.data?.phase;
      if (p === "done" || p === "error") return false;
      return 2500;
    },
  });

  useEffect(() => {
    if (!polled || !runId) return;
    setRun((prev) => {
      if (!prev || prev.runId !== runId) return prev;
      const merged: WidgetRun = {
        ...prev,
        phase: polled.phase,
        completed: polled.completed,
        total: polled.total,
        currentName: polled.currentName,
        message: polled.message,
        updatedAt: Date.now(),
      };
      writeRun(merged);
      return merged;
    });
  }, [polled, runId]);

  const progressPercent = useMemo(() => {
    if (!run) return 0;
    if (run.phase === "done") return 100;
    if (run.total <= 0) return run.phase === "researching" ? 10 : 0;
    return Math.max(0, Math.min(100, Math.round((run.completed / run.total) * 100)));
  }, [run]);

  const phaseLabel = useMemo(
    () => (run ? getPersonaProgressBadgeLabel(run.phase) : "Starting"),
    [run]
  );

  const steps = useMemo(() => {
    if (!run) return [];
    const totalN = run.total;
    const completedN = run.completed;
    let activeIndex = 0;
    if (run.phase === "done") activeIndex = PERSONA_STEPS.length - 1;
    else if (run.phase === "starting") activeIndex = 0;
    else if (run.phase === "researching") activeIndex = 0;
    else if (run.phase === "generating") {
      if (totalN > 0 && completedN > 0) {
        const ratio = completedN / totalN;
        if (ratio >= 0.85) activeIndex = 3;
        else if (ratio >= 0.45) activeIndex = 2;
        else activeIndex = 1;
      } else activeIndex = 2;
    } else if (run.phase === "error") activeIndex = Math.min(2, PERSONA_STEPS.length - 1);

    return PERSONA_STEPS.map((label, index) => ({
      id: label,
      label,
      status: statusForIndex(index, activeIndex, run.phase === "done"),
    }));
  }, [run]);

  const hasProgress = (run?.total ?? 0) > 0;
  const progressCaption =
    run && hasProgress
      ? run.phase === "done"
        ? `Completed ${run.total}/${run.total}`
        : `${run.completed}/${run.total} completed`
      : null;

  if (!run) return null;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "pointer-events-none fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-50 w-[min(25rem,calc(100vw-1.5rem))] transition-[right] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        panelOpen ? "right-3 sm:right-[24.5rem]" : "right-3 sm:right-4"
      )}
      role="status"
      aria-live="polite"
      aria-label="Persona generation progress"
    >
      <div className="pointer-events-auto rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-stone-500" aria-hidden />
              <span>Persona generation</span>
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal",
                  run.phase === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : run.phase === "done"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 bg-stone-50 text-stone-600"
                )}
              >
                {phaseLabel}
              </span>
            </p>
            <p className="mt-1 truncate text-sm font-medium text-stone-900">
              {getPersonaProgressHeadline({
                phase: run.phase,
                currentName: run.currentName,
              })}
            </p>
            {run.message ? <p className="mt-0.5 text-xs text-stone-600">{run.message}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href={
                run.phase === "done"
                  ? `/personas/${run.groupId}?welcome=1`
                  : `/personas/${run.groupId}?runId=${run.runId}`
              }
              className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={() => {
                const dismissed = { ...run, dismissed: true, updatedAt: Date.now() };
                writeRun(dismissed);
                setRun(null);
              }}
              className="grid h-7 w-7 place-items-center rounded-md border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-800"
              aria-label="Dismiss generation widget"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2.5 text-sm">
              {step.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              ) : step.status === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin text-stone-700" aria-hidden />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              )}
              <span
                className={cn(
                  "transition-colors",
                  step.status === "pending" ? "text-stone-500" : "text-stone-800"
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100"
            role="progressbar"
            aria-valuenow={Math.max(0, progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Persona generation completion"
          >
            <motion.div
              className="h-full rounded-full bg-stone-900"
              initial={{ width: 0 }}
              animate={{ width: `${run.phase === "done" ? 100 : progressPercent}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-stone-500">
            <span>
              {progressCaption ??
                (run.phase === "researching" ? "Researching signals" : "Preparing")}
            </span>
            {run.phase !== "done" && run.phase !== "error" ? <span>{progressPercent}%</span> : null}
          </div>
        </div>

        {notifyEnabled && run.phase !== "done" && run.phase !== "error" ? (
          <p className="mt-2 flex items-center gap-1 text-[11px] text-stone-500">
            <Mail className="h-3 w-3 shrink-0" aria-hidden />
            We&apos;ll email you when it&apos;s done.
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
