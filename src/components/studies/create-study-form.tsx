"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createNewStudy } from "@/app/(dashboard)/studies/actions";
import { StepSetup } from "./steps/step-setup";
import { StepQuestions, type SurveyQuestion } from "./steps/step-questions";
import { StepReview } from "./steps/step-review";

type StudyType = "INTERVIEW" | "SURVEY" | "FOCUS_GROUP" | "USABILITY_TEST";
type Step = "setup" | "questions" | "review";

const STEP_ORDER: Step[] = ["setup", "questions", "review"];
const STEP_LABELS: Record<Step, string> = {
  setup: "Setup",
  questions: "Questions",
  review: "Review",
};

interface PersonaGroup {
  id: string;
  name: string;
  description: string | null;
  personaCount?: number;
  _count?: { personas: number };
}

interface CreateStudyFormProps {
  personaGroups: PersonaGroup[];
  orgContext: {
    productName?: string | null;
    productDescription?: string | null;
    targetAudience?: string | null;
    industry?: string | null;
  } | null;
}

export function CreateStudyForm({ personaGroups, orgContext }: CreateStudyFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("setup");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studyType, setStudyType] = useState<StudyType>("INTERVIEW");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [interviewGuide, setInterviewGuide] = useState("");
  const [surveyQuestions, setSurveyQuestions] = useState<SurveyQuestion[]>([]);
  const [qualityScore, setQualityScore] = useState<{
    score: number;
    evaluations: Array<{ questionIndex: number; score: number; issues: string[]; explanation: string; suggestion: string | null }>;
    feedback: string;
    missingTopics: string[];
  } | null>(null);

  const currentStepIndex = STEP_ORDER.indexOf(step);

  function goTo(s: Step) {
    setStep(s);
  }

  async function handleCreate() {
    const result = await createNewStudy({
      title,
      studyType,
      description,
      interviewGuide: studyType === "INTERVIEW" ? interviewGuide : undefined,
      surveyQuestions: studyType === "SURVEY" ? surveyQuestions.filter((q) => q.text.trim()) : undefined,
      personaGroupIds: selectedGroupIds,
    });

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Study created!");
    router.push(`/studies/${result.studyId}`);
  }

  const selectedGroups = personaGroups
    .filter((g) => selectedGroupIds.includes(g.id))
    .map((g) => ({
      id: g.id,
      name: g.name,
      personaCount: g._count?.personas ?? g.personaCount ?? 0,
    }));

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-1">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex items-center">
            {i > 0 && <div className="h-px w-8 bg-border mx-1" />}
            <button
              onClick={() => i < currentStepIndex && goTo(s)}
              disabled={i > currentStepIndex}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                s === step
                  ? "bg-foreground text-background"
                  : i < currentStepIndex
                    ? "bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer"
                    : "bg-stone-50 text-stone-300"
              }`}
            >
              {STEP_LABELS[s]}
            </button>
          </div>
        ))}
      </div>

      {/* Steps */}
      {step === "setup" && (
        <StepSetup
          title={title}
          onTitleChange={setTitle}
          description={description}
          onDescriptionChange={setDescription}
          studyType={studyType}
          onStudyTypeChange={setStudyType}
          groups={personaGroups}
          selectedGroupIds={selectedGroupIds}
          onGroupSelect={setSelectedGroupIds}
          onNext={() => goTo("questions")}
        />
      )}

      {step === "questions" && (
        <StepQuestions
          studyType={studyType as "INTERVIEW" | "SURVEY"}
          title={title}
          onTitleChange={setTitle}
          interviewGuide={interviewGuide}
          onGuideChange={setInterviewGuide}
          surveyQuestions={surveyQuestions}
          onSurveyQuestionsChange={setSurveyQuestions}
          orgContext={orgContext}
          onNext={() => goTo("review")}
          onBack={() => goTo("setup")}
          onEvaluationComplete={(score, evaluations, feedback, missingTopics) => {
            setQualityScore({ score, evaluations, feedback, missingTopics });
          }}
        />
      )}

      {step === "review" && (
        <StepReview
          studyType={studyType as "INTERVIEW" | "SURVEY"}
          title={title}
          interviewGuide={interviewGuide}
          surveyQuestions={surveyQuestions}
          selectedGroups={selectedGroups}
          qualityScore={qualityScore}
          onBack={() => goTo("questions")}
          onBackToQuestions={() => goTo("questions")}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
