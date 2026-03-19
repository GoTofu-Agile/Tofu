"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Plus, Trash2, GripVertical } from "lucide-react";

export interface SurveyQuestion {
  id: string;
  text: string;
  type: "open" | "multiple_choice" | "scale";
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

interface StepQuestionsProps {
  studyType: "INTERVIEW" | "SURVEY";
  title: string;
  onTitleChange: (t: string) => void;
  // Interview
  interviewGuide: string;
  onGuideChange: (g: string) => void;
  // Survey
  surveyQuestions: SurveyQuestion[];
  onSurveyQuestionsChange: (q: SurveyQuestion[]) => void;
  // AI generate
  orgContext: { productName?: string | null; productDescription?: string | null; targetAudience?: string | null; industry?: string | null } | null;
  onNext: () => void;
  onBack: () => void;
}

export function StepQuestions({
  studyType,
  title,
  onTitleChange,
  interviewGuide,
  onGuideChange,
  surveyQuestions,
  onSurveyQuestionsChange,
  orgContext,
  onNext,
  onBack,
}: StepQuestionsProps) {
  const [generating, setGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  async function handleGenerate() {
    if (!aiPrompt.trim()) return;
    setGenerating(true);
    try {
      if (studyType === "INTERVIEW") {
        const res = await fetch("/api/studies/generate-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title || aiPrompt, description: aiPrompt, studyType }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Generation failed (${res.status})`);
        }
        const data = await res.json();
        onGuideChange(data.guide || data.interviewGuide || "");
        if (!title && data.title) onTitleChange(data.title);
      } else {
        // Survey: generate structured questions
        const res = await fetch("/api/studies/generate-survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: aiPrompt, orgContext }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Generation failed (${res.status})`);
        }
        const data = await res.json();
        if (data.questions) onSurveyQuestionsChange(data.questions);
        if (!title && data.title) onTitleChange(data.title);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  }

  function addQuestion() {
    onSurveyQuestionsChange([
      ...surveyQuestions,
      { id: crypto.randomUUID(), text: "", type: "open" },
    ]);
  }

  function updateQuestion(id: string, updates: Partial<SurveyQuestion>) {
    onSurveyQuestionsChange(
      surveyQuestions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  }

  function removeQuestion(id: string) {
    onSurveyQuestionsChange(surveyQuestions.filter((q) => q.id !== id));
  }

  const canContinue =
    title.trim() &&
    (studyType === "INTERVIEW"
      ? interviewGuide.trim().length > 0
      : surveyQuestions.some((q) => q.text.trim()));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">
          {studyType === "INTERVIEW" ? "Interview guide" : "Survey questions"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {studyType === "INTERVIEW"
            ? "Define the questions for your 1-on-1 interviews."
            : "Build structured questions for your survey."}
        </p>
      </div>

      {/* AI Generate */}
      <div className="flex gap-2">
        <input
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
          placeholder="Describe what you want to learn..."
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
        />
        <button
          onClick={handleGenerate}
          disabled={generating || !aiPrompt.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-stone-50 disabled:opacity-40"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Study title</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Onboarding Experience Research"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
        />
      </div>

      {/* Interview Guide */}
      {studyType === "INTERVIEW" && (
        <div>
          <label className="text-xs font-medium text-muted-foreground">Interview questions (one per line)</label>
          <textarea
            value={interviewGuide}
            onChange={(e) => onGuideChange(e.target.value)}
            placeholder={"1. Can you tell me about your experience with...?\n2. What challenges do you face when...?\n3. How do you currently...?"}
            rows={10}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30 resize-none"
          />
        </div>
      )}

      {/* Survey Builder */}
      {studyType === "SURVEY" && (
        <div className="space-y-3">
          {surveyQuestions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground mt-2 shrink-0">Q{i + 1}</span>
                <input
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                  placeholder="Enter your question..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
                />
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="rounded-lg p-2 text-muted-foreground/50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-2 ml-6">
                {(["open", "multiple_choice", "scale"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateQuestion(q.id, {
                      type: t,
                      ...(t === "multiple_choice" && !q.options ? { options: ["Option 1", "Option 2"] } : {}),
                      ...(t === "scale" ? { scaleMin: 1, scaleMax: 5 } : {}),
                    })}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      q.type === t
                        ? "bg-foreground text-background"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {t === "open" ? "Open-ended" : t === "multiple_choice" ? "Multiple choice" : "Scale"}
                  </button>
                ))}
              </div>
              {q.type === "multiple_choice" && q.options && (
                <div className="ml-6 space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full border border-border" />
                      <input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...q.options!];
                          newOpts[oi] = e.target.value;
                          updateQuestion(q.id, { options: newOpts });
                        }}
                        className="flex-1 rounded border-0 bg-transparent px-1 py-0.5 text-sm focus-visible:outline-none"
                      />
                      {q.options!.length > 2 && (
                        <button
                          onClick={() => updateQuestion(q.id, { options: q.options!.filter((_, j) => j !== oi) })}
                          className="text-muted-foreground/40 hover:text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => updateQuestion(q.id, { options: [...q.options!, `Option ${q.options!.length + 1}`] })}
                    className="text-xs text-muted-foreground hover:text-foreground ml-5"
                  >
                    + Add option
                  </button>
                </div>
              )}
              {q.type === "scale" && (
                <div className="ml-6 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Scale:</span>
                  <input
                    type="number"
                    value={q.scaleMin ?? 1}
                    onChange={(e) => updateQuestion(q.id, { scaleMin: Number(e.target.value) })}
                    className="w-12 rounded border border-border px-2 py-1 text-center text-xs"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    value={q.scaleMax ?? 5}
                    onChange={(e) => updateQuestion(q.id, { scaleMax: Number(e.target.value) })}
                    className="w-12 rounded border border-border px-2 py-1 text-center text-xs"
                  />
                </div>
              )}
            </div>
          ))}

          <button
            onClick={addQuestion}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add question
          </button>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
