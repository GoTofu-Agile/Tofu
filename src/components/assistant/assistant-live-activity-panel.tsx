"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, Sparkles, X } from "lucide-react";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { cn } from "@/lib/utils";
import { PERSONA_WIDGET_STORAGE_KEY } from "@/lib/personas/publish-widget-run";

type WidgetRun = {
  runId: string;
  groupId: string;
  phase: "starting" | "researching" | "generating" | "done" | "error";
  completed: number;
  total: number;
  currentName: string | null;
  message: string | null;
  dismissed?: boolean;
};

type StepStatus = "pending" | "running" | "done";

function statusForIndex(index: number, activeIndex: number, isDone: boolean): StepStatus {
  if (isDone) return "done";
  if (index < activeIndex) return "done";
  if (index === activeIndex) return "running";
  return "pending";
}

export function AssistantLiveActivityPanel() {
  const { autopilot, isOpen } = useAssistant();
  const [widgetRun, setWidgetRun] = useState<WidgetRun | null>(null);
  const [dismissedActivityKey, setDismissedActivityKey] = useState<string | null>(null);
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);

  useEffect(() => {
    const read = () => {
      try {
        const raw = window.localStorage.getItem(PERSONA_WIDGET_STORAGE_KEY);
        if (!raw) {
          setWidgetRun(null);
          return;
        }
        const parsed = JSON.parse(raw) as WidgetRun;
        if (parsed.dismissed) {
          setWidgetRun(null);
          return;
        }
        setWidgetRun(parsed);
      } catch {
        setWidgetRun(null);
      }
    };
    read();
    window.addEventListener("storage", read);
    window.addEventListener("persona-generation-widget-update", read);
    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("persona-generation-widget-update", read);
    };
  }, []);

  useEffect(() => {
    const onModalOpen = (event: Event) => {
      const custom = event as CustomEvent<{ open?: boolean }>;
      setAssistantModalOpen(Boolean(custom.detail?.open));
    };
    window.addEventListener("assistant:modal-open", onModalOpen);
    return () => window.removeEventListener("assistant:modal-open", onModalOpen);
  }, []);

  const shouldShow =
    autopilot.active || (widgetRun && widgetRun.phase !== "done" && widgetRun.phase !== "error");
  const activityKey = `${autopilot.active ? "a" : "i"}:${autopilot.title}:${widgetRun?.runId ?? "none"}`;
  const hasProgress =
    (autopilot.progress?.total ?? 0) > 0 || (widgetRun?.total ?? 0) > 0;
  const total = autopilot.progress?.total ?? widgetRun?.total ?? 0;
  const completed = autopilot.progress?.completed ?? widgetRun?.completed ?? 0;
  const progressPercent = total > 0 ? Math.max(0, Math.min(100, Math.round((completed / total) * 100))) : 0;

  const steps = useMemo(() => {
    const isStudyFlow =
      autopilot.title.toLowerCase().includes("study") ||
      autopilot.detail?.toLowerCase().includes("study");
    const base = isStudyFlow
      ? [
          "Understanding request...",
          "Drafting study...",
          "Creating study...",
          "Finalizing output...",
        ]
      : [
          "Understanding request...",
          "Generating personas...",
          "Structuring attributes...",
          "Finalizing output...",
        ];
    let activeIndex = 0;
    if (autopilot.status === "done") activeIndex = base.length - 1;
    else if (autopilot.title.toLowerCase().includes("final")) activeIndex = 3;
    else if (isStudyFlow) {
      const detail = autopilot.detail?.toLowerCase() ?? "";
      if (detail.includes("draft")) activeIndex = 1;
      else if (detail.includes("creating")) activeIndex = 2;
      else if (detail.includes("final")) activeIndex = 3;
      else activeIndex = 0;
    }
    else if (hasProgress && total > 0 && completed > 0) {
      const ratio = completed / total;
      if (ratio >= 0.85) activeIndex = 3;
      else if (ratio >= 0.45) activeIndex = 2;
      else activeIndex = 1;
    } else if (
      autopilot.title.toLowerCase().includes("generat") ||
      widgetRun?.phase === "generating"
    ) {
      activeIndex = 1;
    } else if (widgetRun?.phase === "researching") {
      activeIndex = 0;
    }

    return base.map((label, index) => ({
      id: label,
      label,
      status: statusForIndex(index, activeIndex, autopilot.status === "done"),
    }));
  }, [autopilot.status, autopilot.title, autopilot.detail, completed, hasProgress, total, widgetRun?.phase]);

  return (
    <AnimatePresence>
      {shouldShow && dismissedActivityKey !== activityKey && !assistantModalOpen ? (
        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className={cn(
            "pointer-events-none fixed z-40 w-[min(25rem,calc(100vw-1.5rem))]",
            widgetRun && widgetRun.phase !== "done" && widgetRun.phase !== "error"
              ? "bottom-[10.75rem]"
              : "bottom-4",
            isOpen ? "right-3 sm:right-[24.5rem]" : "right-3 sm:right-4"
          )}
          aria-live="polite"
          aria-label="Live AI activity"
        >
          <div className="pointer-events-auto rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.08)] backdrop-blur-md">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  <Sparkles className="h-3.5 w-3.5 text-stone-500" />
                  AI Activity
                </p>
                <p className="mt-1 text-sm font-medium text-stone-900">
                  {autopilot.title || "Working in the background"}
                </p>
                {autopilot.detail ? (
                  <p className="mt-0.5 text-xs text-stone-600">{autopilot.detail}</p>
                ) : null}
              </div>
              {widgetRun ? (
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/personas/${widgetRun.groupId}${widgetRun.phase === "done" ? "?welcome=1" : `?runId=${widgetRun.runId}`}`}
                    className="rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
                  >
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDismissedActivityKey(activityKey)}
                    className="grid h-7 w-7 place-items-center rounded-md border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-800"
                    aria-label="Dismiss AI activity panel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setDismissedActivityKey(activityKey)}
                  className="grid h-7 w-7 place-items-center rounded-md border border-stone-200 bg-white text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-800"
                  aria-label="Dismiss AI activity panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {steps.map((step) => (
                <div key={step.id} className="flex items-center gap-2.5 text-sm">
                  {step.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : step.status === "running" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-stone-700" />
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

            {hasProgress ? (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                  <motion.div
                    className="h-full rounded-full bg-stone-900"
                    initial={{ width: 0 }}
                    animate={{ width: `${autopilot.status === "done" ? 100 : progressPercent}%` }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  {autopilot.status === "done"
                    ? `Completed ${total}/${total}`
                    : `${completed}/${total} completed`}
                </p>
              </div>
            ) : null}
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
