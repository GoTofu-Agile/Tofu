"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Play, Loader2, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { runBatchInterviews } from "@/app/(dashboard)/studies/actions";

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

interface BatchRunButtonProps {
  studyId: string;
  pendingCount: number;
  totalCount: number;
  completedCount: number;
}

interface BatchStatus {
  total: number;
  completed: number;
  running: { personaName: string } | null;
  done: boolean;
}

export function BatchRunButton({
  studyId,
  pendingCount: initialPending,
  totalCount,
  completedCount: initialCompleted,
}: BatchRunButtonProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingStartTime = useRef<number>(0);
  const consecutiveErrors = useRef(0);

  const completed = status?.completed ?? initialCompleted;
  const pending = totalCount - completed;
  const currentPersona = status?.running?.personaName;
  const allDone = status?.done ?? (initialPending === 0);

  const stopPolling = useCallback(() => {
    setPolling(false);
    pollingStartTime.current = 0;
    consecutiveErrors.current = 0;
  }, []);

  const pollStatus = useCallback(async () => {
    // Check timeout
    if (pollingStartTime.current > 0 && Date.now() - pollingStartTime.current > POLL_TIMEOUT) {
      stopPolling();
      setError("Batch interviews are taking longer than expected. Check back later or try again.");
      return;
    }

    try {
      const res = await fetch(`/api/studies/${studyId}/status`);
      if (!res.ok) {
        consecutiveErrors.current++;
        if (consecutiveErrors.current >= 5) {
          stopPolling();
          setError("Lost connection to the server. Please refresh and try again.");
        }
        return;
      }

      consecutiveErrors.current = 0;
      const data: BatchStatus = await res.json();
      setStatus(data);

      if (data.done) {
        stopPolling();
        toast.success(`All ${data.completed} interviews completed!`);
        router.refresh();
      }
    } catch {
      consecutiveErrors.current++;
      if (consecutiveErrors.current >= 5) {
        stopPolling();
        setError("Lost connection to the server. Please refresh and try again.");
      }
    }
  }, [studyId, router, stopPolling]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(pollStatus, POLL_INTERVAL);
    const t = window.setTimeout(() => pollStatus(), 0);
    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [polling, pollStatus]);

  async function handleRun() {
    setStarting(true);
    setError(null);
    const result = await runBatchInterviews(studyId);

    if (result.error) {
      toast.error(result.error);
      setStarting(false);
      return;
    }

    toast.success(`Batch started for ${result.pendingCount} personas!`);
    setStarting(false);
    pollingStartTime.current = Date.now();
    consecutiveErrors.current = 0;
    setPolling(true);
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
        <Button variant="outline" size="sm" onClick={handleRun}>
          <RotateCcw className="mr-2 h-3 w-3" />
          Retry
        </Button>
      </div>
    );
  }

  // All done state
  if (allDone && !polling) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        All {totalCount} personas interviewed
      </div>
    );
  }

  // Polling / running state
  if (polling) {
    const pct = totalCount > 0 ? (completed / totalCount) * 100 : 0;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">
            {currentPersona
              ? `Interviewing: ${currentPersona}`
              : "Preparing next interview..."}
          </span>
          <span className="text-sm text-muted-foreground ml-auto">
            {completed}/{totalCount} done
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  // Ready to run
  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleRun} disabled={starting}>
        {starting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Starting...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run All Interviews ({pending})
          </>
        )}
      </Button>
      {completed > 0 && (
        <span className="text-sm text-muted-foreground">
          {completed}/{totalCount} done
        </span>
      )}
    </div>
  );
}
