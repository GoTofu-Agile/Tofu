"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";
import { RESEARCH_SOURCES } from "@/lib/research/build-queries";

interface StepSourcesProps {
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
  depth: "quick" | "deep";
  onDepthChange: (depth: "quick" | "deep") => void;
  personaCount: number;
  onPersonaCountChange: (count: number) => void;
  includeSkeptics: boolean;
  onIncludeSkepticsChange: (value: boolean) => void;
  onBack: () => void;
  onGenerate: () => void;
  loading: boolean;
}

export function StepSources({
  selectedSources,
  onSourcesChange,
  depth,
  onDepthChange,
  personaCount,
  onPersonaCountChange,
  includeSkeptics,
  onIncludeSkepticsChange,
  onBack,
  onGenerate,
  loading,
}: StepSourcesProps) {
  function toggleSource(id: string) {
    onSourcesChange(
      selectedSources.includes(id)
        ? selectedSources.filter((s) => s !== id)
        : [...selectedSources, id]
    );
  }

  return (
    <div className="space-y-6">
      {/* Source selection */}
      <div className="space-y-3">
        <Label>Data Sources</Label>
        <p className="text-xs text-muted-foreground">
          Select where to search for real user data. This grounds your personas in reality.
        </p>
        <div className="space-y-2">
          {RESEARCH_SOURCES.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => toggleSource(source.id)}
              className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                selectedSources.includes(source.id)
                  ? "border-primary bg-primary/[0.03]"
                  : "border-border hover:border-foreground/20"
              }`}
            >
              <div
                className={`h-4 w-4 rounded border-2 shrink-0 ${
                  selectedSources.includes(source.id)
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40"
                }`}
              />
              <div>
                <span className="text-sm font-medium">{source.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {source.description}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Research depth */}
      <div className="space-y-2">
        <Label>Research Depth</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDepthChange("quick")}
            className={`flex-1 rounded-lg border p-3 text-sm transition-colors ${
              depth === "quick"
                ? "border-primary bg-primary/[0.03] font-medium"
                : "border-border hover:border-foreground/20"
            }`}
          >
            Quick
            <span className="block text-xs text-muted-foreground mt-0.5">
              2-3 searches, faster
            </span>
          </button>
          <button
            type="button"
            onClick={() => onDepthChange("deep")}
            className={`flex-1 rounded-lg border p-3 text-sm transition-colors ${
              depth === "deep"
                ? "border-primary bg-primary/[0.03] font-medium"
                : "border-border hover:border-foreground/20"
            }`}
          >
            Deep
            <span className="block text-xs text-muted-foreground mt-0.5">
              6-8 searches, more thorough
            </span>
          </button>
        </div>
      </div>

      {/* Persona count */}
      <div className="space-y-2">
        <Label>
          Number of Personas: <span className="font-semibold">{personaCount}</span>
        </Label>
        <input
          type="range"
          min={3}
          max={500}
          value={personaCount}
          onChange={(e) => onPersonaCountChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>3</span>
          <span>500</span>
        </div>
      </div>

      {/* Skeptics */}
      <div className="flex items-center gap-3">
        <input
          id="skeptics"
          type="checkbox"
          checked={includeSkeptics}
          onChange={(e) => onIncludeSkepticsChange(e.target.checked)}
          className="rounded accent-primary"
        />
        <Label htmlFor="skeptics" className="text-sm cursor-pointer">
          Include skeptics & critics (recommended)
        </Label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onGenerate} className="flex-1" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Research & Generate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
