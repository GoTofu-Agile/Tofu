"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Mail, Maximize2, Sparkles, X } from "lucide-react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { useAssistant } from "@/components/assistant/assistant-provider";
import {
  getPersonaProgressBadgeLabel,
  getPersonaProgressHeadline,
} from "@/lib/personas/progress-copy";
import { PERSONA_WIDGET_STORAGE_KEY as WIDGET_STORAGE_KEY } from "@/lib/personas/publish-widget-run";

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

  if (!run) return null;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: reduced ? 0 : 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        // When the Ask-panel is open on desktop, shift the widget left so it isn't covered by
        // the panel (which sits at right-0, w-[23rem], z-[100]). On mobile the panel is full-screen
        // so we keep the widget tucked to the right and let it live behind it.
        "fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-50 w-[min(24rem,calc(100vw-1.5rem))] rounded-2xl border bg-card/95 p-3.5 shadow-xl backdrop-blur-md transition-[right] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        panelOpen ? "right-3 sm:right-[24rem]" : "right-3 sm:right-4"
      )}
      role="status"
      aria-live="polite"
      aria-label="Persona generation progress"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-1.5">
            {run.phase === "done" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            ) : run.phase === "error" ? (
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
            )}
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Persona generation
            </p>
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                run.phase === "error"
                  ? "border-destructive/20 bg-destructive/5 text-destructive"
                  : "border-primary/20 bg-primary/5 text-primary"
              )}
            >
              {phaseLabel}
            </span>
          </div>
          <p className="truncate text-sm font-medium text-foreground">
            {getPersonaProgressHeadline({
              phase: run.phase,
              currentName: run.currentName,
            })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/personas/${run.groupId}?welcome=1`}>
            <Button type="button" variant="outline" size="sm" aria-label="Open generation page">
              <Maximize2 className="mr-1 h-3.5 w-3.5" />
              Open
            </Button>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              const dismissed = { ...run, dismissed: true, updatedAt: Date.now() };
              writeRun(dismissed);
              setRun(null);
            }}
            aria-label="Dismiss generation widget"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.max(0, progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Persona generation completion"
      >
        <motion.div
          className={cn(
            "relative h-full overflow-hidden rounded-full bg-gradient-to-r from-primary/80 to-primary"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20, mass: 0.6 }}
        >
          {!reduced ? (
            <span className="pointer-events-none absolute inset-0 opacity-40 progress-shimmer" aria-hidden />
          ) : null}
        </motion.div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {run.total > 0 ? `${run.completed}/${run.total} personas` : "Preparing"}
        </span>
        <span>{progressPercent}%</span>
      </div>
      {run.message ? (
        <p className="mt-1 text-[11px] text-muted-foreground">{run.message}</p>
      ) : null}
      {notifyEnabled && run.phase !== "done" && run.phase !== "error" ? (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground/70">
          <Mail className="h-3 w-3 shrink-0" aria-hidden />
          We&apos;ll email you when it&apos;s done.
        </p>
      ) : null}
    </motion.div>
  );
}
