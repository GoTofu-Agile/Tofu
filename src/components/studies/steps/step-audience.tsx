"use client";

import { useState } from "react";
import { Check, Users, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonaGroup {
  id: string;
  name: string;
  description: string | null;
  personaCount?: number;
  _count?: { personas: number };
}

interface StepAudienceProps {
  groups: PersonaGroup[];
  selected: string[];
  onSelect: (ids: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepAudience({ groups, selected, onSelect, onNext, onBack }: StepAudienceProps) {
  function toggle(id: string) {
    onSelect(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]
    );
  }

  const hasSelection = selected.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Select persona groups</h3>
        <p className="text-sm text-muted-foreground mt-1">Choose which personas should participate in this study.</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No persona groups yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create personas first, then come back to set up a study.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const count = g._count?.personas ?? g.personaCount ?? 0;
            const isSelected = selected.includes(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggle(g.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                  isSelected
                    ? "border-foreground/30 bg-stone-50 shadow-sm"
                    : "border-border hover:border-foreground/20"
                )}
              >
                <div className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                  isSelected ? "bg-foreground border-foreground" : "border-border"
                )}>
                  {isSelected && <Check className="h-3 w-3 text-background" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.name}</p>
                  {g.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{g.description}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{count} personas</span>
              </button>
            );
          })}
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
          disabled={!hasSelection}
          className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
