"use client";

import { MessageSquare, ClipboardList, Users2, Monitor, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

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
    enabled: true,
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

interface StepTypeProps {
  onSelect: (type: "INTERVIEW" | "SURVEY" | "FOCUS_GROUP" | "USABILITY_TEST") => void;
}

export function StepType({ onSelect }: StepTypeProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">What kind of study?</h3>
        <p className="text-sm text-muted-foreground mt-1">Choose how you want to engage with your personas.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {STUDY_TYPES.map((st) => {
          const Icon = st.icon;
          return (
            <button
              key={st.type}
              disabled={!st.enabled}
              onClick={() => st.enabled && onSelect(st.type)}
              className={cn(
                "relative flex flex-col items-start rounded-xl border p-4 text-left transition-all",
                st.enabled
                  ? "border-border hover:border-foreground/30 hover:shadow-sm cursor-pointer"
                  : "border-border/50 opacity-50 cursor-not-allowed"
              )}
            >
              {!st.enabled && (
                <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Soon
                </div>
              )}
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 mb-3">
                <Icon className="h-4.5 w-4.5 text-stone-600" />
              </div>
              <span className="text-sm font-medium">{st.label}</span>
              <span className="text-xs text-muted-foreground mt-1 leading-relaxed">{st.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
