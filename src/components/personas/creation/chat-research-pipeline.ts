export type ChatDataSourceId =
  | "all"
  | "templates"
  | "app-store"
  | "cvs"
  | "company-urls"
  | "deep-search";

export type PipelineStepMode = "real_tavily" | "real_appstore" | "visual_only";

export type PipelineStepId =
  | "reddit_forums"
  | "company_web"
  | "cvs"
  | "appstore"
  | "generate";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  mode: PipelineStepMode;
  includeFor: ChatDataSourceId[];
}

export const CHAT_PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "reddit_forums",
    label: "Crawling Reddit & forums",
    mode: "real_tavily",
    includeFor: ["all", "deep-search"],
  },
  {
    id: "company_web",
    label: "Looking up company web addresses",
    mode: "real_tavily",
    includeFor: ["all", "company-urls", "deep-search"],
  },
  {
    id: "cvs",
    label: "Trying to fetch different CVs",
    mode: "visual_only",
    includeFor: ["all", "cvs"],
  },
  {
    id: "appstore",
    label: "Getting App Store reviews",
    mode: "real_appstore",
    includeFor: ["all", "app-store"],
  },
  {
    id: "generate",
    label: "Generating personas",
    mode: "visual_only",
    includeFor: ["all", "deep-search", "company-urls", "cvs", "app-store", "templates"],
  },
];

export function getChatPipelineForSource(sourceId: ChatDataSourceId): PipelineStep[] {
  const steps = CHAT_PIPELINE_STEPS.filter((s) => s.includeFor.includes(sourceId));
  // Always end with generate for UX consistency.
  const hasGenerate = steps.some((s) => s.id === "generate");
  if (!hasGenerate) steps.push(CHAT_PIPELINE_STEPS.find((s) => s.id === "generate")!);
  return steps;
}

