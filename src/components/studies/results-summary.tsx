"use client";

interface ResultsSummaryProps {
  summary: string;
  totalInterviews: number;
  avgDurationMs: number;
  sentimentBreakdown: {
    overall: string;
    positivePercent: number;
    negativePercent: number;
    neutralPercent: number;
  } | null;
}

const sentimentEmoji: Record<string, string> = {
  positive: "text-green-600",
  negative: "text-red-600",
  neutral: "text-muted-foreground",
  mixed: "text-amber-600",
};

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "<1 min";
  return `${minutes} min`;
}

export function ResultsSummary({
  summary,
  totalInterviews,
  avgDurationMs,
  sentimentBreakdown,
}: ResultsSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 p-5">
        <p className="text-sm leading-relaxed">{summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold">{totalInterviews}</div>
          <div className="text-xs text-muted-foreground">Interviews</div>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <div className="text-2xl font-bold">
            {formatDuration(avgDurationMs)}
          </div>
          <div className="text-xs text-muted-foreground">Avg Duration</div>
        </div>
        {sentimentBreakdown && (
          <>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-green-600">
                {sentimentBreakdown.positivePercent}%
              </div>
              <div className="text-xs text-muted-foreground">Positive</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold text-red-600">
                {sentimentBreakdown.negativePercent}%
              </div>
              <div className="text-xs text-muted-foreground">Negative</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
