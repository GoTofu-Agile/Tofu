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
} from "lucide-react";
import type { StudyType } from "@prisma/client";

interface PersonaGroup {
  id: string;
  name: string;
  description: string | null;
  personaCount: number;
  _count: { personas: number };
}

const studyTypes: {
  value: StudyType;
  label: string;
  description: string;
  icon: typeof MessageSquare;
}[] = [
  {
    value: "INTERVIEW",
    label: "Interview",
    description: "1-on-1 conversation with a persona. Best for deep insights.",
    icon: MessageSquare,
  },
  {
    value: "SURVEY",
    label: "Survey",
    description: "Structured questions across multiple personas.",
    icon: ClipboardList,
  },
  {
    value: "FOCUS_GROUP",
    label: "Focus Group",
    description: "Group discussion with multiple personas at once.",
    icon: Users,
  },
];

export function CreateStudyForm({
  personaGroups,
}: {
  personaGroups: PersonaGroup[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studyType, setStudyType] = useState<StudyType>("INTERVIEW");
  const [interviewGuide, setInterviewGuide] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
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
        studyType,
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

  return (
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

      {/* Study Type */}
      <div className="space-y-2">
        <Label>Study Type</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {studyTypes.map((type) => {
            const Icon = type.icon;
            const selected = studyType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setStudyType(type.value)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/20"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${selected ? "text-primary" : "text-muted-foreground"}`}
                />
                <p className="mt-2 text-sm font-medium">{type.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interview Guide */}
      <div className="space-y-2">
        <Label htmlFor="guide">
          Interview Guide{" "}
          <span className="text-muted-foreground">(optional)</span>
        </Label>
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
  );
}
