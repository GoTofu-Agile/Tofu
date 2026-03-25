"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Info,
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  SquareCheck,
  Square,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateStudyGuide } from "@/app/(dashboard)/studies/actions";
import { readNDJSONStream } from "@/lib/streaming/ndjson";
import { SetupPreviewCard } from "../setup-preview-card";

interface GuideQuestion {
  index: number;
  text: string;
  origin: "ai" | "manual";
}

const STEPS = [
  { key: "analyzing_objective", label: "Analyzing objective" },
  { key: "reviewing_personas", label: "Reviewing personas" },
  { key: "crafting_questions", label: "Crafting questions" },
];

interface FlowStepGuideProps {
  studyId: string;
  studyType: string;
  title: string;
  objective: string;
  selectedGroupNames: string[];
  selectedGroups: Array<{ name: string; personaCount: number }>;
  totalPersonas: number;
  orgContext?: {
    productName?: string | null;
    productDescription?: string | null;
    targetAudience?: string | null;
    industry?: string | null;
  } | null;
  guide: string;
  onGuideChange: (guide: string) => void;
  onGoToSetup: () => void;
}

export function FlowStepGuide({
  studyId,
  studyType,
  title,
  objective,
  selectedGroupNames,
  selectedGroups,
  totalPersonas,
  orgContext,
  guide,
  onGuideChange,
  onGoToSetup,
}: FlowStepGuideProps) {
  const [streamPhase, setStreamPhase] = useState<"idle" | "streaming" | "done">(
    guide.trim() ? "done" : "idle"
  );
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GuideQuestion[]>(() => {
    if (!guide.trim()) return [];
    return guide
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text, i) => ({ index: i, text, origin: "ai" as const }));
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedForRegen, setSelectedForRegen] = useState<Set<number>>(new Set());

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const hasObjective = objective.trim().length > 0;

  function handleDragStart(i: number) {
    setDragIndex(i);
  }

  function handleDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOverIndex(i);
  }

  function handleDrop(i: number) {
    if (dragIndex === null || dragIndex === i) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const updated = [...questions];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(i, 0, moved);
    setQuestions(updated);
    syncGuideToDb(updated);
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function toggleSelectForRegen(index: number) {
    setSelectedForRegen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function selectAllForRegen() {
    if (selectedForRegen.size === questions.length) {
      setSelectedForRegen(new Set());
    } else {
      setSelectedForRegen(new Set(questions.map((_, i) => i)));
    }
  }

  async function handleRegenerateSelected() {
    if (selectedForRegen.size === 0) return;

    // Keep unselected questions, regenerate selected ones
    const keepQuestions = questions.filter((_, i) => !selectedForRegen.has(i));
    const selectedTexts = questions
      .filter((_, i) => selectedForRegen.has(i))
      .map((q) => q.text);

    setStreamPhase("streaming");
    setCompletedSteps(new Set());
    setCurrentStep("analyzing_objective");
    setSelectedForRegen(new Set());

    let newQuestions: GuideQuestion[] = [];

    try {
      const res = await fetch("/api/studies/generate-guide-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: `${objective}\n\nRegenerate ONLY ${selectedTexts.length} replacement questions. The following questions are being REPLACED and should NOT be repeated:\n${selectedTexts.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
          studyType,
          studyId,
          existingQuestions: keepQuestions.map((q) => q.text).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }

      await readNDJSONStream(res, (event: Record<string, unknown>) => {
        switch (event.type) {
          case "step": {
            const step = event.step as string;
            setCurrentStep(step);
            const stepIndex = STEPS.findIndex((s) => s.key === step);
            if (stepIndex > 0) {
              setCompletedSteps((prev) => {
                const next = new Set(prev);
                for (let j = 0; j < stepIndex; j++) next.add(STEPS[j].key);
                return next;
              });
            }
            break;
          }
          case "question": {
            const q: GuideQuestion = {
              index: keepQuestions.length + newQuestions.length,
              text: event.text as string,
              origin: "ai",
            };
            newQuestions = [...newQuestions, q];
            // Show keep + new combined
            setQuestions([...keepQuestions, ...newQuestions]);
            break;
          }
          case "done": {
            const final = [...keepQuestions, ...newQuestions];
            setQuestions(final);
            setCompletedSteps(new Set(STEPS.map((s) => s.key)));
            setCurrentStep(null);
            setStreamPhase("done");
            const guideText = final.map((q) => q.text).join("\n");
            onGuideChange(guideText);
            break;
          }
          case "error":
            throw new Error(event.message as string);
        }
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to regenerate"
      );
      // Restore original questions
      setQuestions(questions);
      setStreamPhase("done");
      setCurrentStep(null);
    }
  }

  // Sync questions to guide string + autosave
  const syncGuideToDb = useCallback(
    (updatedQuestions: GuideQuestion[]) => {
      const guideText = updatedQuestions.map((q) => q.text).filter(Boolean).join("\n");
      onGuideChange(guideText);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        await updateStudyGuide(studyId, guideText);
      }, 1500);
    },
    [studyId, onGuideChange]
  );

  async function handleGenerate() {
    setStreamPhase("streaming");
    setQuestions([]);
    setCompletedSteps(new Set());
    setCurrentStep("analyzing_objective");

    let allQuestions: GuideQuestion[] = [];

    try {
      const res = await fetch("/api/studies/generate-guide-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: objective,
          studyType,
          studyId,
          existingQuestions: questions.length > 0
            ? questions.map((q) => q.text).filter(Boolean)
            : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Generation failed (${res.status})`);
      }

      await readNDJSONStream(res, (event: Record<string, unknown>) => {
        switch (event.type) {
          case "step": {
            const step = event.step as string;
            setCurrentStep(step);
            const stepIndex = STEPS.findIndex((s) => s.key === step);
            if (stepIndex > 0) {
              setCompletedSteps((prev) => {
                const next = new Set(prev);
                for (let i = 0; i < stepIndex; i++) {
                  next.add(STEPS[i].key);
                }
                return next;
              });
            }
            break;
          }
          case "question": {
            const q: GuideQuestion = { index: event.index as number, text: event.text as string, origin: "ai" };
            allQuestions = [...allQuestions, q];
            setQuestions([...allQuestions]);
            break;
          }
          case "evaluation":
          case "overall":
            // Hidden — we skip evaluation display
            break;
          case "done":
            setCompletedSteps(new Set(STEPS.map((s) => s.key)));
            setCurrentStep(null);
            setStreamPhase("done");
            // Sync the final guide string to parent
            const guideText = allQuestions.map((q) => q.text).join("\n");
            onGuideChange(guideText);
            break;
          case "error":
            throw new Error(event.message as string);
        }
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate guide"
      );
      // Save whatever questions were streamed before the crash
      if (allQuestions.length > 0) {
        const guideText = allQuestions.map((q) => q.text).join("\n");
        onGuideChange(guideText);
      }
      setStreamPhase(allQuestions.length > 0 || questions.length > 0 ? "done" : "idle");
      setCurrentStep(null);
    }
  }

  function handleQuestionEdit(index: number, newText: string) {
    const updated = questions.map((q) =>
      q.index === index ? { ...q, text: newText } : q
    );
    setQuestions(updated);
    syncGuideToDb(updated);
  }

  function handleAddQuestion() {
    const newIndex = questions.length > 0 ? Math.max(...questions.map((q) => q.index)) + 1 : 0;
    const updated = [...questions, { index: newIndex, text: "", origin: "manual" as const }];
    setQuestions(updated);
    setEditingIndex(newIndex);
  }

  function handleDeleteQuestion(index: number) {
    const updated = questions.filter((q) => q.index !== index);
    setQuestions(updated);
    syncGuideToDb(updated);
  }

  function handleMoveQuestion(index: number, direction: "up" | "down") {
    const pos = questions.findIndex((q) => q.index === index);
    if (direction === "up" && pos <= 0) return;
    if (direction === "down" && pos >= questions.length - 1) return;
    const swapPos = direction === "up" ? pos - 1 : pos + 1;
    const updated = [...questions];
    [updated[pos], updated[swapPos]] = [updated[swapPos], updated[pos]];
    setQuestions(updated);
    syncGuideToDb(updated);
  }

  function handleAddMissingTopics(topics: string[]) {
    const newQuestions = topics.map((topic, i) => ({
      index: (questions.length > 0 ? Math.max(...questions.map((q) => q.index)) : -1) + i + 1,
      text: `Can you tell me about your experience with ${topic.toLowerCase()}?`,
      origin: "ai" as const,
    }));
    const updated = [...questions, ...newQuestions];
    setQuestions(updated);
    syncGuideToDb(updated);
    toast.success(`Added ${newQuestions.length} questions`);
  }

  const isStreaming = streamPhase === "streaming";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Left: Guide content */}
      <div className="lg:col-span-3 space-y-6">
        <div>
          <h3 className="text-lg font-semibold">
            {studyType === "INTERVIEW" ? "Interview Guide" : "Survey Questions"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Generate questions from your objective or write your own.
          </p>
        </div>

        {/* Context Box */}
        <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Generation context
          </div>
          <div className="space-y-1.5">
            <div className="text-sm">
              <span className="text-muted-foreground">Objective: </span>
              {hasObjective ? (
                <span>{objective}</span>
              ) : (
                <span className="text-muted-foreground/50 italic">Not set</span>
              )}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Personas: </span>
              {selectedGroupNames.length > 0 ? (
                <span>{selectedGroupNames.join(", ")}</span>
              ) : (
                <span className="text-muted-foreground/50 italic">None selected</span>
              )}
            </div>
          </div>
          {(!hasObjective || selectedGroupNames.length === 0) && (
            <button
              onClick={onGoToSetup}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Edit in Setup
            </button>
          )}
        </div>

        {/* Step Tracker (during streaming) */}
        {(isStreaming || (completedSteps.size > 0 && streamPhase !== "done")) && (
          <div className="flex items-center gap-4 flex-wrap">
            {STEPS.map((step) => {
              const isCompleted = completedSteps.has(step.key);
              const isActive = currentStep === step.key;
              return (
                <div
                  key={step.key}
                  className={cn(
                    "flex items-center gap-1.5 text-xs transition-all duration-300",
                    isCompleted
                      ? "text-green-600"
                      : isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/40"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3.5 w-3.5 animate-scale-in" />
                  ) : isActive ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  {step.label}
                </div>
              );
            })}
          </div>
        )}

        {/* Generate / Regenerate Buttons */}
        {!isStreaming && (
          <div className="flex items-center gap-2 flex-wrap">
            {questions.length === 0 ? (
              <button
                onClick={handleGenerate}
                disabled={!hasObjective}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                Generate Interview Guide
              </button>
            ) : (
              <>
                {selectedForRegen.size > 0 ? (
                  <button
                    onClick={handleRegenerateSelected}
                    disabled={!hasObjective}
                    className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-foreground/90 disabled:opacity-40"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Regenerate {selectedForRegen.size} selected
                  </button>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={!hasObjective}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    Regenerate All
                  </button>
                )}
                {selectedForRegen.size > 0 && (
                  <button
                    onClick={() => setSelectedForRegen(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear selection
                  </button>
                )}
              </>
            )}
            {!hasObjective && questions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Set a study objective in Setup first.
              </p>
            )}
          </div>
        )}

        {/* Question List */}
        {questions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Interview questions ({questions.length})
              </label>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <Sparkles className="h-2.5 w-2.5 text-amber-400" /> AI generated
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  <Pencil className="h-2.5 w-2.5 text-blue-400" /> Custom
                </span>
              </div>
            </div>
            <div className="space-y-1">
              {questions.map((q, i) => {
                const isEditing = editingIndex === q.index;

                return (
                  <div
                    key={q.index}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "animate-fade-in-up",
                      dragIndex === i && "opacity-40",
                      dragOverIndex === i && dragIndex !== i && "border-t-2 border-t-primary"
                    )}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all group",
                      selectedForRegen.has(i)
                        ? "border-foreground/30 bg-foreground/5"
                        : q.origin === "manual"
                          ? "border-blue-200/50 hover:border-blue-300/70 bg-blue-50/20"
                          : "border-border/50 hover:border-border"
                    )}>
                      {/* Select checkbox for regeneration */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelectForRegen(i); }}
                        className="shrink-0 text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors"
                      >
                        {selectedForRegen.has(i) ? (
                          <SquareCheck className="h-4 w-4 text-foreground" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                      {/* Drag handle */}
                      <GripVertical className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0 cursor-grab transition-colors" />
                      <span className="text-xs text-muted-foreground shrink-0 w-4">
                        {i + 1}
                      </span>
                      {/* Origin indicator */}
                      {q.origin === "ai" ? (
                        <Sparkles className="h-3 w-3 text-amber-400 shrink-0" />
                      ) : (
                        <Pencil className="h-3 w-3 text-blue-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            value={q.text}
                            onChange={(e) =>
                              handleQuestionEdit(q.index, e.target.value)
                            }
                            onBlur={() => {
                              setEditingIndex(null);
                              if (!q.text.trim()) handleDeleteQuestion(q.index);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                setEditingIndex(null);
                                if (!q.text.trim()) handleDeleteQuestion(q.index);
                              }
                            }}
                            placeholder="Type your question..."
                            className="w-full border-0 bg-transparent text-sm focus-visible:outline-none"
                            autoFocus
                          />
                        ) : (
                          <p
                            className="text-sm cursor-text"
                            onClick={() => setEditingIndex(q.index)}
                          >
                            {q.text || <span className="text-muted-foreground/50 italic">Click to edit...</span>}
                          </p>
                        )}
                      </div>
                      {/* Edit + Delete — always visible on hover */}
                      <button
                        onClick={() => setEditingIndex(q.index)}
                        className="shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-foreground transition-all"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.index)}
                        className="shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-red-500 transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add question button */}
        {!isStreaming && (
          <button
            onClick={handleAddQuestion}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add question
          </button>
        )}

        {/* Empty state */}
        {questions.length === 0 && !isStreaming && (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No questions yet. Generate from your objective or write your own.
            </p>
          </div>
        )}
      </div>

      {/* Right: Preview card — same as Setup */}
      <div className="lg:col-span-2">
        <div className="sticky top-6 space-y-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Study preview
          </p>
          <SetupPreviewCard
            title={title}
            studyType={studyType}
            objective={objective}
            selectedGroups={selectedGroups}
            totalPersonas={totalPersonas}
            orgContext={orgContext}
            questions={questions}
            onEditCompany={onGoToSetup}
          />
        </div>
      </div>
    </div>
  );
}
