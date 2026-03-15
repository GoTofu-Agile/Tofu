"use client";

import { useState } from "react";
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

export function BatchRunButton({
  studyId,
  pendingCount,
  totalCount,
  completedCount,
}: BatchRunButtonProps) {
  const router = useRouter();
  const [running, setRunning] = useState(false);

  async function handleRun() {
    setRunning(true);
    const result = await runBatchInterviews(studyId);

    if (result.error) {
      toast.error(result.error);
      setRunning(false);
      return;
    }

    toast.success(
      `Batch started! Interviewing ${result.pendingCount} personas in the background. Refresh to see progress.`
    );

    // Poll for updates
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(interval), 600000);
  }

  if (pendingCount === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        All {totalCount} personas interviewed
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleRun} disabled={running}>
        {running ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run All Interviews ({pendingCount})
          </>
        )}
      </Button>
      {completedCount > 0 && (
        <span className="text-sm text-muted-foreground">
          {completedCount}/{totalCount} done
        </span>
      )}
    </div>
  );
}
