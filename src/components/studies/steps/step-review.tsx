"use client";

import { useState } from "react";
import { Loader2, MessageSquare, ClipboardList, Users } from "lucide-react";
import type { SurveyQuestion } from "./step-questions";

interface StepReviewProps {
  studyType: "INTERVIEW" | "SURVEY";
  title: string;
  interviewGuide: string;
  surveyQuestions: SurveyQuestion[];
  selectedGroups: { id: string; name: string; personaCount: number }[];
  onBack: () => void;
  onCreate: () => Promise<void>;
}

export function StepReview({
  studyType,
  title,
  interviewGuide,
  surveyQuestions,
  selectedGroups,
  onBack,
  onCreate,
}: StepReviewProps) {
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      await onCreate();
    } catch {
      setCreating(false);
    }
  }

  const totalPersonas = selectedGroups.reduce((sum, g) => sum + g.personaCount, 0);
  const questionCount =
    studyType === "INTERVIEW"
      ? interviewGuide.split("\n").filter((l) => l.trim()).length
      : surveyQuestions.filter((q) => q.text.trim()).length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Review your study</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Everything looks good? Let&apos;s create it.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="space-y-3">
        {/* Title + Type */}
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            {studyType === "INTERVIEW" ? (
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {studyType === "INTERVIEW" ? "Interview Study" : "Survey"}
            </span>
          </div>
          <p className="text-sm font-semibold">{title}</p>
        </div>

        {/* Audience */}
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Audience
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{totalPersonas} personas</span>
          </div>
          <div className="space-y-1">
            {selectedGroups.map((g) => (
              <div key={g.id} className="flex items-center justify-between text-sm">
                <span>{g.name}</span>
                <span className="text-xs text-muted-foreground">{g.personaCount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Questions */}
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {studyType === "INTERVIEW" ? "Interview guide" : "Questions"}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">{questionCount} questions</span>
          </div>
          {studyType === "INTERVIEW" ? (
            <div className="space-y-1">
              {interviewGuide
                .split("\n")
                .filter((l) => l.trim())
                .slice(0, 5)
                .map((line, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate">{line}</p>
                ))}
              {questionCount > 5 && (
                <p className="text-xs text-muted-foreground/50">+{questionCount - 5} more...</p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {surveyQuestions
                .filter((q) => q.text.trim())
                .slice(0, 5)
                .map((q, i) => (
                  <div key={q.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[10px]">{q.type}</span>
                    <span className="truncate">{q.text}</span>
                  </div>
                ))}
              {surveyQuestions.filter((q) => q.text.trim()).length > 5 && (
                <p className="text-xs text-muted-foreground/50">+{surveyQuestions.filter((q) => q.text.trim()).length - 5} more...</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-60"
        >
          {creating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Study"
          )}
        </button>
      </div>
    </div>
  );
}
