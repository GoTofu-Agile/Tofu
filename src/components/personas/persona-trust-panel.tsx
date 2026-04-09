"use client";

import { useEffect, useState } from "react";
import { AuthenticityBadge } from "@/components/personas/authenticity-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info, Loader2, Shield } from "lucide-react";

type Confidence = "low" | "medium" | "high" | null | undefined;

interface PersonaTrustPanelProps {
  personaId: string;
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

function formatEvalError(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null && "message" in raw) {
    const m = (raw as { message: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return null;
}

function labelForTrustConfidence(
  confidence: Confidence,
  score: number | null
): string {
  if (confidence === "high") return "High trust";
  if (confidence === "low") return "Low trust";
  if (confidence === "medium") return "Medium trust";
  if (score != null) {
    if (score >= 75) return "High trust";
    if (score >= 40) return "Medium trust";
    return "Low trust";
  }
  return "Trust score";
}

const TRUST_TOOLTIP_FALLBACK =
  "Combines factuality, consistency, realism, and uniqueness vs other personas in this group — a guide for quality, not proof the person is real.";

export function PersonaTrustPanel({
  personaId,
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
  const [liveStatus, setLiveStatus] = useState<string | null>(evaluationStatus);
  const [liveTrustScore, setLiveTrustScore] = useState<number | null>(trustScore);
  const [liveTrustConfidence, setLiveTrustConfidence] = useState<Confidence>(trustConfidence);
  const [liveTrustSummary, setLiveTrustSummary] = useState<string | null>(trustSummary);
  const [retrying, setRetrying] = useState(false);
  const [liveEvalError, setLiveEvalError] = useState<string | null>(null);

  useEffect(() => {
    setLiveStatus(evaluationStatus);
    setLiveTrustScore(trustScore);
    setLiveTrustConfidence(trustConfidence);
    setLiveTrustSummary(trustSummary);
  }, [evaluationStatus, trustScore, trustConfidence, trustSummary]);

  useEffect(() => {
    if (liveStatus !== "PENDING" && liveStatus !== "RUNNING") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/personas/${personaId}/evaluation`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          evaluationStatus: string | null;
          evaluationError?: unknown;
          latestEvaluation?: {
            trustScore?: number | null;
            confidenceLabel?: Confidence;
            summary?: string | null;
          } | null;
        };
        if (cancelled) return;
        setLiveStatus(data.evaluationStatus ?? null);
        setLiveTrustScore(data.latestEvaluation?.trustScore ?? null);
        setLiveTrustConfidence(data.latestEvaluation?.confidenceLabel ?? null);
        setLiveTrustSummary(data.latestEvaluation?.summary ?? null);
        setLiveEvalError(formatEvalError(data.evaluationError));
      } catch {
        // ignore transient polling failures
      }
    };
    const id = window.setInterval(poll, 7000);
    void poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [liveStatus, personaId]);

  const flags = parseFlags(evalFlags);
  /** Only these mean work is still in progress. Do not infer from missing trustScore alone — that stays “running” forever after COMPLETED if the UI logic is wrong. */
  const evalPending = liveStatus === "PENDING" || liveStatus === "RUNNING";
  const evalComplete =
    liveStatus === "COMPLETED" && liveTrustScore != null;
  const evalDoneButNoTrustRow =
    liveStatus === "COMPLETED" && liveTrustScore == null;

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
          <Tooltip>
            <TooltipTrigger className="inline-flex max-w-full">
              <Badge variant="outline" className="gap-1.5 py-1 text-xs">
                <Shield className="size-3.5 opacity-80" />
                Trust {liveTrustScore}
                {liveTrustConfidence ? (
                  <span className="text-muted-foreground">
                    · {liveTrustConfidence}
                  </span>
                ) : null}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-left text-xs">
              <p className="font-medium">
                {labelForTrustConfidence(liveTrustConfidence, liveTrustScore)}
              </p>
              <p className="mt-1 text-muted-foreground">
                {liveTrustSummary?.trim()
                  ? liveTrustSummary
                  : TRUST_TOOLTIP_FALLBACK}
              </p>
            </TooltipContent>
          </Tooltip>
        ) : liveStatus === "FAILED" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-destructive/40 text-destructive">
              Evaluation failed
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true);
                setLiveEvalError(null);
                try {
                  const res = await fetch(`/api/personas/${personaId}/evaluation/retry`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ force: true }),
                  });
                  const body = (await res.json().catch(() => ({}))) as {
                    ok?: boolean;
                    evaluationStatus?: string;
                    trustScore?: number | null;
                    confidenceLabel?: Confidence;
                    summary?: string | null;
                    error?: string;
                  };
                  if (!res.ok || body.ok === false) {
                    setLiveStatus("FAILED");
                    setLiveEvalError(
                      body.error?.trim() ||
                        "Retry failed. Check that an LLM API key is configured for this environment."
                    );
                    return;
                  }
                  setLiveStatus(body.evaluationStatus ?? "COMPLETED");
                  if (body.evaluationStatus === "COMPLETED") {
                    setLiveTrustScore(body.trustScore ?? null);
                    setLiveTrustConfidence(body.confidenceLabel ?? null);
                    setLiveTrustSummary(body.summary ?? null);
                  }
                } catch {
                  setLiveStatus("FAILED");
                  setLiveEvalError("Network error while retrying evaluation.");
                } finally {
                  setRetrying(false);
                }
              }}
            >
              {retrying ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Retrying
                </>
              ) : (
                "Retry"
              )}
            </Button>
            </div>
            {liveEvalError ? (
              <p className="text-[11px] leading-snug text-destructive/90 sm:max-w-md">
                {liveEvalError}
              </p>
            ) : null}
          </div>
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

      {liveTrustSummary && !evalSummary ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{liveTrustSummary}</p>
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
