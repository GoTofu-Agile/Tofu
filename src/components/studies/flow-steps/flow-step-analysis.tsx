"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerInsights } from "@/app/(dashboard)/studies/actions";

const ANALYSIS_OPTIONS = [
  { id: "pain_points", label: "Pain Points", description: "Identify key user frustrations" },
  { id: "sentiment", label: "Sentiment", description: "Analyze overall sentiment" },
  { id: "feature_priorities", label: "Feature Priorities", description: "Rank feature requests" },
  { id: "behavior_patterns", label: "Behavior Patterns", description: "Discover common behaviors" },
  { id: "competitive_insights", label: "Competitive Insights", description: "Compare to alternatives" },
];

const POLL_INTERVAL = 3000;
const POLL_TIMEOUT = 60000; // 1 minute

interface FlowStepAnalysisProps {
  studyId: string;
  completedCount: number;
  totalCount: number;
  hasReport: boolean;
  onReportGenerated?: () => void;
}

export function FlowStepAnalysis({
  studyId,
  completedCount,
  totalCount,
  hasReport,
  onReportGenerated,
}: FlowStepAnalysisProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(["pain_points", "sentiment"]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const pollStartRef = useRef<number>(0);

  function toggleOption(id: string) {
    setSelectedOptions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  }

  // Poll for report completion
  useEffect(() => {
    if (!generating) return;

    const interval = setInterval(async () => {
      // Check timeout
      if (pollStartRef.current > 0 && Date.now() - pollStartRef.current > POLL_TIMEOUT) {
        setGenerating(false);
        pollStartRef.current = 0;
        // Report may still be generating in the background — reload to check
        window.location.reload();
        return;
      }

      try {
        const res = await fetch(`/api/studies/${studyId}/status`);
        if (!res.ok) return;
        const data = await res.json();
        // If there's a report now, we're done
        if (data.hasReport) {
          setGenerating(false);
          pollStartRef.current = 0;
          toast.success("Analysis complete!");
          onReportGenerated?.();
        }
      } catch {
        // ignore polling errors
      }
    }, POLL_INTERVAL);

    return () => clearInterval(interval);
  }, [generating, studyId, onReportGenerated]);

  async function handleGenerate() {
    setGenerating(true);
    pollStartRef.current = Date.now();
    const result = await triggerInsights(studyId, {
      analysisTypes: selectedOptions,
      customPrompt: customPrompt.trim() || undefined,
    });
    if (result.error) {
      toast.error(result.error);
      setGenerating(false);
      pollStartRef.current = 0;
      return;
    }
    toast.success("Generating analysis... This may take a moment.");
  }

  // Already has a report — show compact summary
  if (hasReport) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-green-50/50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
          <h3 className="mt-3 text-sm font-semibold">Analysis Complete</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Your insights are ready. Continue to the Results step to view the full dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Generating state
  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Analyzing your interviews...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Extracting themes, sentiment, and recommendations from {completedCount} transcripts
          </p>
        </div>
      </div>
    );
  }

  // Analysis planning
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Analysis</h3>
        <p className="text-sm text-muted-foreground mt-1">
          What do you want to learn from your interviews? Select analysis types or write a custom question.
        </p>
      </div>

      {/* Quick Analysis Options */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Quick analysis</label>
        <div className="flex flex-wrap gap-2">
          {ANALYSIS_OPTIONS.map((opt) => {
            const isSelected = selectedOptions.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleOption(opt.id)}
                className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                  isSelected
                    ? "border-foreground/30 bg-stone-50 font-medium"
                    : "border-border hover:border-foreground/20"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Question */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">Custom question (optional)</label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="e.g. Why do enterprise customers churn after 90 days?"
          rows={2}
          className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
        />
      </div>

      {/* Status + Generate */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {completedCount} of {totalCount} interviews available for analysis
        </p>
        <Button onClick={handleGenerate} disabled={generating}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Analysis
        </Button>
      </div>
    </div>
  );
}
