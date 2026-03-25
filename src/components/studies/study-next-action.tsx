"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Play, Sparkles, BarChart3, Loader2 } from "lucide-react";
import { BatchRunButton } from "./batch-run-button";
import { triggerInsights } from "@/app/(dashboard)/studies/actions";
import type { LifecycleStage } from "./study-lifecycle-stepper";

interface StudyNextActionProps {
  stage: LifecycleStage;
  studyId: string;
  pendingCount: number;
  completedCount: number;
  totalCount: number;
}

export function StudyNextAction({
  stage,
  studyId,
  pendingCount,
  completedCount,
  totalCount,
}: StudyNextActionProps) {
  const [generatingInsights, setGeneratingInsights] = useState(false);

  async function handleGenerateInsights() {
    setGeneratingInsights(true);
    const result = await triggerInsights(studyId);
    if (result.error) {
      toast.error(result.error);
      setGeneratingInsights(false);
      return;
    }
    toast.success("Generating insights in the background...");
    setGeneratingInsights(false);
  }

  if (stage === "setup") {
    return (
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Play className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Ready to start</p>
              <p className="text-xs text-muted-foreground">
                {totalCount} personas ready for interviews
              </p>
            </div>
          </div>
          <BatchRunButton
            studyId={studyId}
            pendingCount={pendingCount}
            totalCount={totalCount}
            completedCount={completedCount}
          />
        </div>
      </div>
    );
  }

  if (stage === "interviewing") {
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-amber-900">
              {completedCount} of {totalCount} interviews complete
            </p>
          </div>
          {pendingCount > 0 && (
            <BatchRunButton
              studyId={studyId}
              pendingCount={pendingCount}
              totalCount={totalCount}
              completedCount={completedCount}
            />
          )}
        </div>
        <div className="h-2 rounded-full bg-amber-200 overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (stage === "analyzing") {
    return (
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-violet-600" />
            <div>
              <p className="text-sm font-medium text-violet-900">
                All {completedCount} interviews done!
              </p>
              <p className="text-xs text-violet-700/70">
                Generate AI-powered insights from your interviews
              </p>
            </div>
          </div>
          <Button
            onClick={handleGenerateInsights}
            disabled={generatingInsights}
            size="sm"
          >
            {generatingInsights ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-3 w-3" />
            )}
            Generate Insights
          </Button>
        </div>
      </div>
    );
  }

  // stage === "done"
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-900">
              Insights ready
            </p>
            <p className="text-xs text-green-700/70">
              Themes, quotes, and recommendations from {completedCount} interviews
            </p>
          </div>
        </div>
        <Link
          href={`/studies/${studyId}/results`}
          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
        >
          View Results Dashboard
        </Link>
      </div>
    </div>
  );
}
