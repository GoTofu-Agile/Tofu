"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Rocket } from "lucide-react";

interface StepSourcesProps {
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

interface SourcesSettingsProps {
  depth: "quick" | "deep";
  onDepthChange: (depth: "quick" | "deep") => void;
  personaCount: number;
  onPersonaCountChange: (count: number) => void;
  includeSkeptics: boolean;
  onIncludeSkepticsChange: (value: boolean) => void;
  /** When false, research depth controls are hidden (depth props are still used server-side if needed). */
  showResearchDepth?: boolean;
}

export function SourcesSettings({
  depth,
  onDepthChange,
  personaCount,
  onPersonaCountChange,
  includeSkeptics,
  onIncludeSkepticsChange,
  showResearchDepth = true,
}: SourcesSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Research depth */}
      {showResearchDepth && (
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
              <span className="block text-xs text-muted-foreground mt-0.5">2-3 searches, faster</span>
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
              <span className="block text-xs text-muted-foreground mt-0.5">6-8 searches, more thorough</span>
            </button>
          </div>
        </div>
      )}

      {/* Skeptics — above persona count */}
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
    </div>
  );
}

export function StepSources({
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
  return (
    <div className="space-y-6">
      <SourcesSettings
        depth={depth}
        onDepthChange={onDepthChange}
        personaCount={personaCount}
        onPersonaCountChange={onPersonaCountChange}
        includeSkeptics={includeSkeptics}
        onIncludeSkepticsChange={onIncludeSkepticsChange}
        showResearchDepth
      />
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
