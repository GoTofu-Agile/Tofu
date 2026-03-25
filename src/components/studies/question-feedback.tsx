"use client";

import { MOM_TEST_ISSUES, type MomTestIssue } from "@/lib/ai/mom-test-rules";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface QuestionEvaluation {
  questionIndex: number;
  score: number;
  issues: MomTestIssue[];
  explanation: string;
  suggestion: string | null;
}

interface QuestionFeedbackProps {
  evaluation: QuestionEvaluation;
  onApplySuggestion?: (questionIndex: number, suggestion: string) => void;
}

export function QuestionFeedback({ evaluation, onApplySuggestion }: QuestionFeedbackProps) {
  const isGood = evaluation.score >= 7;

  if (isGood) {
    return (
      <div className="flex items-start gap-2 mt-1 ml-6">
        <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 shrink-0" />
        <p className="text-xs text-green-700">{evaluation.explanation}</p>
      </div>
    );
  }

  return (
    <div className="mt-1.5 ml-6 rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs text-amber-800">{evaluation.explanation}</p>
          {evaluation.issues.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {evaluation.issues.map((issue) => (
                <span
                  key={issue}
                  className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700"
                >
                  {issue.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {evaluation.suggestion && (
        <div className="flex items-start justify-between gap-2 border-t border-amber-200 pt-2">
          <p className="text-xs text-amber-900">
            Try: &ldquo;{evaluation.suggestion}&rdquo;
          </p>
          {onApplySuggestion && (
            <button
              onClick={() => onApplySuggestion(evaluation.questionIndex, evaluation.suggestion!)}
              className="shrink-0 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-medium text-amber-800 hover:bg-amber-50 transition-colors"
            >
              Apply
            </button>
          )}
        </div>
      )}
    </div>
  );
}
