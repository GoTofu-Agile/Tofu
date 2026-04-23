"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPersonaProgressBadgeLabel, getPersonaProgressHeadline } from "@/lib/personas/progress-copy";

type RunPhase = "starting" | "researching" | "generating" | "done" | "error";

interface RunStatus {
  phase: RunPhase;
  completed: number;
  total: number;
  currentName: string | null;
  message: string | null;
}

export function PersonaGroupGenerationStatus({
  runId,
  groupId,
}: {
  runId: string;
  groupId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [notFound, setNotFound] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/personas/generation-status?runId=${encodeURIComponent(runId)}`,
          { cache: "no-store" }
        );
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as RunStatus;
        if (cancelled) return;
        setStatus(data);

        if (data.phase === "done" || data.phase === "error") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          // After a short pause, reload the page without runId so the persona cards render
          setTimeout(() => {
            if (!cancelled) router.replace(`/personas/${groupId}`);
          }, 2000);
        }
      } catch {
        // ignore transient errors
      }
    };

    void poll();
    intervalRef.current = setInterval(poll, 2500);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [runId, groupId, router]);

  if (notFound) return null;

  const pct =
    status?.phase === "done"
      ? 100
      : status && status.total > 0
        ? Math.round((status.completed / status.total) * 100)
        : status?.phase === "researching"
          ? 10
          : 0;

  const phase = status?.phase ?? "starting";
  const isDone = phase === "done";
  const isError = phase === "error";

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        {isDone ? (
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
        ) : isError ? (
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm">
            {getPersonaProgressHeadline({
              phase,
              currentName: status?.currentName ?? null,
            })}
          </p>
          {status?.message ? (
            <p className="text-xs text-muted-foreground mt-0.5">{status.message}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            isError
              ? "border-destructive/20 bg-destructive/5 text-destructive"
              : "border-primary/20 bg-primary/5 text-primary"
          )}
        >
          {getPersonaProgressBadgeLabel(phase)}
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {status && status.total > 0
              ? `${status.completed} / ${status.total} personas`
              : "Preparing…"}
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      {isDone && (
        <p className="text-xs text-muted-foreground">
          Done — loading your personas…
        </p>
      )}
    </div>
  );
}
