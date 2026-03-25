"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { createNewStudy } from "@/app/(dashboard)/studies/actions";

interface OrgContext {
  productName: string | null;
  productDescription: string | null;
  targetAudience: string | null;
  industry: string | null;
}

interface AvailableGroup {
  id: string;
  name: string;
  description: string | null;
  _count: { personas: number };
}

interface StudyCreatorProps {
  personaGroups: AvailableGroup[];
  orgContext: OrgContext | null;
}

const TEMPLATES = [
  { label: "Discovery Interview", description: "Understand user needs, behaviors, and pain points" },
  { label: "Feature Validation", description: "Validate a feature idea with target users" },
  { label: "Churn Analysis", description: "Understand why users leave your product" },
  { label: "Onboarding Feedback", description: "Evaluate the first-time user experience" },
];

export function StudyCreator({ personaGroups, orgContext }: StudyCreatorProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [studyType, setStudyType] = useState<"INTERVIEW" | "SURVEY">("INTERVIEW");

  async function handleSubmit(input?: string) {
    const description = input || value.trim();
    if (!description || loading) return;

    setLoading(true);

    try {
      // Step 1: AI generates study setup
      const setupRes = await fetch("/api/studies/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          personaGroups: personaGroups.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
          })),
          orgContext,
        }),
      });

      if (!setupRes.ok) {
        throw new Error("AI setup failed");
      }

      const setup = await setupRes.json();

      // Step 2: Create study with AI-generated data
      const result = await createNewStudy({
        title: setup.title || description.slice(0, 60),
        studyType,
        interviewGuide: setup.interviewGuide || "",
        personaGroupIds: setup.suggestedGroupIds?.length > 0
          ? setup.suggestedGroupIds
          : personaGroups.slice(0, 1).map((g) => g.id),
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Step 3: Redirect to study detail
      toast.success("Study created!");
      router.push(`/studies/${result.studyId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create study");
      setLoading(false);
    }
  }

  function handleTemplate(template: typeof TEMPLATES[0]) {
    setValue(template.description);
    handleSubmit(template.description);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Setting up your study...</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generating interview questions and selecting personas
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Chat Input */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
            <textarea
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="What do you want to learn? e.g. 'Why do enterprise users churn after 90 days'"
              rows={2}
              className="min-w-0 flex-1 resize-none border-0 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(["INTERVIEW", "SURVEY"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setStudyType(t)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    studyType === t
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "INTERVIEW" ? "Interview" : "Survey"}
                </button>
              ))}
            </div>
            <Button
              size="icon"
              disabled={!value.trim()}
              onClick={() => handleSubmit()}
              className="h-8 w-8 shrink-0 rounded-lg"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          Or start from a template
        </p>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.label}
              onClick={() => handleTemplate(t)}
              className="rounded-xl border p-4 text-left transition-all hover:border-foreground/20 hover:bg-muted/50"
            >
              <p className="text-sm font-medium">{t.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
