"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Users,
  MessageSquare,
  ClipboardList,
  Users2,
  Monitor,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateStudyType,
  updateStudyDescription,
  toggleStudyGroup,
} from "@/app/(dashboard)/studies/actions";
import { SetupPreviewCard } from "../setup-preview-card";

type StudyType = "INTERVIEW" | "SURVEY" | "FOCUS_GROUP" | "USABILITY_TEST";

const STUDY_TYPES = [
  {
    type: "INTERVIEW" as const,
    label: "Interview",
    description: "1-on-1 conversations with personas. Deep insights into behaviors, motivations, and pain points.",
    icon: MessageSquare,
    enabled: true,
  },
  {
    type: "SURVEY" as const,
    label: "Survey",
    description: "Structured questions across many personas at once. Quantitative data and trends.",
    icon: ClipboardList,
    enabled: false,
  },
  {
    type: "FOCUS_GROUP" as const,
    label: "Focus Group",
    description: "Group discussion between 3-5 personas. Dynamics and consensus.",
    icon: Users2,
    enabled: false,
  },
  {
    type: "USABILITY_TEST" as const,
    label: "Usability Test",
    description: "Personas test your product concept and give feedback.",
    icon: Monitor,
    enabled: false,
  },
];

interface AvailableGroup {
  id: string;
  name: string;
  description?: string | null;
  _count: { personas: number };
}

interface FlowStepSetupProps {
  studyId: string;
  title: string;
  onTitleChange: (title: string) => void;
  studyType: string;
  onStudyTypeChange: (type: string) => void;
  objective: string;
  onObjectiveChange: (objective: string) => void;
  availableGroups: AvailableGroup[];
  selectedGroupIds: string[];
  onGroupToggle: (groupId: string, add: boolean) => void;
  orgContext?: {
    productName?: string | null;
    productDescription?: string | null;
    targetAudience?: string | null;
    industry?: string | null;
  } | null;
}

export function FlowStepSetup({
  studyId,
  title,
  onTitleChange,
  studyType,
  onStudyTypeChange,
  objective,
  onObjectiveChange,
  availableGroups,
  selectedGroupIds,
  onGroupToggle,
  orgContext,
}: FlowStepSetupProps) {
  const router = useRouter();
  const [savingObjective, setSavingObjective] = useState(false);

  async function handleObjectiveBlur() {
    if (!objective.trim()) return;
    setSavingObjective(true);
    await updateStudyDescription(studyId, objective);
    setSavingObjective(false);
  }

  async function handleTypeSelect(newType: StudyType) {
    onStudyTypeChange(newType);
    await updateStudyType(studyId, newType);
    router.refresh();
  }

  async function handleToggleGroup(groupId: string) {
    const isSelected = selectedGroupIds.includes(groupId);
    onGroupToggle(groupId, !isSelected);
    await toggleStudyGroup(studyId, groupId, !isSelected);
    router.refresh();
  }

  const selectedGroups = availableGroups
    .filter((g) => selectedGroupIds.includes(g.id))
    .map((g) => ({ name: g.name, personaCount: g._count.personas }));

  const totalPersonas = selectedGroups.reduce(
    (sum, g) => sum + g.personaCount,
    0
  );

  // ── Setup: Type cards always visible at top, then form below ──

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in-up">
      {/* Left: All form inputs */}
      <div className="lg:col-span-3 space-y-8">
        {/* Study Type — boxes in a row */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Study type</label>
          <div className="flex gap-2 flex-wrap">
            {STUDY_TYPES.map((st) => {
              const Icon = st.icon;
              const isSelected = studyType === st.type;
              return (
                <button
                  key={st.type}
                  disabled={!st.enabled}
                  onClick={() => st.enabled && handleTypeSelect(st.type)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-all duration-150",
                    st.enabled
                      ? isSelected
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground/30 hover:shadow-sm active:scale-[0.98] cursor-pointer"
                      : "border-border/50 opacity-40 cursor-not-allowed"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-medium">{st.label}</span>
                  {!st.enabled && <Lock className="h-3 w-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Study Objective */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            What do you want to learn?
          </label>
          <p className="text-xs text-muted-foreground">
            This shapes your interview guide in the next step.
          </p>
          <textarea
            value={objective}
            onChange={(e) => onObjectiveChange(e.target.value)}
            onBlur={handleObjectiveBlur}
            placeholder="e.g. Understand why enterprise users churn after 90 days, what alternatives they consider, and what would make them stay"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
          />
        </div>

        {/* Persona Groups */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Persona groups to interview
          </label>
          <p className="text-xs text-muted-foreground">
            Select which personas should be interviewed for this study.
          </p>
          {availableGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <Users className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No persona groups yet.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                <Link href="/personas/new" className="underline">
                  Create personas first
                </Link>
                , then come back.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableGroups.map((g) => {
                const isSelected = selectedGroupIds.includes(g.id);
                return (
                  <button
                    key={g.id}
                    onClick={() => handleToggleGroup(g.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-150 active:scale-[0.98]",
                      isSelected
                        ? "border-foreground/30 bg-stone-50 shadow-sm"
                        : "border-border hover:border-foreground/20"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-150",
                        isSelected
                          ? "bg-foreground border-foreground"
                          : "border-border"
                      )}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-background animate-scale-in" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {g.name}
                      </p>
                      {g.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {g.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {g._count.personas} personas
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Live preview card — always visible */}
      <div className="lg:col-span-2">
        <div className="sticky top-6">
          <p className="text-[11px] font-medium text-muted-foreground mb-3 uppercase tracking-wider">
            Study preview
          </p>
          <SetupPreviewCard
            title={title}
            studyType={studyType}
            objective={objective}
            selectedGroups={selectedGroups}
            totalPersonas={totalPersonas}
            orgContext={orgContext}
          />
        </div>
      </div>
    </div>
  );
}
