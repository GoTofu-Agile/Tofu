"use client";

import { useState } from "react";
import { Check, Users, MessageSquare, ClipboardList, Users2, Monitor, Lock, ChevronDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SAMPLE_SIZE_GUIDELINES } from "@/lib/ai/mom-test-rules";

type StudyType = "INTERVIEW" | "SURVEY" | "FOCUS_GROUP" | "USABILITY_TEST";

const STUDY_TYPES = [
  { type: "INTERVIEW" as const, label: "Interview", icon: MessageSquare, enabled: true },
  { type: "SURVEY" as const, label: "Survey", icon: ClipboardList, enabled: true },
  { type: "FOCUS_GROUP" as const, label: "Focus Group", icon: Users2, enabled: false },
  { type: "USABILITY_TEST" as const, label: "Usability Test", icon: Monitor, enabled: false },
];

interface PersonaGroup {
  id: string;
  name: string;
  description: string | null;
  personaCount?: number;
  _count?: { personas: number };
}

interface StepSetupProps {
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  studyType: StudyType;
  onStudyTypeChange: (type: StudyType) => void;
  groups: PersonaGroup[];
  selectedGroupIds: string[];
  onGroupSelect: (ids: string[]) => void;
  onNext: () => void;
}

export function StepSetup({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  studyType,
  onStudyTypeChange,
  groups,
  selectedGroupIds,
  onGroupSelect,
  onNext,
}: StepSetupProps) {
  const [showDescription, setShowDescription] = useState(!!description);

  function toggleGroup(id: string) {
    onGroupSelect(
      selectedGroupIds.includes(id)
        ? selectedGroupIds.filter((s) => s !== id)
        : [...selectedGroupIds, id]
    );
  }

  const canContinue = title.trim() && selectedGroupIds.length > 0;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Study title</label>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Onboarding Experience Research"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
          autoFocus
        />
        {!showDescription ? (
          <button
            onClick={() => setShowDescription(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <ChevronDown className="h-3 w-3" />
            Add description
          </button>
        ) : (
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="What do you want to learn from this study?"
            rows={2}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
          />
        )}
      </div>

      {/* Study Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Study type</label>
        <div className="flex gap-2">
          {STUDY_TYPES.map((st) => {
            const Icon = st.icon;
            const isSelected = studyType === st.type;
            return (
              <button
                key={st.type}
                disabled={!st.enabled}
                onClick={() => st.enabled && onStudyTypeChange(st.type)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                  st.enabled
                    ? isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground/30"
                    : "border-border/50 opacity-40 cursor-not-allowed"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {st.label}
                {!st.enabled && <Lock className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Persona Groups */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Persona groups</label>
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center">
            <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No persona groups yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Create personas first, then come back.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const count = g._count?.personas ?? g.personaCount ?? 0;
              const isSelected = selectedGroupIds.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGroup(g.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                    isSelected
                      ? "border-foreground/30 bg-stone-50 shadow-sm"
                      : "border-border hover:border-foreground/20"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-md border transition-colors",
                      isSelected ? "bg-foreground border-foreground" : "border-border"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-background" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    {g.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {g.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {count} personas
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sample Size Indicator */}
      {selectedGroupIds.length > 0 && (() => {
        const selectedTotal = groups
          .filter((g) => selectedGroupIds.includes(g.id))
          .reduce((sum, g) => sum + (g._count?.personas ?? g.personaCount ?? 0), 0);
        const guidelines = SAMPLE_SIZE_GUIDELINES[studyType as keyof typeof SAMPLE_SIZE_GUIDELINES];
        if (!guidelines) return null;
        const isEnough = selectedTotal >= guidelines.min;
        const isTooMany = selectedTotal > guidelines.max;
        return (
          <div className={cn(
            "rounded-lg border px-4 py-3 text-xs",
            isEnough && !isTooMany
              ? "border-green-200 bg-green-50 text-green-800"
              : isTooMany
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
          )}>
            <div className="flex items-center gap-2">
              {isEnough ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>
                <strong>{selectedTotal}</strong> personas selected
                {" · "}
                Recommended: {guidelines.min}-{guidelines.max} for {studyType.toLowerCase().replace("_", " ")}s
              </span>
            </div>
            {!isEnough && (
              <p className="mt-1 ml-5.5 text-[11px] opacity-80">
                Consider adding more personas for reliable insights.
              </p>
            )}
          </div>
        );
      })()}

      {/* Continue */}
      <div className="flex items-center justify-end pt-2">
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
