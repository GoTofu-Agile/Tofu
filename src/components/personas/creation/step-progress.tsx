"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Search, Sparkles } from "lucide-react";

interface StepProgressProps {
  phase: "researching" | "generating" | "done";
  // Research
  researchCurrent?: number;
  researchTotal?: number;
  researchLabel?: string;
  researchResults?: number;
  researchBySource?: Record<string, number>;
  // Generation
  genCompleted?: number;
  genTotal?: number;
  genCurrentName?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  REDDIT: "Reddit",
  APP_REVIEW: "App Store",
  PLAY_STORE_REVIEW: "Play Store",
  FORUM: "Forums",
  PRODUCT_HUNT: "ProductHunt",
  G2_REVIEW: "G2",
  TRUSTPILOT: "Trustpilot",
  NEWS: "News",
  ACADEMIC: "Academic",
  SOCIAL_MEDIA: "Social Media",
};

export function StepProgress({
  phase,
  researchCurrent = 0,
  researchTotal = 0,
  researchLabel = "",
  researchResults = 0,
  researchBySource = {},
  genCompleted = 0,
  genTotal = 0,
  genCurrentName = "",
}: StepProgressProps) {
  const isResearching = phase === "researching";
  const isGenerating = phase === "generating";
  const isDone = phase === "done";

  const genPct = genTotal > 0 ? (genCompleted / genTotal) * 100 : 0;

  const researchHeadline = isResearching
    ? `Searching ${researchCurrent}/${researchTotal}: ${researchLabel}`
    : researchResults > 0
      ? `Found ${researchResults} sources`
      : "Combining all sources";

  const sourceBadges = Object.entries(researchBySource).filter(
    ([, count]) => count > 0
  );

  return (
    <div className="space-y-8 py-4">
      {/* Research phase */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {isResearching ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          )}
          <span className="font-medium">{researchHeadline}</span>
        </div>
        {!isResearching && sourceBadges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-7">
            {sourceBadges.map(([type, count]) => (
              <Badge key={type} variant="secondary" className="text-[10px]">
                {SOURCE_LABELS[type] || type}: {count}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Generation phase */}
      {(isGenerating || isDone) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            <span className="font-medium">
              {isDone
                ? `${genCompleted} personas created!`
                : genCurrentName
                  ? `Creating "${genCurrentName}"...`
                  : "Preparing generation..."}
            </span>
            <span className="text-sm text-muted-foreground ml-auto">
              {genCompleted}/{genTotal}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${genPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Waiting state */}
      {isResearching && (
        <div className="text-center text-sm text-muted-foreground">
          <Search className="inline h-4 w-4 mr-1" />
          Searching for real-world data to ground your personas...
        </div>
      )}

      {isDone && (
        <div className="text-center text-sm text-muted-foreground">
          <Sparkles className="inline h-4 w-4 mr-1" />
          Redirecting to your personas...
        </div>
      )}
    </div>
  );
}
