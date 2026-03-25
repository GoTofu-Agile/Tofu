"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface StepObjectiveProps {
  objective: string;
  onObjectiveChange: (value: string) => void;
  onNext: () => void;
  orgContext: {
    productName?: string | null;
    targetAudience?: string | null;
    industry?: string | null;
  } | null;
}

interface SuggestedObjectives {
  objectives: string[];
  suggestedTitle: string;
}

export function StepObjective({
  objective,
  onObjectiveChange,
  onNext,
  orgContext,
}: StepObjectiveProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedObjectives | null>(null);
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  const fetchSuggestions = useCallback(async () => {
    if (!objective.trim() || objective.trim().length < 10) {
      toast.error("Please describe your research goal in more detail.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/studies/suggest-objectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: objective,
          orgContext: orgContext
            ? {
                productName: orgContext.productName ?? undefined,
                targetAudience: orgContext.targetAudience ?? undefined,
                industry: orgContext.industry ?? undefined,
              }
            : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate suggestions");
      }

      const data: SuggestedObjectives = await res.json();
      setSuggestions(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate suggestions");
    } finally {
      setLoading(false);
    }
  }, [objective, orgContext]);

  function toggleObjective(obj: string) {
    setSelectedObjectives((prev) =>
      prev.includes(obj) ? prev.filter((o) => o !== obj) : [...prev, obj]
    );
  }

  const canContinue = objective.trim().length >= 10;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">What do you want to learn?</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your research goal. This helps us suggest the right study type, audience, and questions.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          value={objective}
          onChange={(e) => onObjectiveChange(e.target.value)}
          placeholder="e.g. We want to understand why enterprise customers churn after the first 90 days and what onboarding improvements would help..."
          rows={4}
          className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSuggestions}
          disabled={loading || objective.trim().length < 10}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-3 w-3" />
              Suggest objectives
            </>
          )}
        </Button>
      </div>

      {suggestions && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Suggested research objectives
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.objectives.map((obj) => {
              const isSelected = selectedObjectives.includes(obj);
              return (
                <button
                  key={obj}
                  onClick={() => toggleObjective(obj)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-all ${
                    isSelected
                      ? "border-foreground/30 bg-stone-50 shadow-sm"
                      : "border-border hover:border-foreground/20"
                  }`}
                >
                  {obj}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
