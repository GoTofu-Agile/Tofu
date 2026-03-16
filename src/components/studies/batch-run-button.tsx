"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Play, Loader2, CheckCircle2 } from "lucide-react";
import { runBatchInterviews } from "@/app/(dashboard)/studies/actions";

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

  const completed = status?.completed ?? initialCompleted;
  const pending = totalCount - completed;
  const currentPersona = status?.running?.personaName;
  const allDone = status?.done ?? (initialPending === 0);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/studies/${studyId}/status`);
      if (!res.ok) return;
      const data: BatchStatus = await res.json();
      setStatus(data);

      if (data.done) {
        setPolling(false);
        toast.success(`All ${data.completed} interviews completed!`);
        router.refresh();
      }
    } catch {
      // Silently continue polling
    }
  }, [studyId, router]);

  useEffect(() => {
    if (!polling) return;
    const interval = setInterval(pollStatus, 3000);
    pollStatus(); // Immediate first poll
    return () => clearInterval(interval);
  }, [polling, pollStatus]);

  async function handleRun() {
    setStarting(true);
    const result = await runBatchInterviews(studyId);

    if (result.error) {
      toast.error(result.error);
      setStarting(false);
      return;
    }

    toast.success(`Batch started for ${result.pendingCount} personas!`);
    setStarting(false);
    setPolling(true);
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
