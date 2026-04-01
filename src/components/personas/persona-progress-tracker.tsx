"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  loadPersonaEngagement,
  milestoneLabel,
  nextMilestoneAfter,
  PERSONA_ENGAGEMENT_STORAGE_KEY,
  type PersonaEngagementState,
} from "@/lib/personas/persona-engagement";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

type Variant = "compact" | "full";

export function PersonaProgressTracker({
  variant = "full",
  /** Server: workspace persona count for quality tier messaging. */
  workspacePersonaCount,
  workspaceTierLabel,
  className,
}: {
  variant?: Variant;
  workspacePersonaCount?: number;
  workspaceTierLabel?: string;
  className?: string;
}) {
  const [state, setState] = useState<PersonaEngagementState | null>(null);

  useEffect(() => {
    setState(loadPersonaEngagement());
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key === PERSONA_ENGAGEMENT_STORAGE_KEY) {
        setState(loadPersonaEngagement());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (!state) return null;

  const next = nextMilestoneAfter(state.lifetimeGenerated);
  const progress =
    next != null
      ? Math.min(100, (state.lifetimeGenerated / next) * 100)
      : 100;

  if (variant === "compact") {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-3 py-2 text-xs">
          <Sparkles className="size-3.5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{state.lifetimeGenerated}</span> personas
            {next != null ? (
              <>
                {" "}
                · next: <span className="text-foreground">{milestoneLabel(next)}</span>
              </>
            ) : (
              " · milestones complete"
            )}
          </span>
          {next != null ? (
            <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary/80"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 22 }}
              />
            </div>
          ) : null}
        </div>
        {workspaceTierLabel != null && workspacePersonaCount != null ? (
          <p className="text-[10px] leading-snug text-muted-foreground">
            Workspace model tier: <span className="font-medium text-foreground">{workspaceTierLabel}</span>
            {" · "}
            {workspacePersonaCount} personas in workspace
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border bg-gradient-to-br from-primary/[0.06] to-transparent p-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Your momentum</p>
        <span className="text-xs text-muted-foreground">
          {state.sessionGenerated} this session
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {next != null ? (
          <>
            {state.lifetimeGenerated} of {next} toward{" "}
            <span className="font-medium text-foreground">{milestoneLabel(next)}</span>
          </>
        ) : (
          <>You&apos;ve passed every starter milestone — keep building your library.</>
        )}
      </p>
      {workspaceTierLabel != null && workspacePersonaCount != null ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Generation quality for this workspace:{" "}
          <span className="font-medium text-foreground">{workspaceTierLabel}</span> ({workspacePersonaCount}{" "}
          personas)
        </p>
      ) : null}
      {next != null ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 20 }}
          />
        </div>
      ) : null}
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Personas get more useful as you add contrasts: skeptics, power users, and edge cases.
      </p>
    </section>
  );
}
