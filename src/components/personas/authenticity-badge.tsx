"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

export type AuthenticityBand = "low" | "medium" | "high" | null | undefined;

interface AuthenticityBadgeProps {
  score: number | null | undefined;
  band?: AuthenticityBand;
  size?: "sm" | "md";
  className?: string;
  /** Short line shown in tooltip */
  summary?: string | null;
  /** When true, plays a one-shot highlight (e.g. high score). */
  celebrate?: boolean;
}

function bandStyles(band: AuthenticityBand) {
  if (band === "high") {
    return "border-emerald-200/80 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100";
  }
  if (band === "low") {
    return "border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100";
  }
  return "border-border/80 bg-muted/50 text-foreground";
}

function labelForBand(band: AuthenticityBand): string {
  if (band === "high") return "High authenticity";
  if (band === "low") return "Needs review";
  return "Medium authenticity";
}

export function AuthenticityBadge({
  score,
  band,
  size = "sm",
  className,
  summary,
  celebrate = false,
}: AuthenticityBadgeProps) {
  const reduced = useReducedMotion();

  const resolvedBand: AuthenticityBand = useMemo(
    () =>
      band ??
      (score != null
        ? score >= 75
          ? "high"
          : score >= 40
            ? "medium"
            : "low"
        : "medium"),
    [band, score]
  );

  const displayScore = useCountUp(score ?? null, { reducedMotion: reduced, durationMs: 620 });

  if (score == null && !band) return null;

  const celebrateGlow =
    celebrate && resolvedBand === "high" && !reduced
      ? {
          boxShadow: [
            "0 0 0 0 rgba(52,211,153,0)",
            "0 0 0 6px rgba(52,211,153,0.15)",
            "0 0 0 0 rgba(52,211,153,0)",
          ],
        }
      : { boxShadow: "0 0 0 0 rgba(0,0,0,0)" };

  const inner = (
    <motion.span
      layout
      className="inline-flex max-w-full"
      animate={celebrateGlow}
      transition={{ duration: 0.85, ease: "easeOut" }}
    >
      <Badge
        variant="outline"
        className={cn(
          "gap-1 font-medium tabular-nums transition-colors duration-500",
          bandStyles(resolvedBand),
          size === "md" && "px-2.5 py-1 text-xs",
          size === "sm" && "px-2 py-0.5 text-[11px]",
          className
        )}
      >
        {resolvedBand === "high" ? (
          <ShieldCheck className="size-3 shrink-0 opacity-90" aria-hidden />
        ) : resolvedBand === "low" ? (
          <ShieldAlert className="size-3 shrink-0 opacity-90" aria-hidden />
        ) : (
          <ShieldQuestion className="size-3 shrink-0 opacity-90" aria-hidden />
        )}
        {displayScore != null ? `${displayScore}` : "—"}
        <span className="font-normal opacity-90">authenticity</span>
      </Badge>
    </motion.span>
  );

  if (summary) {
    return (
      <Tooltip>
        <TooltipTrigger className="inline-flex max-w-full">{inner}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-left text-xs">
          <p className="font-medium">{labelForBand(resolvedBand)}</p>
          <p className="mt-1 text-muted-foreground">{summary}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}
