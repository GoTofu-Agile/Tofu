"use client";

import { AuthenticityBadge } from "@/components/personas/authenticity-badge";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info, Loader2, Shield } from "lucide-react";

type Confidence = "low" | "medium" | "high" | null | undefined;

interface PersonaTrustPanelProps {
  authenticityScore: number | null;
  authenticityBand: "low" | "medium" | "high" | null;
  evalSummary: string | null;
  evalFlags: unknown;
  evaluationStatus: string | null;
  trustScore: number | null;
  trustConfidence: Confidence;
  trustSummary: string | null;
  className?: string;
}

function parseFlags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export function PersonaTrustPanel({
  authenticityScore,
  authenticityBand,
  evalSummary,
  evalFlags,
  evaluationStatus,
  trustScore,
  trustConfidence,
  trustSummary,
  className,
}: PersonaTrustPanelProps) {
  const flags = parseFlags(evalFlags);
  /** Only these mean work is still in progress. Do not infer from missing trustScore alone — that stays “running” forever after COMPLETED if the UI logic is wrong. */
  const evalPending =
    evaluationStatus === "PENDING" || evaluationStatus === "RUNNING";
  const evalComplete =
    evaluationStatus === "COMPLETED" && trustScore != null;
  const evalDoneButNoTrustRow =
    evaluationStatus === "COMPLETED" && trustScore == null;

  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Quality & trust
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Scores are model-assisted signals to help you spot shallow or repetitive
            profiles — not proof of real-world accuracy.
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger className="inline-flex rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Info className="size-4" />
            <span className="sr-only">How scores work</span>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs text-xs">
            Authenticity is scored at creation. Trust combines factuality, consistency,
            realism, and uniqueness when the async evaluation finishes.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {authenticityScore != null ? (
          <AuthenticityBadge
            score={authenticityScore}
            band={authenticityBand}
            size="md"
            summary={evalSummary}
          />
        ) : null}

        {evalPending ? (
          <Badge variant="outline" className="gap-1.5 border-dashed py-1 text-xs">
            <Loader2 className="size-3 animate-spin" />
            Trust evaluation running…
          </Badge>
        ) : evalComplete ? (
          <Badge variant="outline" className="gap-1.5 py-1 text-xs">
            <Shield className="size-3.5 opacity-80" />
            Trust {trustScore}
            {trustConfidence ? (
              <span className="text-muted-foreground">· {trustConfidence}</span>
            ) : null}
          </Badge>
        ) : evaluationStatus === "FAILED" ? (
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Evaluation failed
          </Badge>
        ) : evalDoneButNoTrustRow ? (
          <Badge variant="outline" className="border-dashed py-1 text-xs text-muted-foreground">
            Trust score unavailable
          </Badge>
        ) : null}
      </div>

      {evalPending ? (
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          Finishes in the background right after the persona is created — usually within a minute.
          Refresh if it stays here; if it never completes, background jobs may not be running on
          this environment.
        </p>
      ) : null}

      {evalSummary ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{evalSummary}</p>
      ) : null}

      {trustSummary && !evalSummary ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{trustSummary}</p>
      ) : null}

      {flags.length > 0 ? (
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Flags
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {flags.map((f) => (
              <li key={f}>
                <Badge variant="secondary" className="font-normal">
                  {humanizeFlag(f)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function humanizeFlag(flag: string): string {
  return flag.replace(/_/g, " ");
}
