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
import { motion, AnimatePresence } from "framer-motion";
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

// Animated save indicator with checkmark draw
function SaveIndicator({ saving, hasSaved }: { saving: boolean; hasSaved: boolean }) {
  return (
    <AnimatePresence mode="wait">
      {saving ? (
        <motion.p
          key="saving"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-xs text-muted-foreground"
        >
          Saving...
        </motion.p>
      ) : hasSaved ? (
        <motion.div
          key="saved"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.5, times: [0, 0.1, 0.7, 1] }}
          className="flex items-center gap-1 text-xs text-green-600"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <motion.path
              d="M3 7.5L5.5 10L11 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </svg>
          Saved
        </motion.div>
      ) : (
        <motion.p
          key="hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground"
        >
          Add one clear goal to continue.
        </motion.p>
      )}
    </AnimatePresence>
  );
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
  const [savedObjective, setSavedObjective] = useState(false);
  const [shakeType, setShakeType] = useState<string | null>(null);

  async function handleObjectiveBlur() {
    if (!objective.trim()) return;
    setSavingObjective(true);
    await updateStudyDescription(studyId, objective);
    setSavingObjective(false);
    setSavedObjective(true);
    setTimeout(() => setSavedObjective(false), 3000);
  }

  async function handleTypeSelect(newType: StudyType) {
    onStudyTypeChange(newType);
    await updateStudyType(studyId, newType);
    router.refresh();
  }

  function handleLockedClick(type: string) {
    setShakeType(type);
    setTimeout(() => setShakeType(null), 500);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* Left: All form inputs */}
      <div className="lg:col-span-3 space-y-8">
        {/* Study Type — boxes in a row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <label className="text-sm font-medium">Study type</label>
          <p className="text-xs text-muted-foreground">
            Interview is available now.
          </p>
          <div className="flex gap-2 flex-wrap">
            {STUDY_TYPES.map((st) => {
              const Icon = st.icon;
              const isSelected = studyType === st.type;
              return (
                <div key={st.type} className="relative group/type">
                  <motion.button
                    disabled={!st.enabled}
                    onClick={() => st.enabled ? handleTypeSelect(st.type) : handleLockedClick(st.type)}
                    whileHover={st.enabled ? { scale: 1.05, y: -2 } : undefined}
                    whileTap={st.enabled ? { scale: 0.97 } : undefined}
                    animate={
                      shakeType === st.type
                        ? { x: [0, -4, 4, -4, 4, 0] }
                        : isSelected
                          ? { scale: 1 }
                          : {}
                    }
                    transition={
                      shakeType === st.type
                        ? { duration: 0.4 }
                        : { type: "spring", stiffness: 500, damping: 25 }
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors duration-150",
                      st.enabled
                        ? isSelected
                          ? "border-foreground bg-foreground text-background animate-glow-pulse"
                          : "border-border hover:border-foreground/30 hover:shadow-sm cursor-pointer"
                        : "border-border/50 opacity-40 cursor-not-allowed"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{st.label}</span>
                    {!st.enabled && <Lock className="h-3 w-3 shrink-0" />}
                  </motion.button>
                  {!st.enabled && (
                    <AnimatePresence>
                      {shakeType === st.type && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] whitespace-nowrap pointer-events-none z-10"
                        >
                          Coming soon
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                  {!st.enabled && shakeType !== st.type && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[11px] whitespace-nowrap opacity-0 group-hover/type:opacity-100 transition-opacity pointer-events-none z-10">
                      Coming soon
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Study Objective */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-2"
        >
          <label className="text-sm font-medium">
            What do you want to learn?
          </label>
          <p className="text-xs text-muted-foreground">
            This shapes your interview guide.
          </p>
          <textarea
            value={objective}
            onChange={(e) => onObjectiveChange(e.target.value)}
            onBlur={handleObjectiveBlur}
            placeholder="e.g. Understand why enterprise users churn after 90 days, what alternatives they consider, and what would make them stay"
            rows={3}
            className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30 transition-all"
          />
          <SaveIndicator saving={savingObjective} hasSaved={savedObjective && !!objective.trim()} />
        </motion.div>

        {/* Persona Groups */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-2"
        >
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
                  Create a persona group first
                </Link>
                , then come back.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableGroups.map((g, i) => {
                const isSelected = selectedGroupIds.includes(g.id);
                return (
                  <motion.button
                    key={g.id}
                    onClick={() => handleToggleGroup(g.id)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                    whileHover={{ y: -1, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-150",
                      isSelected
                        ? "border-foreground/30 bg-stone-50 shadow-sm"
                        : "border-border hover:border-foreground/20"
                    )}
                  >
                    <motion.div
                      animate={isSelected
                        ? { backgroundColor: "var(--foreground)", borderColor: "var(--foreground)" }
                        : { backgroundColor: "transparent", borderColor: "var(--border)" }
                      }
                      transition={{ duration: 0.2 }}
                      className="flex h-5 w-5 items-center justify-center rounded-md border"
                    >
                      <AnimatePresence>
                        {isSelected && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          >
                            <Check className="h-3 w-3 text-background" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.div>
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
                  </motion.button>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Right: Live preview card — always visible */}
      <motion.div
        className="lg:col-span-2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
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
      </motion.div>
    </div>
  );
}
