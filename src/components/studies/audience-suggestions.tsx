"use client";

import { useState, useEffect } from "react";
import { Loader2, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";

interface MissingGroup {
  name: string;
  description: string;
  reason: string;
}

interface AudienceSuggestion {
  suggestedExistingGroupIds: string[];
  missingGroups: MissingGroup[];
  sampleSizeReasoning: string;
  recommendedSampleSize: { min: number; max: number; reasoning: string };
}

interface AudienceSuggestionsProps {
  researchObjective: string;
  studyType: string;
  existingGroups: Array<{
    id: string;
    name: string;
    description: string | null;
    personaCount: number;
  }>;
  orgContext: {
    productName?: string | null;
    targetAudience?: string | null;
    industry?: string | null;
  } | null;
  onSuggestSelect?: (groupIds: string[]) => void;
  onCreateGroup?: (name: string, description: string) => void;
}

export function AudienceSuggestions({
  researchObjective,
  studyType,
  existingGroups,
  orgContext,
  onSuggestSelect,
  onCreateGroup,
}: AudienceSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AudienceSuggestion | null>(null);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (fetched || !researchObjective.trim() || existingGroups.length === 0) return;

    const timeout = setTimeout(() => {
      fetchSuggestions();
    }, 500);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchSuggestions() {
    setLoading(true);
    setFetched(true);
    try {
      const res = await fetch("/api/studies/suggest-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researchObjective,
          studyType,
          existingGroups: existingGroups.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            personaCount: g.personaCount,
          })),
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
        throw new Error(data.error || "Failed to get suggestions");
      }

      const data: AudienceSuggestion = await res.json();
      setSuggestion(data);

      if (data.suggestedExistingGroupIds.length > 0) {
        onSuggestSelect?.(data.suggestedExistingGroupIds);
      }
    } catch (error) {
      console.error("Audience suggestion failed:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analyzing your research goals...
        </div>
      </div>
    );
  }

  if (!suggestion) return null;

  const hasMissing = suggestion.missingGroups.length > 0;
  const sampleSize = suggestion.recommendedSampleSize;

  return (
    <div className="space-y-3">
      {hasMissing && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <p className="text-xs font-medium text-amber-800">
              Consider adding for better coverage
            </p>
          </div>
          {suggestion.missingGroups.map((mg) => (
            <div key={mg.name} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-900">{mg.name}</p>
                <p className="text-xs text-amber-700 mt-0.5">{mg.reason}</p>
              </div>
              {onCreateGroup && (
                <button
                  onClick={() => onCreateGroup(mg.name, mg.description)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Create
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          Recommended: {sampleSize.min}-{sampleSize.max} participants
        </span>
      </div>
    </div>
  );
}
