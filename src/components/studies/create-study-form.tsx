"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createNewStudy } from "@/app/(dashboard)/studies/actions";
import {
  MessageSquare,
  ClipboardList,
  Users,
  Loader2,
  Check,
  Sparkles,
  Zap,
  ArrowLeft,
  Lock,
} from "lucide-react";

interface PersonaGroup {
  id: string;
  name: string;
  description: string | null;
  personaCount: number;
  _count: { personas: number };
}

interface OrgContext {
  productName: string | null;
  productDescription: string | null;
  targetAudience: string | null;
  industry: string | null;
}

type Mode = "pick" | "quick-describe" | "quick-review" | "manual-form";

const studyTypes = [
  {
    id: "INTERVIEW" as const,
    label: "Interview",
    description: "1-on-1 deep conversation with a persona.",
    icon: MessageSquare,
  },
  {
    id: "SURVEY" as const,
    label: "Survey",
    description: "Structured questions across multiple personas.",
    icon: ClipboardList,
    comingSoon: true,
  },
  {
    id: "DISCUSSION" as const,
    label: "Discussion",
    description: "Group discussion between personas about a topic.",
    icon: Users,
    comingSoon: true,
  },
];

export function CreateStudyForm({
  personaGroups,
  orgContext,
}: {
  personaGroups: PersonaGroup[];
  orgContext: OrgContext | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("pick");

  // Quick Start state
  const [quickDescription, setQuickDescription] = useState("");
  const [settingUp, setSettingUp] = useState(false);

  // Form state (shared by quick-review and manual-form)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [interviewGuide, setInterviewGuide] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [generatingGuide, setGeneratingGuide] = useState(false);
  const [loading, setLoading] = useState(false);

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setInterviewGuide("");
    setSelectedGroups([]);
  }

  async function handleQuickSetup() {
    if (!quickDescription.trim()) {
      toast.error("Describe what you want to learn");
      return;
    }

    setSettingUp(true);
    try {
      const res = await fetch("/api/studies/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: quickDescription.trim(),
          personaGroups: personaGroups.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
          })),
          orgContext,
        }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      setTitle(data.title || "");
      setInterviewGuide(data.interviewGuide || "");
      setSelectedGroups(data.suggestedGroupIds || []);
      setMode("quick-review");
    } catch {
      toast.error("Failed to set up study. Please try again.");
    } finally {
      setSettingUp(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (selectedGroups.length === 0) {
      toast.error("Select at least one persona group");
      return;
    }

    setLoading(true);
    try {
      const result = await createNewStudy({
        title: title.trim(),
        description: description.trim() || undefined,
        studyType: "INTERVIEW",
        interviewGuide: interviewGuide.trim() || undefined,
        personaGroupIds: selectedGroups,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Study created!");
      router.push(`/studies/${result.studyId}`);
    } catch {
      toast.error("Failed to create study");
    } finally {
      setLoading(false);
    }
  }

  async function generateGuide() {
    setGeneratingGuide(true);
    try {
      const res = await fetch("/api/studies/generate-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || undefined,
          studyType: "INTERVIEW",
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInterviewGuide(data.guide);
      toast.success("Interview guide generated!");
    } catch {
      toast.error("Failed to generate guide");
    } finally {
      setGeneratingGuide(false);
    }
  }

  // ── Method Picker ──────────────────────────────────────────────

  if (mode === "pick") {
    return (
      <div className="space-y-4">
        {/* Quick Start — full width */}
        <button
          type="button"
          onClick={() => setMode("quick-describe")}
          className="group relative w-full rounded-lg border-2 border-primary/30 bg-primary/5 p-6 text-left transition-colors hover:border-primary hover:bg-primary/10"
        >
          <Badge className="absolute top-4 right-4 text-xs">Recommended</Badge>
          <Zap className="h-6 w-6 text-primary" />
          <p className="mt-3 text-lg font-semibold">Quick Start</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe what you want to learn — AI sets up your study
            automatically.
          </p>
        </button>

        {/* Study type cards — 3 columns */}
        <div className="grid gap-3 sm:grid-cols-3">
          {studyTypes.map((type) => {
            const Icon = type.icon;
            const disabled = type.comingSoon;

            return (
              <button
                key={type.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    resetForm();
                    setMode("manual-form");
                  }
                }}
                className={`relative rounded-lg border p-4 text-left transition-colors ${
                  disabled
                    ? "cursor-not-allowed border-border opacity-50"
                    : "border-border hover:border-primary hover:bg-primary/5"
                }`}
              >
                {disabled ? (
                  <Lock className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                )}
                <p className="mt-2 text-sm font-medium">{type.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {type.description}
                </p>
                {disabled && (
                  <Badge
                    variant="secondary"
                    className="mt-2 text-[10px]"
                  >
                    Coming Soon
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Quick Start: Describe ──────────────────────────────────────

  if (mode === "quick-describe") {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setMode("pick")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="space-y-2">
          <Label htmlFor="quick-desc" className="text-base font-medium">
            What do you want to learn?
          </Label>
          <Textarea
            id="quick-desc"
            value={quickDescription}
            onChange={(e) => setQuickDescription(e.target.value)}
            placeholder="e.g. I want to understand how users feel about our new cycle prediction feature and what would make them trust it more"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">
            Be specific about what you want to learn. AI will generate a study
            title, interview questions, and suggest relevant persona groups.
          </p>
        </div>

        <Button
          onClick={handleQuickSetup}
          disabled={settingUp || !quickDescription.trim()}
          className="w-full"
        >
          {settingUp ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up your study...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Set up my study
            </>
          )}
        </Button>
      </div>
    );
  }

  // ── Study Form (shared by quick-review and manual-form) ────────

  const isQuickReview = mode === "quick-review";

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => {
          if (isQuickReview) {
            setMode("quick-describe");
          } else {
            resetForm();
            setMode("pick");
          }
        }}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {isQuickReview && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
            AI set up your study. Review and edit anything below before
            creating.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Study Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Onboarding Flow Feedback"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What do you want to learn from this study?"
            rows={2}
          />
        </div>

        {/* Interview Guide */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="guide">
              Interview Guide{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generatingGuide || !title.trim()}
              onClick={generateGuide}
            >
              {generatingGuide ? (
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-3 w-3" />
              )}
              {interviewGuide ? "Regenerate" : "Generate with AI"}
            </Button>
          </div>
          <Textarea
            id="guide"
            value={interviewGuide}
            onChange={(e) => setInterviewGuide(e.target.value)}
            placeholder={`Questions or topics to cover, e.g.:\n- What was your first impression of the onboarding?\n- Where did you get confused?\n- What would make you come back?`}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            These guide the AI interviewer. Leave blank for open-ended
            conversation.
          </p>
        </div>

        {/* Persona Groups */}
        <div className="space-y-2">
          <Label>Persona Groups *</Label>
          {personaGroups.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No persona groups yet. Create one first in the Personas section.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {personaGroups.map((group) => {
                const selected = selectedGroups.includes(group.id);
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-foreground/20"
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{group.name}</p>
                      {group.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {group.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {group._count.personas} personas
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !title.trim() || selectedGroups.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Study"
          )}
        </Button>
      </form>
    </div>
  );
}
