"use client";

import { LayoutTemplate, FileText, Zap, FileUp, Globe, SearchCheck } from "lucide-react";

export type CreationMethod =
  | "templates"
  | "manual"
  | "ai-generate"
  | "linkedin"
  | "company-url"
  | "deep-search";

interface Method {
  id: CreationMethod;
  icon: React.ElementType;
  title: string;
  description: string;
  label: string;
  labelClass: string;
  comingSoon?: boolean;
}

const METHODS: Method[] = [
  {
    id: "templates",
    icon: LayoutTemplate,
    title: "Templates",
    description: "Start from opinionated presets for common audiences.",
    label: "Data Backed",
    labelClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    id: "manual",
    icon: FileText,
    title: "Manual",
    description: "Build from scratch with a form.",
    label: "Own Data",
    labelClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "ai-generate",
    icon: Zap,
    title: "App Store Reviews",
    description: "Use real App Store reviews and AI to synthesize personas.",
    label: "Data Backed",
    labelClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  {
    id: "linkedin",
    icon: FileUp,
    title: "CV / Resume",
    description: "Upload a CV or resume PDF to ground personas.",
    label: "Own Data",
    labelClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "company-url",
    icon: Globe,
    title: "Company URL",
    description: "Scrape company context to build target user personas.",
    label: "Own Data",
    labelClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    id: "deep-search",
    icon: SearchCheck,
    title: "Deep Search",
    description: "Run real Tavily research — personas based on actual data.",
    label: "Data Backed",
    labelClass: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
];

interface StepMethodPickerProps {
  onSelect: (method: CreationMethod) => void;
}

export function StepMethodPicker({ onSelect }: StepMethodPickerProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {METHODS.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => !m.comingSoon && onSelect(m.id)}
              disabled={m.comingSoon}
              className={`relative flex flex-col gap-3 rounded-lg border p-4 text-left transition-all
                ${m.comingSoon
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:border-foreground/30 hover:shadow-sm active:scale-[0.98]"
                }`}
            >
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-tight">{m.title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{m.description}</p>
              </div>
              <span className={`mt-auto inline-block rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${m.labelClass}`}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
