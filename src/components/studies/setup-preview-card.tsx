"use client";

import { useState } from "react";
import {
  MessageSquare,
  ClipboardList,
  Users2,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Building2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SAMPLE_SIZE_GUIDELINES } from "@/lib/ai/mom-test-rules";

const TYPE_CONFIG: Record<string, { label: string; icon: typeof MessageSquare }> = {
  INTERVIEW: { label: "Interview", icon: MessageSquare },
  SURVEY: { label: "Survey", icon: ClipboardList },
  FOCUS_GROUP: { label: "Focus Group", icon: Users2 },
  USABILITY_TEST: { label: "Usability Test", icon: Monitor },
};

interface QuestionPreview {
  index: number;
  text: string;
}

interface SetupPreviewCardProps {
  title: string;
  studyType: string;
  objective: string;
  selectedGroups: Array<{ name: string; personaCount: number; description?: string | null }>;
  totalPersonas: number;
  orgContext?: {
    productName?: string | null;
    productDescription?: string | null;
    targetAudience?: string | null;
    industry?: string | null;
  } | null;
  questions?: QuestionPreview[];
  onEditCompany?: () => void;
}

export function SetupPreviewCard({
  title,
  studyType,
  objective,
  selectedGroups,
  totalPersonas,
  orgContext,
  questions,
  onEditCompany,
}: SetupPreviewCardProps) {
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const typeConfig = TYPE_CONFIG[studyType];
  const guidelines =
    SAMPLE_SIZE_GUIDELINES[studyType as keyof typeof SAMPLE_SIZE_GUIDELINES];
  const isEnough = guidelines ? totalPersonas >= guidelines.min : false;
  const isTooMany = guidelines ? totalPersonas > guidelines.max : false;
  const hasCompany = orgContext?.productName || orgContext?.productDescription;

  return (
    <div className="rounded-2xl border bg-muted/5 p-5 space-y-4 transition-all duration-300">
      {/* Company context */}
      {hasCompany && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Building2 className="h-3 w-3" />
              {orgContext?.productName || "Your company"}
            </div>
            {onEditCompany && (
              <button
                onClick={onEditCompany}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
          {orgContext?.productDescription && (
            <p className="text-[11px] text-muted-foreground/60 line-clamp-2">
              {orgContext.productDescription}
            </p>
          )}
          {orgContext?.industry && (
            <span className="inline-block text-[10px] text-muted-foreground/50 bg-muted rounded px-1.5 py-0.5">
              {orgContext.industry}
            </span>
          )}
          <div className="h-px bg-border mt-2" />
        </div>
      )}

      {/* Title */}
      <div className="min-h-[24px]">
        {title.trim() ? (
          <h3 className="text-base font-semibold transition-all duration-300 leading-tight">
            {title}
          </h3>
        ) : (
          <div className="h-5 w-40 rounded-md border border-dashed border-muted-foreground/20" />
        )}
      </div>

      {/* Type badge + Objective inline */}
      <div className="flex items-start gap-2">
        {typeConfig && (
          <span className="inline-flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-0.5 text-[10px] font-medium shrink-0">
            <typeConfig.icon className="h-2.5 w-2.5" />
            {typeConfig.label}
          </span>
        )}
        {objective.trim() ? (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {objective}
          </p>
        ) : (
          <span className="text-xs text-muted-foreground/40 italic">No objective set</span>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Persona groups */}
      <div className="space-y-1.5">
        {selectedGroups.length > 0 ? (
          <>
            {selectedGroups.map((group, i) => (
              <div
                key={group.name}
                className="flex items-center gap-2 animate-fade-in-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-[9px] font-bold shrink-0">
                  {group.name.charAt(0).toUpperCase()}
                </span>
                <span className="text-xs font-medium truncate flex-1">{group.name}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {group.personaCount}
                </span>
              </div>
            ))}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/20" />
            <span className="text-[11px] text-muted-foreground/40">Select groups</span>
          </div>
        )}
      </div>

      {/* Sample size */}
      {totalPersonas > 0 && guidelines && (
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-[11px] flex items-center gap-2",
            isEnough && !isTooMany
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-amber-50 text-amber-800 border border-amber-200"
          )}
        >
          {isEnough && !isTooMany ? (
            <CheckCircle2 className="h-3 w-3 shrink-0" />
          ) : (
            <AlertTriangle className="h-3 w-3 shrink-0" />
          )}
          <strong>{totalPersonas}</strong> personas · {guidelines.min}-{guidelines.max} recommended
        </div>
      )}

      {/* Questions dropdown */}
      {questions && questions.filter(q => q.text.trim()).length > 0 && (
        <>
          <div className="h-px bg-border" />
          <div>
            <button
              onClick={() => setQuestionsOpen(!questionsOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-[11px] font-medium text-muted-foreground">
                {questions.filter(q => q.text.trim()).length} interview questions
              </span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 text-muted-foreground/50 transition-transform duration-200",
                  questionsOpen && "rotate-180"
                )}
              />
            </button>
            {questionsOpen && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto animate-fade-in-up">
                {questions.filter(q => q.text.trim()).map((q, i) => (
                  <p key={q.index} className="text-[11px] text-muted-foreground/70 leading-relaxed">
                    <span className="text-muted-foreground/40">{i + 1}.</span>{" "}
                    {q.text.length > 90 ? q.text.slice(0, 90) + "..." : q.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
