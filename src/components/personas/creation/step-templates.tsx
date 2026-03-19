"use client";

import { useState } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { PERSONA_TEMPLATES } from "@/lib/personas/templates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StepTemplatesProps {
  personaCount: number;
  onPersonaCountChange: (count: number) => void;
  onContinue: (templateId: string) => Promise<void> | void;
  loading: boolean;
}

export function StepTemplates({
  personaCount,
  onPersonaCountChange,
  onContinue,
  loading,
}: StepTemplatesProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedTemplate = PERSONA_TEMPLATES.find((t) => t.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
  }

  async function handleContinue() {
    if (!selectedTemplate) return;
    await onContinue(selectedTemplate.id);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {PERSONA_TEMPLATES.map((tpl) => {
          const isSelected = tpl.id === selectedId;
          const points = tpl.exampleUseCases.slice(0, 4);
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => handleSelect(tpl.id)}
              className={cn(
                "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card p-5 text-left transition-all",
                "active:scale-[0.99]",
                isSelected
                  ? "border-primary/55 bg-primary/5 shadow-sm"
                  : "border-border/70 hover:border-foreground/25 hover:bg-muted/20 hover:shadow-sm"
              )}
            >
              {/* subtle accent (brings back the nice color transition) */}
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-16 opacity-0 transition-opacity",
                  "bg-gradient-to-b from-primary/12 to-transparent",
                  (isSelected || true) && "group-hover:opacity-100",
                  isSelected && "opacity-100"
                )}
              />

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-tight">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{tpl.description}</p>
                </div>

                <span
                  className={cn(
                    "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                    isSelected
                      ? "border-foreground/40 bg-foreground text-background"
                      : "border-border/70 bg-background text-muted-foreground group-hover:border-foreground/25"
                  )}
                  aria-hidden="true"
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0"
                    )}
                  />
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Key points</p>
                <ul className="space-y-1 text-xs text-muted-foreground/90">
                  {points.map((p, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="mt-1 h-1 w-1 rounded-full bg-muted-foreground/50" />
                      <span className="leading-snug">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </button>
          );
        })}
      </div>

      {/* Persona count + full-width Continue (1–100, consistent with other capped flows) */}
      <div className="space-y-3 pt-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            How many personas should we generate from this template?
          </p>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Number of personas: <span className="font-semibold">{personaCount}</span>
            </label>
            <input
              type="range"
              min={1}
              max={100}
              value={personaCount}
              onChange={(e) => onPersonaCountChange(Number(e.target.value))}
              disabled={loading}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => void handleContinue()}
          disabled={loading || !selectedTemplate}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing your description...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

