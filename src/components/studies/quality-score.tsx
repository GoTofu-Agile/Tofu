"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface QualityScoreProps {
  score: number;
  feedback: string;
  evaluations: Array<{
    questionIndex: number;
    score: number;
    issues: string[];
    explanation: string;
  }>;
  missingTopics: string[];
  onGoBack?: () => void;
}

function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 9) return { label: "Excellent", color: "text-green-600" };
  if (score >= 7) return { label: "Good", color: "text-green-600" };
  if (score >= 5) return { label: "Fair", color: "text-amber-600" };
  return { label: "Needs Work", color: "text-red-600" };
}

export function QualityScore({
  score,
  feedback,
  evaluations,
  missingTopics,
  onGoBack,
}: QualityScoreProps) {
  const { label, color } = getScoreLabel(score);
  const percentage = (score / 10) * 100;
  const goodCount = evaluations.filter((e) => e.score >= 7).length;
  const totalCount = evaluations.length;
  const issues = evaluations.filter((e) => e.score < 7);

  return (
    <div className="rounded-xl border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Research Quality Score</h4>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${color}`}>{score}/10</span>
          <span className={`text-xs font-medium ${color}`}>{label}</span>
        </div>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">{feedback}</p>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span>{goodCount} of {totalCount} questions follow Mom Test principles</span>
        </div>

        {issues.map((issue) => (
          <div key={issue.questionIndex} className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-3 w-3 text-amber-600" />
            <span className="text-muted-foreground">
              Q{issue.questionIndex + 1}: {issue.explanation}
            </span>
          </div>
        ))}

        {missingTopics.length > 0 && (
          <div className="flex items-start gap-2 text-xs mt-2">
            <AlertTriangle className="h-3 w-3 text-blue-600 mt-0.5" />
            <span className="text-muted-foreground">
              Consider adding questions about: {missingTopics.join(", ")}
            </span>
          </div>
        )}
      </div>

      {issues.length > 0 && onGoBack && (
        <button
          onClick={onGoBack}
          className="w-full rounded-lg border border-primary/20 bg-primary/5 py-2 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          Improve Score — Fix {issues.length} Remaining Issue{issues.length > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
