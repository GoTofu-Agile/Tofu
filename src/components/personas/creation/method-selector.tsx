"use client";

import { Sparkles, Globe, PenLine, LayoutGrid } from "lucide-react";

export type CreationMethod = "quick-prompt" | "web-research" | "manual" | "templates";

interface MethodSelectorProps {
  onSelect: (method: CreationMethod) => void;
}

const methods = [
  {
    id: "quick-prompt" as const,
    icon: Sparkles,
    title: "Quick Prompt",
    description: "Describe your target user in one sentence. AI does the rest.",
    recommended: true,
    disabled: false,
  },
  {
    id: "web-research" as const,
    icon: Globe,
    title: "Web Research",
    description:
      "Enter product details. We search Reddit, app reviews, forums, and more.",
    recommended: false,
    disabled: false,
  },
  {
    id: "manual" as const,
    icon: PenLine,
    title: "Manual + AI",
    description:
      "Provide role, industry, and pain points. AI fills in personality & backstory.",
    recommended: false,
    disabled: false,
  },
  {
    id: "templates" as const,
    icon: LayoutGrid,
    title: "Templates",
    description: "Browse pre-built persona groups for common research scenarios.",
    recommended: false,
    disabled: true,
  },
];

export function MethodSelector({ onSelect }: MethodSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {methods.map((method) => {
        const Icon = method.icon;
        return (
          <button
            key={method.id}
            onClick={() => !method.disabled && onSelect(method.id)}
            disabled={method.disabled}
            className={`group relative rounded-xl border p-5 text-left transition-all ${
              method.disabled
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:border-primary/50 hover:shadow-md"
            } ${method.recommended ? "border-primary/30 bg-primary/[0.02]" : ""}`}
          >
            {method.recommended && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                Recommended
              </span>
            )}
            {method.disabled && (
              <span className="absolute -top-2.5 right-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Coming soon
              </span>
            )}
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-muted p-2.5">
                <Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{method.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {method.description}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
