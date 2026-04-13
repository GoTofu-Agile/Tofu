"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, Loader2, Minimize2 } from "lucide-react";
import { createGroup } from "@/app/(dashboard)/personas/actions";
import { PERSONA_TEMPLATES } from "@/lib/personas/templates";
import { type CreationMethod } from "./step-method-picker";
import { PersonaInputWizard } from "./persona-input-wizard";
import { PersonaStreamingProgress } from "@/components/personas/persona-streaming-progress";
import { StepDescribe } from "./step-describe";
import { StepManual } from "./step-manual";
import { StepLinkedin } from "./step-linkedin";
import { StepUrl, isValidHttpUrl } from "./step-url";
import { SourcesSettings } from "./step-sources";
import { StepTemplates } from "./step-templates";
import { PersonaChatBar } from "./persona-chat-bar";
import { StepAppStoreReviews } from "./step-app-store-reviews";
import type { ChatPipelineStepView } from "./chat-pipeline-progress";
import { type ChatDataSourceId } from "./chat-research-pipeline";
import { buildChatDisplayPipeline } from "./chat-pipeline-display-plan";
import { PersonaWorkflowCarousel } from "./persona-workflow-carousel";
import type {
  WorkflowSourceRow,
  WorkflowStepStatus,
  WorkflowStepView,
} from "./persona-workflow-types";
import type {
  AppStoreAudienceMappedApp,
  ExtractedContext,
} from "@/lib/validation/schemas";
import type { AudienceMappingUiStatus } from "./audience-app-mapping-preview";
import { ALL_RESEARCH_SOURCE_IDS, buildQueriesFromContext } from "@/lib/research/build-queries";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { DEFAULT_PERSONA_PROMPT } from "@/lib/personas/quick-starters";
import {
  getNewlyReachedMilestones,
  loadPersonaEngagement,
  milestoneLabel,
  recordPersonasGenerated,
} from "@/lib/personas/persona-engagement";
import { PersonaProgressTracker } from "@/components/personas/persona-progress-tracker";
import { PersonaQuickStarters } from "@/components/personas/persona-quick-starters";
import { PersonaPromptHistory } from "@/components/personas/persona-prompt-history";
import type { PersonaCreationContext } from "@/lib/personas/persona-creation-context";
import { DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS } from "@/lib/personas/persona-creation-policy";
import {
  serpOptionsForDeepResearchExtracted,
  serpOptionsForPromptDeepSearch,
} from "@/lib/research/serpapi/chat-serp-options";
import {
  humanLabelForBreakdownKey,
  mergeQuickResearchBreakdown,
  sumResearchBreakdownSnippets,
} from "@/lib/research/research-quick-breakdown";
import { PERSONA_WIDGET_STORAGE_KEY } from "@/lib/personas/publish-widget-run";

async function readGenerateApiError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data?.error === "string") return data.error;
  } catch {
    // ignore
  }
  return "Generation failed";
}

async function ensureGenerateResponseOk(response: Response): Promise<void> {
  if (response.ok) return;
  throw new Error(await readGenerateApiError(response));
}

type Phase = "pick" | "form" | "progress";

export interface OrgContext {
  productName?: string;
  productDescription?: string;
  targetAudience?: string;
  industry?: string;
  competitors?: string;
}

interface UnifiedCreationFlowProps {
  orgContext?: OrgContext;
  /** URL `prefill` — jump-starts the main brief */
  initialPrompt?: string;
  /** Server: workspace progression (quality tier, batch cap, deep-search gate). */
  initialCreationContext?: PersonaCreationContext;
}

// Methods that skip the sources/research step
const SKIP_SOURCES_METHODS: CreationMethod[] = ["templates", "ai-generate", "manual"];

// sourceType override per method
const SOURCE_TYPE_MAP: Partial<Record<CreationMethod, string>> = {
  // App Store Reviews uses real review data (DomainKnowledge) → DATA_BASED
  "ai-generate": "DATA_BASED",
  manual: "UPLOAD_BASED",
  linkedin: "UPLOAD_BASED",
  "company-url": "UPLOAD_BASED",
  // deep-search → DATA_BASED auto-set by knowledge.length
};

function classifyPipelineBucket(label: string): "appStore" | "playStore" | "webSearch" | "browsed" | "synth" {
  const text = label.toLowerCase();
  if (text.includes("app store")) return "appStore";
  if (text.includes("play store") || text.includes("google play")) return "playStore";
  if (text.includes("synth") || text.includes("generat") || text.includes("persona")) return "synth";
  if (text.includes("reddit")) return "webSearch";
  if (text.includes("forum")) return "webSearch";
  if (text.includes("twitter") || text.includes("x/")) return "webSearch";
  if (text.includes("brows") || text.includes("url") || text.includes("link")) return "browsed";
  return "webSearch";
}

function bucketStatus(
  steps: ChatPipelineStepView[],
  bucket: "appStore" | "playStore" | "webSearch" | "browsed" | "synth"
): WorkflowStepStatus {
  const inBucket = steps.filter((s) => classifyPipelineBucket(s.label) === bucket);
  if (inBucket.length === 0) return "pending";
  if (inBucket.some((s) => s.status === "active")) return "active";
  if (inBucket.some((s) => s.status === "done")) return "done";
  if (inBucket.every((s) => s.status === "skipped")) return "skipped";
  return "pending";
}

function buildWorkflowSteps(params: {
  chatPipelineSteps: ChatPipelineStepView[] | null;
  progressPhase: "researching" | "generating" | "done";
  researchLabel: string;
  researchResults: number;
  researchBySource: Record<string, number>;
  genCompleted: number;
  genTotal: number;
  promptText: string;
}): WorkflowStepView[] {
  const {
    chatPipelineSteps,
    progressPhase,
    researchLabel,
    researchResults,
    researchBySource,
    genCompleted,
    genTotal,
    promptText,
  } = params;

  const appCount = researchBySource.APP_REVIEW ?? researchBySource.appstore ?? 0;
  const playCount = researchBySource.PLAY_STORE_REVIEW ?? 0;

  const isAppLabel = researchLabel.toLowerCase().includes("app store");
  const appStoreStatus = chatPipelineSteps
    ? bucketStatus(chatPipelineSteps, "appStore")
    : progressPhase === "researching" && isAppLabel
      ? "active"
      : appCount > 0
        ? "done"
        : progressPhase === "done"
          ? "skipped"
          : "pending";

  const playStoreStatus = chatPipelineSteps
    ? bucketStatus(chatPipelineSteps, "playStore")
    : playCount > 0
      ? "done"
      : progressPhase === "done"
        ? "skipped"
        : "pending";

  const webSearchStatus = chatPipelineSteps
    ? bucketStatus(chatPipelineSteps, "webSearch")
    : progressPhase === "researching" && !isAppLabel
      ? "active"
      : researchResults > 0
        ? "done"
        : progressPhase === "done"
          ? "skipped"
          : "pending";

  const browsingStatus = chatPipelineSteps
    ? bucketStatus(chatPipelineSteps, "browsed")
    : progressPhase === "researching"
      ? researchResults > 0
        ? "active"
        : "pending"
      : progressPhase === "generating" || progressPhase === "done"
        ? researchResults > 0
          ? "done"
          : "skipped"
        : "pending";

  const synthStatus =
    progressPhase === "generating"
      ? "active"
      : progressPhase === "done"
        ? "done"
        : chatPipelineSteps
          ? bucketStatus(chatPipelineSteps, "synth")
          : "pending";

  const doneStatus: WorkflowStepStatus = progressPhase === "done" ? "done" : "pending";

  const topicLabel = promptText.trim()
    ? `${promptText.trim().slice(0, 32)}${promptText.trim().length > 32 ? "..." : ""}`
    : "target audience";

  const researchEntries = Object.entries(researchBySource).filter(
    ([k, v]) => v > 0 && (k.startsWith("tavily:") || k.startsWith("serp:"))
  );
  researchEntries.sort((a, b) => b[1] - a[1]);
  const crawlBundle = sumResearchBreakdownSnippets(researchBySource);

  const webRowsStatus: WorkflowSourceRow["status"] =
    webSearchStatus === "active"
      ? "loading"
      : webSearchStatus === "done"
        ? "done"
        : "skipped";

  const webRowsLoading =
    progressPhase === "researching" && webSearchStatus === "active";

  const webSources: WorkflowSourceRow[] =
    researchEntries.length > 0
      ? researchEntries.slice(0, 14).map(([key, n], i) => ({
          id: `live-${key}-${i}`,
          kind: "webSearch" as const,
          label: humanLabelForBreakdownKey(key),
          badge: `${n} snippets`,
          status: webRowsStatus,
        }))
      : [
          {
            id: "research-pending",
            kind: "webSearch",
            label: webRowsLoading ? "News, web, forums & verticals" : "Web research",
            badge: webRowsLoading ? "Running…" : "Waiting",
            status: webRowsLoading ? "loading" : "skipped",
          },
        ];

  const browseSources: WorkflowSourceRow[] =
    crawlBundle > 0
      ? [
          {
            id: "kb-saved",
            kind: "browsed",
            label: "Saved to persona knowledge base",
            badge: `${crawlBundle} snippets`,
            status:
              browsingStatus === "active"
                ? "loading"
                : browsingStatus === "done"
                  ? "done"
                  : "skipped",
          },
        ]
      : [
          {
            id: "kb-empty",
            kind: "browsed",
            label: "Knowledge base",
            badge:
              progressPhase === "researching" ? "Collecting…" : "—",
            status:
              browsingStatus === "active"
                ? "loading"
                : browsingStatus === "done"
                  ? "done"
                  : "skipped",
          },
        ];

  const appSources: WorkflowSourceRow[] = [
    {
      id: "app-source",
      kind: "appStore",
      label: "App Store — iOS listing",
      badge: appCount > 0 ? `${appCount} reviews` : "Waiting",
      status: appStoreStatus === "active" ? "loading" : appStoreStatus === "done" ? "done" : "skipped",
    },
  ];

  const playSources: WorkflowSourceRow[] = [
    {
      id: "play-source",
      kind: "playStore",
      label: "Google Play — Android listing",
      badge: playCount > 0 ? `${playCount} reviews` : "Waiting",
      status: playStoreStatus === "active" ? "loading" : playStoreStatus === "done" ? "done" : "skipped",
    },
  ];

  return [
    {
      id: "wf-app-store",
      title: "Searching App Store",
      status: appStoreStatus,
      sources: appSources,
      findings:
        appCount > 0
          ? [`Captured ${appCount} App Store review signals for ${topicLabel}.`]
          : [],
    },
    {
      id: "wf-play-store",
      title: "Searching Google Play",
      status: playStoreStatus,
      sources: playSources,
      findings:
        playCount > 0
          ? [`Found recurring Android pain points relevant to ${topicLabel}.`]
          : [],
    },
    {
      id: "wf-web-search",
      title: "Research",
      status: webSearchStatus,
      sources: webSources,
      findings:
        researchEntries.length > 0
          ? researchEntries
              .slice(0, 4)
              .map(([k, v]) => `${humanLabelForBreakdownKey(k)} · ${v} snippets`)
          : researchResults > 0
            ? [
                `${researchResults} snippets saved from the last research run (see breakdown when sources finish).`,
              ]
            : [],
    },
    {
      id: "wf-browse",
      title: "Grounding bundle",
      status: browsingStatus,
      sources: browseSources,
      findings:
        crawlBundle > 0
          ? [
              `${crawlBundle} research snippets are stored on the group for persona generation.`,
              "Snippets stay tagged by kind of source (news, forums, maps, stores, etc.).",
            ]
          : browsingStatus === "active" || browsingStatus === "done"
            ? ["Collecting crawled snippets into DomainKnowledge."]
            : [],
    },
    {
      id: "wf-synth",
      title: "Synthesizing personas",
      status: synthStatus,
      sources: [],
      findings:
        synthStatus === "done" || synthStatus === "active"
          ? [
              `Persona traits are merged from signals tied to ${topicLabel}.`,
              "Goals, frustrations, and behaviors are balanced across sources.",
              "Outlier signals are filtered to avoid one-thread bias.",
            ]
          : [],
    },
    {
      id: "wf-done",
      title: "Personas ready",
      status: doneStatus,
      sources: [],
      findings:
        doneStatus === "done"
          ? [`Generated ${Math.max(genCompleted, genTotal)} personas successfully.`]
          : [],
    },
  ];
}

export function UnifiedCreationFlow({
  orgContext,
  initialPrompt,
  initialCreationContext,
}: UnifiedCreationFlowProps) {
  const router = useRouter();
  const reduced = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("pick");
  const [method, setMethod] = useState<CreationMethod | null>(null);

  // Step: Describe
  const [extracting, setExtracting] = useState(false);

  // Step: Research settings (inline). All Tavily source categories are always used.
  const [depth, setDepth] = useState<"quick" | "deep">("quick");
  const [personaCount, setPersonaCount] = useState(10);
  const [includeSkeptics, setIncludeSkeptics] = useState(true);
  /** Near-instant template assembly (no persona LLM). Otherwise uses fast parallel AI path. */
  const [turboMode, setTurboMode] = useState(false);
  const personaSpeedMode = turboMode ? "turbo" : "fast";

  // Step: Progress
  const [progressPhase, setProgressPhase] = useState<"researching" | "generating" | "done">("researching");
  const [, setResearchCurrent] = useState(0);
  const [, setResearchTotal] = useState(0);
  const [researchLabel, setResearchLabel] = useState("");
  const [researchResults, setResearchResults] = useState(0);
  const [researchBySource, setResearchBySource] = useState<Record<string, number>>({});
  const [genCompleted, setGenCompleted] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genCurrentName, setGenCurrentName] = useState("");
  const [lastGeneratedName, setLastGeneratedName] = useState("");
  const [progressViewMode, setProgressViewMode] = useState<"expanded" | "minimized">(
    "expanded"
  );
  const [generationIssue, setGenerationIssue] = useState<{
    groupId: string;
    message: string;
    partial: boolean;
  } | null>(null);
  const [starting, setStarting] = useState(false);
  const [chatPipelineSteps, setChatPipelineSteps] = useState<ChatPipelineStepView[] | null>(null);

  /** Inngest queued job (202): stop blocking the page; widget polls status. */
  function finishIfQueuedAsyncGeneration(response: Response): boolean {
    if (response.status !== 202) return false;
    toast.success(
      "Personas are generating in the background. Track progress in the widget."
    );
    setStarting(false);
    return true;
  }

  // Chat entry → describe step
  const [promptText, setPromptText] = useState(
    () => initialPrompt?.trim() || DEFAULT_PERSONA_PROMPT
  );
  useEffect(() => {
    const t = initialPrompt?.trim();
    if (t) setPromptText(t);
  }, [initialPrompt]);

  const [creationContext, setCreationContext] = useState<PersonaCreationContext | null>(
    initialCreationContext ?? null
  );
  useEffect(() => {
    setCreationContext(initialCreationContext ?? null);
  }, [initialCreationContext]);

  useEffect(() => {
    if (initialCreationContext) return;
    let cancelled = false;
    void fetch("/api/personas/creation-context")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PersonaCreationContext | null) => {
        if (!cancelled && data) setCreationContext(data);
      });
    return () => {
      cancelled = true;
    };
  }, [initialCreationContext]);

  useEffect(() => {
    if (!creationContext) return;
    setPersonaCount((c) => Math.min(c, creationContext.maxBatchPersonas));
  }, [creationContext]);

  const methodLockReason = useMemo(() => {
    if (!creationContext || creationContext.deepSearchUnlocked) return undefined;
    return {
      "deep-search": `Unlocks after ${DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS} personas in this workspace (${creationContext.personasUntilDeepSearch} to go).`,
    } as Partial<Record<CreationMethod, string>>;
  }, [creationContext]);

  const [initialDescribeText, setInitialDescribeText] = useState<string | null>(null);
  const [deepSearchFreetext, setDeepSearchFreetext] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [companyUrlError, setCompanyUrlError] = useState<string | null>(null);
  const [cvResumeFile, setCvResumeFile] = useState<File | null>(null);
  const [cvResumeError, setCvResumeError] = useState<string | null>(null);

  /** App Store Reviews → Target audience: Tavily+LLM app mapping preview */
  const [audienceMappedApps, setAudienceMappedApps] = useState<
    AppStoreAudienceMappedApp[] | null
  >(null);
  const [audienceMappingStatus, setAudienceMappingStatus] =
    useState<AudienceMappingUiStatus>("idle");
  const [audienceMappingError, setAudienceMappingError] = useState<string | null>(
    null
  );
  const [audienceTavilyDisabled, setAudienceTavilyDisabled] = useState(false);

  const workflowSteps = useMemo(
    () =>
      buildWorkflowSteps({
        chatPipelineSteps,
        progressPhase,
        researchLabel,
        researchResults,
        researchBySource,
        genCompleted,
        genTotal,
        promptText,
      }),
    [
      chatPipelineSteps,
      progressPhase,
      researchLabel,
      researchResults,
      researchBySource,
      genCompleted,
      genTotal,
      promptText,
    ]
  );

  function publishWidgetState(input: {
    runId: string;
    groupId: string;
    phase: "starting" | "researching" | "generating" | "done" | "error";
    completed: number;
    total: number;
    currentName: string | null;
    message: string | null;
  }) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      PERSONA_WIDGET_STORAGE_KEY,
      JSON.stringify({
        ...input,
        updatedAt: Date.now(),
      })
    );
    window.dispatchEvent(new Event("persona-generation-widget-update"));
  }

  useEffect(() => {
    if (phase !== "progress") {
      setProgressViewMode("expanded");
      return;
    }
    if (progressPhase !== "done") {
      setProgressViewMode("expanded");
    }
  }, [phase, progressPhase]);

  // --- Method selection ---

  function handleMethodSelect(m: CreationMethod) {
    if (m === "deep-search" && creationContext && !creationContext.deepSearchUnlocked) {
      toast.message(
        `Deep research unlocks after ${DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS} personas in this workspace (${creationContext.personasUntilDeepSearch} to go).`
      );
      return;
    }
    setMethod(m);
    setPhase("form");
    if (m === "deep-search") {
      setDeepSearchFreetext(initialDescribeText ?? "");
    }
    if (m === "company-url") {
      setCompanyUrl("");
      setCompanyUrlError(null);
    }
    if (m === "linkedin") {
      setCvResumeFile(null);
      setCvResumeError(null);
    }
    if (m === "manual") {
      const cap = creationContext?.maxBatchPersonas ?? 100;
      setPersonaCount((c) => Math.min(cap, Math.max(1, c)));
    }
    if (m === "ai-generate") {
      resetAppStoreAudienceMappingUi();
    }
  }

  function resetAppStoreAudienceMappingUi() {
    setAudienceMappedApps(null);
    setAudienceMappingStatus("idle");
    setAudienceMappingError(null);
    setAudienceTavilyDisabled(false);
  }

  async function runVisualStep(ms = 350) {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  async function pipelineStepSettledPause() {
    await new Promise<void>((resolve) => setTimeout(resolve, 240));
  }

  function createRunId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function startGlobalWidgetRun(groupId: string, total: number, phase: "researching" | "generating") {
    const runId = createRunId();
    publishWidgetState({
      runId,
      groupId,
      phase,
      completed: 0,
      total,
      currentName: null,
      message: phase === "researching" ? "Researching signals" : "Preparing personas",
    });
    return runId;
  }

  function setPipelineStatus(stepId: string, status: ChatPipelineStepView["status"]) {
    setChatPipelineSteps((prev) => {
      if (!prev) return prev;
      return prev.map((s) => (s.id === stepId ? { ...s, status } : s));
    });
  }

  // --- Chat pipeline (All Data Sources / scoped sources) ---
  async function handleChatPipelineCreate(text: string, dataSourceId: string) {
    const source = (dataSourceId || "all") as ChatDataSourceId;
    if (source === "deep-search" && creationContext && !creationContext.deepSearchUnlocked) {
      toast.message(
        `Deep research unlocks after ${DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS} personas in this workspace (${creationContext.personasUntilDeepSearch} to go).`
      );
      return;
    }

    setStarting(true);
    setGenerationIssue(null);
    setGenCompleted(0);
    setGenCurrentName("");
    const displayPlan = buildChatDisplayPipeline(source, text, orgContext, Date.now());
    setChatPipelineSteps(
      displayPlan.map((s) => ({ id: s.id, label: s.label, status: "pending" as const }))
    );

    const domainPieces: string[] = [];
    if (orgContext?.productName) domainPieces.push(`Product: ${orgContext.productName}`);
    if (orgContext?.productDescription)
      domainPieces.push(`Description: ${orgContext.productDescription}`);
    if (orgContext?.targetAudience) domainPieces.push(`Target audience: ${orgContext.targetAudience}`);
    if (orgContext?.industry) domainPieces.push(`Industry: ${orgContext.industry}`);
    if (orgContext?.competitors) domainPieces.push(`Competitors: ${orgContext.competitors}`);
    domainPieces.push(`User description: ${text}`);
    const domainContext = domainPieces.join("\n");

    const formData = new FormData();
    formData.set("name", "Persona Group");
    formData.set("description", text.slice(0, 180));
    formData.set("domainContext", domainContext);
    formData.set("count", String(personaCount));

    const result = await createGroup(formData);
    if (result.error || !result.groupId) {
      toast.error(result.error || "Failed to create group");
      setStarting(false);
      return;
    }

    const gId = result.groupId;
    setPhase("progress");
    setProgressPhase("researching");
    setResearchCurrent(0);
    setResearchTotal(displayPlan.length);
    setResearchLabel("");
    setResearchResults(0);
    setResearchBySource({});
    setGenTotal(personaCount);
    const runId = startGlobalWidgetRun(gId, personaCount, "researching");

    let totalSources = 0;
    let bySource: Record<string, number> = {};

    const genStep = displayPlan.filter((s) => s.backend.kind === "generation").at(-1);
    const preGenSteps = displayPlan.filter((s) => s.backend.kind !== "generation");

    for (let i = 0; i < preGenSteps.length; i++) {
      const step = preGenSteps[i]!;
      setResearchCurrent(i + 1);
      setResearchLabel(step.label);
      setPipelineStatus(step.id, "active");

      try {
        if (step.backend.kind === "visual") {
          await runVisualStep(step.backend.ms);
          setPipelineStatus(step.id, "done");
        } else if (step.backend.kind === "tavily") {
          const serpOptions =
            source === "deep-search" ? serpOptionsForPromptDeepSearch(text) : undefined;
          const res = await fetch("/api/research/quick", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              groupId: gId,
              prompt: text,
              ...(serpOptions ? { serpOptions } : {}),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || "Research failed");
          const added = data.totalResults || 0;
          totalSources += added;
          bySource = mergeQuickResearchBreakdown(bySource, {
            tavilyBySourceType: data.tavilyBySourceType,
            serpByEngine: data.serpByEngine,
          });
          setResearchBySource({ ...bySource });
          setResearchResults(totalSources);
          setResearchLabel(`${step.label} · +${added} snippets`);
          setPipelineStatus(step.id, "done");
        } else if (step.backend.kind === "appstore") {
          const discoverRes = await fetch("/api/research/discover-appstore-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: gId, prompt: text }),
          });
          const discovered = await discoverRes.json().catch(() => ({}));
          if (!discoverRes.ok) throw new Error(discovered?.error || "App lookup failed");

          const appUrl: string | null = discovered.appUrl || null;
          if (!appUrl) {
            setPipelineStatus(step.id, "skipped");
          } else {
            const scrapeRes = await fetch("/api/reviews/appstore", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ groupId: gId, appUrl, limit: 100 }),
            });
            const scraped = await scrapeRes.json().catch(() => ({}));
            if (!scrapeRes.ok) throw new Error(scraped?.error || "Failed to scrape reviews");
            const added = scraped.totalSaved || scraped.totalFetched || 0;
            totalSources += added;
            bySource.APP_REVIEW = (bySource.APP_REVIEW || 0) + added;
            setResearchBySource({ ...bySource });
            setResearchResults(totalSources);
            setPipelineStatus(step.id, "done");
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Pipeline step failed");
        setPipelineStatus(step.id, "skipped");
      }

      await pipelineStepSettledPause();
    }

    setResearchResults(totalSources);
    setResearchBySource(bySource);
    setProgressPhase("generating");

    const sourceTypeOverride = source === "templates" ? "PROMPT_GENERATED" : "DATA_BASED";

    if (genStep) {
      setResearchCurrent(displayPlan.length);
      setResearchLabel(genStep.label);
      setPipelineStatus(genStep.id, "active");
    }

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext,
          includeSkeptics,
          clientRunId: runId,
          sourceTypeOverride,
          usedDeepResearchPipeline: source === "deep-search",
          speedMode: personaSpeedMode,
        }),
      });
      await ensureGenerateResponseOk(response);
      await streamGenerationProgress(response, gId, runId, {
        onGenerationUiComplete: () => {
          if (genStep) setPipelineStatus(genStep.id, "done");
        },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      if (genStep) setPipelineStatus(genStep.id, "skipped");
      setStarting(false);
    }
  }

  // --- App Store Reviews: create group → scrape reviews → generate ---

  async function handleAppStoreReviewsFromUrl(appUrl: string) {
    setAudienceMappedApps(null);
    setAudienceMappingStatus("idle");
    setAudienceMappingError(null);
    setAudienceTavilyDisabled(false);
    setStarting(true);
    setGenerationIssue(null);

    const domainPieces: string[] = [];
    if (orgContext?.productName) domainPieces.push(`Product: ${orgContext.productName}`);
    if (orgContext?.productDescription)
      domainPieces.push(`Description: ${orgContext.productDescription}`);
    if (orgContext?.targetAudience) domainPieces.push(`Target audience: ${orgContext.targetAudience}`);
    if (orgContext?.industry) domainPieces.push(`Industry: ${orgContext.industry}`);
    if (orgContext?.competitors) domainPieces.push(`Competitors: ${orgContext.competitors}`);
    domainPieces.push(`App Store URL: ${appUrl}`);
    domainPieces.push("Use App Store reviews (saved as domain knowledge) to ground personas.");

    const domainContext = domainPieces.join("\n");

    const formData = new FormData();
    formData.set("name", "App Store Reviews");
    formData.set("description", "Persona group grounded in App Store reviews.");
    formData.set("domainContext", domainContext);
    formData.set("count", String(personaCount));

    const result = await createGroup(formData);
    if (result.error || !result.groupId) {
      toast.error(result.error || "Failed to create group");
      setStarting(false);
      return;
    }

    const gId = result.groupId;
    setPhase("progress");
    setProgressPhase("researching");
    setResearchCurrent(0);
    setResearchTotal(1);
    setResearchLabel("Scraping App Store reviews…");
    setResearchResults(0);
    setResearchBySource({});
    const runId = startGlobalWidgetRun(gId, personaCount, "researching");

    try {
      const scrapeRes = await fetch("/api/reviews/appstore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          appUrl,
          limit: 100,
        }),
      });
      const scraped = await scrapeRes.json().catch(() => ({}));
      if (!scrapeRes.ok) {
        throw new Error(scraped?.error || "Failed to scrape reviews");
      }

      setResearchCurrent(1);
      setResearchResults(scraped.totalSaved || scraped.totalFetched || 0);
      setResearchBySource({
        appstore: scraped.totalSaved || scraped.totalFetched || 0,
      });

      setProgressPhase("generating");
      setGenTotal(personaCount);
      publishWidgetState({
        runId,
        groupId: gId,
        phase: "generating",
        completed: 0,
        total: personaCount,
        currentName: null,
        message: "Building personas",
      });

      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext,
          includeSkeptics,
          clientRunId: runId,
          sourceTypeOverride: "DATA_BASED",
          usedDeepResearchPipeline: false,
          speedMode: personaSpeedMode,
          async: true,
        }),
      });

      await ensureGenerateResponseOk(response);
      if (finishIfQueuedAsyncGeneration(response)) return;
      await streamGenerationProgress(response, gId, runId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      setStarting(false);
    }
  }

  async function handleAppStoreReviewsFromAudience(audiencePlain: string) {
    const audience = audiencePlain.trim();
    setStarting(true);
    setGenerationIssue(null);
    setAudienceMappingStatus("loading");
    setAudienceMappingError(null);
    setAudienceMappedApps(null);
    setAudienceTavilyDisabled(false);

    const domainPieces: string[] = [];
    if (orgContext?.productName) domainPieces.push(`Product: ${orgContext.productName}`);
    if (orgContext?.productDescription)
      domainPieces.push(`Description: ${orgContext.productDescription}`);
    if (orgContext?.targetAudience) domainPieces.push(`Target audience: ${orgContext.targetAudience}`);
    if (orgContext?.industry) domainPieces.push(`Industry: ${orgContext.industry}`);
    if (orgContext?.competitors) domainPieces.push(`Competitors: ${orgContext.competitors}`);
    domainPieces.push(`Target audience for App Store review grounding: ${audience}`);
    domainPieces.push("Use App Store reviews (saved as domain knowledge) to ground personas.");

    let domainContext = domainPieces.join("\n");

    const formData = new FormData();
    formData.set("name", "App Store Reviews");
    formData.set("description", "Persona group grounded in App Store reviews.");
    formData.set("domainContext", domainContext);
    formData.set("count", String(personaCount));

    const result = await createGroup(formData);
    if (result.error || !result.groupId) {
      toast.error(result.error || "Failed to create group");
      setStarting(false);
      setAudienceMappingStatus("error");
      setAudienceMappingError(result.error || "Failed to create group");
      return;
    }

    const gId = result.groupId;

    let mapData: {
      apps?: AppStoreAudienceMappedApp[];
      tavilyDisabled?: boolean;
      serpDisabled?: boolean;
      error?: string;
    } = {};

    try {
      const mapRes = await fetch("/api/research/appstore-from-audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          audience,
          maxApps: 5,
        }),
      });
      mapData = (await mapRes.json().catch(() => ({}))) as typeof mapData;
      if (!mapRes.ok) {
        throw new Error(mapData.error || "Failed to match apps for audience");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to match apps";
      setAudienceMappingStatus("error");
      setAudienceMappingError(msg);
      toast.error(msg);
      setStarting(false);
      return;
    }

    const apps = mapData.apps ?? [];
    const searchOff = Boolean(mapData.tavilyDisabled) || Boolean(mapData.serpDisabled);
    setAudienceTavilyDisabled(searchOff);
    setAudienceMappedApps(apps);
    setAudienceMappingStatus("success");

    if (searchOff) {
      toast.info(
        "App discovery requires SERPAPI_API_KEY. Use the App tab with a direct App Store URL."
      );
    }

    if (apps.length === 0) {
      setStarting(false);
      return;
    }

    const appLines = apps.map((a) => `- ${a.appName}: ${a.appUrl}`).join("\n");
    domainContext = `${domainContext}\n\nMatched App Store listings:\n${appLines}`;

    await new Promise((r) => setTimeout(r, 500));

    setPhase("progress");
    setProgressPhase("researching");
    setResearchTotal(apps.length);
    setResearchCurrent(0);
    setResearchResults(0);
    setResearchBySource({});
    const runId = startGlobalWidgetRun(gId, personaCount, "researching");

    let totalSaved = 0;

    try {
      for (let i = 0; i < apps.length; i++) {
        const app = apps[i]!;
        setResearchCurrent(i + 1);
        setResearchLabel(`Scraping reviews: ${app.appName}…`);

        const scrapeRes = await fetch("/api/reviews/appstore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: gId,
            appUrl: app.appUrl,
            limit: 100,
          }),
        });
        const scraped = await scrapeRes.json().catch(() => ({}));
        if (!scrapeRes.ok) {
          throw new Error(scraped?.error || `Failed to scrape ${app.appName}`);
        }
        totalSaved += scraped.totalSaved ?? scraped.totalFetched ?? 0;
        setResearchResults(totalSaved);
        setResearchBySource({ appstore: totalSaved });
      }

      setProgressPhase("generating");
      setGenTotal(personaCount);
      publishWidgetState({
        runId,
        groupId: gId,
        phase: "generating",
        completed: 0,
        total: personaCount,
        currentName: null,
        message: "Building personas",
      });

      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext,
          includeSkeptics,
          clientRunId: runId,
          sourceTypeOverride: "DATA_BASED",
          usedDeepResearchPipeline: false,
          speedMode: personaSpeedMode,
          async: true,
        }),
      });

      await ensureGenerateResponseOk(response);
      if (finishIfQueuedAsyncGeneration(response)) return;
      await streamGenerationProgress(response, gId, runId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      setStarting(false);
    }
  }

  // --- Step: Describe (AI Generate + Deep Search) ---

  async function handleFreetextInput(text: string) {
    if (starting || extracting) return;
    setExtracting(true);
    setGenerationIssue(null);
    try {
      const response = await fetch("/api/personas/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freetext: text, orgContext }),
      });
      if (!response.ok) throw new Error("Extraction failed");
      const data: ExtractedContext = await response.json();
      if (method && SKIP_SOURCES_METHODS.includes(method)) {
        await generateOnlyFromExtracted(data);
      } else {
        await researchAndGenerateFromExtracted(data);
      }
    } catch {
      toast.error("Failed to analyze your description. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function handleCompanyUrlContinue() {
    if (starting || extracting) return;
    const url = companyUrl.trim();
    if (!isValidHttpUrl(url)) return;

    setExtracting(true);
    setCompanyUrlError(null);
    try {
      const res = await fetch("/api/personas/extract-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to extract URL");
      }

      const data: ExtractedContext = await res.json();
      await researchAndGenerateFromExtracted(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setCompanyUrlError(message);
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  }

  async function handleCvResumeContinue() {
    if (starting || extracting) return;
    if (!cvResumeFile) return;

    setExtracting(true);
    setCvResumeError(null);
    try {
      const formData = new FormData();
      formData.append("file", cvResumeFile);

      const res = await fetch("/api/personas/extract-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to extract PDF");
      }

      const data: ExtractedContext = await res.json();
      await researchAndGenerateFromExtracted(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setCvResumeError(message);
      toast.error(message);
    } finally {
      setExtracting(false);
    }
  }

  // --- Generate without research ---

  async function generateOnlyFromExtracted(extracted: ExtractedContext) {
    if (starting) return;
    setStarting(true);
    setGenerationIssue(null);

    const formData = new FormData();
    formData.set("name", extracted.groupName);
    formData.set("description", `${extracted.targetUserRole}${extracted.industry ? ` — ${extracted.industry}` : ""}`);
    formData.set("domainContext", extracted.domainContext);
    formData.set("count", String(personaCount));

    const result = await createGroup(formData);
    if (result.error) {
      toast.error(result.error);
      setStarting(false);
      return;
    }
    const gId = result.groupId!;
    setChatPipelineSteps(null);
    setPhase("progress");
    setProgressPhase("generating");
    setGenTotal(personaCount);
    const runId = startGlobalWidgetRun(gId, personaCount, "generating");

    const sourceTypeOverride = method ? SOURCE_TYPE_MAP[method] : undefined;

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext: extracted.domainContext,
          includeSkeptics,
          clientRunId: runId,
          sourceTypeOverride,
          usedDeepResearchPipeline: false,
          speedMode: personaSpeedMode,
          async: true,
        }),
      });

      await ensureGenerateResponseOk(response);
      if (finishIfQueuedAsyncGeneration(response)) return;
      await streamGenerationProgress(response, gId, runId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      setStarting(false);
    }
  }

  // --- Research + Generate (Deep Search / LinkedIn / Company URL) ---

  async function researchAndGenerateFromExtracted(extracted: ExtractedContext) {
    if (starting) return;
    setStarting(true);
    setGenerationIssue(null);

    const formData = new FormData();
    formData.set("name", extracted.groupName);
    formData.set("description", `${extracted.targetUserRole}${extracted.industry ? ` — ${extracted.industry}` : ""}`);
    formData.set("domainContext", extracted.domainContext);
    formData.set("count", String(personaCount));

    const result = await createGroup(formData);
    if (result.error) {
      toast.error(result.error);
      setStarting(false);
      return;
    }
    const gId = result.groupId!;
    setChatPipelineSteps(null);
    setPhase("progress");
    setProgressPhase("researching");
    setResearchCurrent(0);
    setResearchResults(0);
    setResearchBySource({});
    setResearchLabel("");
    const runId = startGlobalWidgetRun(gId, personaCount, "researching");

    const queries = buildQueriesFromContext({
      targetUserRole: extracted.targetUserRole,
      industry: extracted.industry,
      painPoints: extracted.painPoints,
      domainContext: extracted.domainContext,
      selectedSources: ALL_RESEARCH_SOURCE_IDS,
      // Company URL flow hides research depth; use a fixed default.
      depth: method === "company-url" ? "quick" : depth,
    });

    setResearchTotal(queries.length);
    let totalFound = 0;
    let mergedBySource: Record<string, number> = {};

    for (let i = 0; i < queries.length; i++) {
      const plan = queries[i];
      setResearchCurrent(i + 1);
      setResearchLabel(plan.label);

      try {
        const companyDomain =
          method === "company-url" && isValidHttpUrl(companyUrl.trim())
            ? new URL(companyUrl.trim()).hostname.replace(/^www\./, "")
            : null;
        const researchPrompt =
          method === "company-url" && companyDomain
            ? `${plan.query} site:${companyDomain} (customers OR users OR testimonials OR case studies)`
            : plan.query;
        const serpOptions =
          depth === "deep" ? serpOptionsForDeepResearchExtracted(extracted) : undefined;
        const res = await fetch("/api/research/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: gId,
            prompt: researchPrompt,
            ...(serpOptions ? { serpOptions } : {}),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const added = data.totalResults || 0;
          totalFound += added;
          mergedBySource = mergeQuickResearchBreakdown(mergedBySource, {
            tavilyBySourceType: data.tavilyBySourceType,
            serpByEngine: data.serpByEngine,
          });
          setResearchBySource({ ...mergedBySource });
          setResearchResults(totalFound);
          setResearchLabel(`${plan.label} · +${added} snippets`);
        }
      } catch {
        // continue
      }
    }

    setResearchResults(totalFound);
    setResearchBySource({ ...mergedBySource });
    setProgressPhase("generating");
    setGenTotal(personaCount);
    const sourceTypeOverride = method ? SOURCE_TYPE_MAP[method] : undefined;
    const usedDeepResearchPipeline = method === "deep-search";

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext: extracted.domainContext,
          includeSkeptics,
          clientRunId: runId,
          sourceTypeOverride,
          usedDeepResearchPipeline,
          speedMode: personaSpeedMode,
          async: true,
        }),
      });

      await ensureGenerateResponseOk(response);
      if (finishIfQueuedAsyncGeneration(response)) return;
      await streamGenerationProgress(response, gId, runId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      setStarting(false);
    }
  }

  async function streamGenerationProgress(
    response: Response,
    gId: string,
    runId: string,
    opts?: { onGenerationUiComplete?: () => void }
  ) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No stream");

    const decoder = new TextDecoder();
    let buffer = "";
    const MAX_BUFFER_CHARS = 250_000;

    const processEventLine = (line: string) => {
      if (!line.trim()) return;
      try {
        const event = JSON.parse(line);
        if (event.type === "progress") {
          setGenCompleted(event.completed);
          setGenCurrentName(event.personaName || "");
          publishWidgetState({
            runId,
            groupId: gId,
            phase: "generating",
            completed: Number(event.completed ?? 0),
            total: Number(event.total ?? genTotal),
            currentName: event.personaName || null,
            message: "Building personas",
          });
          if (event.personaName) {
            setLastGeneratedName(event.personaName);
          }
        } else if (event.type === "partial") {
          const n = typeof event.name === "string" ? event.name : "";
          if (n) {
            setGenCurrentName(n);
            setLastGeneratedName(n);
          }
        } else if (event.type === "done") {
          opts?.onGenerationUiComplete?.();
          setProgressPhase("done");
          setStarting(false);

          const generated = Number(event.generated ?? 0);
          const errors = Array.isArray(event.errors) ? event.errors : [];

          if (generated <= 0) {
            setGenerationIssue({
              groupId: gId,
              partial: false,
              message:
                errors[0] ??
                "No personas were generated. Please retry generation or adjust your prompt.",
            });
            toast.error("No personas generated. Please retry.");
            return;
          }

          if (errors.length > 0) {
            setGenerationIssue({
              groupId: gId,
              partial: true,
              message: `${generated} personas were generated, but ${errors.length} failed.`,
            });
            toast.warning(
              `Generated ${generated} personas. ${errors.length} failed.`
            );
          } else {
            setGenerationIssue(null);
            toast.success(`Generated ${generated} personas!`);
          }
          publishWidgetState({
            runId,
            groupId: gId,
            phase: "done",
            completed: generated,
            total: Number(event.generated ?? generated),
            currentName: null,
            message:
              errors.length > 0
                ? `${generated} generated, ${errors.length} failed`
                : "Generation complete",
          });

          const beforeLifetime = loadPersonaEngagement().lifetimeGenerated;
          recordPersonasGenerated(generated, promptText.trim() || undefined);
          const afterLifetime = loadPersonaEngagement().lifetimeGenerated;
          for (const m of getNewlyReachedMilestones(beforeLifetime, afterLifetime)) {
            toast.success(`Milestone: ${milestoneLabel(m)}`);
          }

          setTimeout(() => {
            router.push(`/personas/${gId}?welcome=1`);
          }, 1800);
        } else if (event.type === "error") {
          setStarting(false);
          publishWidgetState({
            runId,
            groupId: gId,
            phase: "error",
            completed: genCompleted,
            total: genTotal,
            currentName: null,
            message:
              typeof event.message === "string" && event.message.trim().length > 0
                ? event.message
                : "Generation failed",
          });
          toast.error(event.message);
        }
      } catch {
        // skip malformed lines
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > MAX_BUFFER_CHARS) {
        throw new Error("Generation stream payload exceeded expected size.");
      }
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        processEventLine(line);
      }
    }
    if (buffer.trim()) {
      processEventLine(buffer);
    }
  }

  // --- Render ---
  const maxBatchUi = creationContext?.maxBatchPersonas ?? 100;

  const headerTitle =
    phase === "progress"
      ? "Creating Your Personas"
      : phase === "form"
        ? method === "templates"
          ? "Start from a Template"
          : method === "deep-search"
            ? "Deep Search"
            : method === "company-url"
              ? "Enter Company URL"
              : method === "linkedin"
                ? "Upload CV / Resume"
                : method === "manual"
                  ? "Build Manually"
                  : method === "ai-generate"
                    ? "App Store Reviews"
                    : "Create Personas"
        : "Create Personas";

  const headerSubtitle =
    phase === "progress"
      ? "Researching real-world data and generating personas..."
      : phase === "form"
        ? method === "deep-search"
          ? "Describe who you need — AI extracts the details."
          : method === "company-url"
            ? "Paste a URL. We’ll extract context and research real user signals."
            : method === "linkedin"
              ? "Upload your CV / resume. We’ll extract context and research real user signals."
              : method === "manual"
                ? "Fill in the persona details directly."
                : method === "ai-generate"
                  ? "Enter an app or target audience. We’ll generate personas (and scrape reviews when applicable)."
                  : method === "templates"
                    ? "Pick a starting audience template and we’ll generate personas for you."
                    : "Choose a creation method."
        : "Brief is pre-filled — tap a starter or edit, then generate. Advanced paths in other tabs.";

  return (
    <div className="mx-auto max-w-3xl px-1 sm:px-0">
      {phase === "form" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2 gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => {
            setPhase("pick");
            setMethod(null);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
      )}
      <motion.div
        key={`${phase}-${method ?? ""}`}
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : 0.24, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-8"
      >
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{headerTitle}</h2>
        <p className="text-muted-foreground mt-2 text-[15px] leading-relaxed">{headerSubtitle}</p>
        {!orgContext && phase !== "progress" && (
          <div className="mt-4 rounded-2xl border border-dashed px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            Tip: add Product Context in Settings first for better persona quality and relevance.
          </div>
        )}
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        {phase === "pick" ? (
          <motion.div
            key="pick"
            initial={reduced ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="mb-6 space-y-4">
              <PersonaProgressTracker
                variant="compact"
                workspacePersonaCount={creationContext?.organizationPersonaCount}
                workspaceTierLabel={creationContext?.qualityTierLabel}
              />
              <PersonaQuickStarters onSelect={(p) => setPromptText(p)} />
              <PersonaPromptHistory />
            </div>
            <PersonaInputWizard
              orgContextHint={Boolean(orgContext)}
              onSelectMethod={handleMethodSelect}
              methodLockReason={methodLockReason}
              chatBar={
                <PersonaChatBar
                  value={promptText}
                  onChange={setPromptText}
                  personaCount={personaCount}
                  onPersonaCountChange={setPersonaCount}
                  maxPersonaBatch={maxBatchUi}
                  deepSearchLocked={creationContext ? !creationContext.deepSearchUnlocked : false}
                  loading={starting || extracting}
                  onSubmit={(value, dataSourceId) => {
                    setPromptText(value);
                    setInitialDescribeText(value);
                    handleChatPipelineCreate(value, dataSourceId);
                  }}
                />
              }
            />
          </motion.div>
        ) : null}
        {phase === "form" && method ? (
          <motion.div
            key={`form-${method}`}
            initial={reduced ? false : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: reduced ? 0 : 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="space-y-6"
          >
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <input
              id="turbo-personas"
              type="checkbox"
              checked={turboMode}
              onChange={(e) => setTurboMode(e.target.checked)}
              className="rounded accent-primary"
            />
            <label htmlFor="turbo-personas" className="cursor-pointer text-sm leading-snug">
              Turbo mode: instant personas from built-in templates (often under two seconds). Leave off for
              parallel AI generation with fuller backstories.
            </label>
          </div>

          {method === "templates" && (
            <StepTemplates
              personaCount={personaCount}
              onPersonaCountChange={setPersonaCount}
              maxPersonas={maxBatchUi}
              loading={starting}
              onContinue={async (templateId) => {
                setStarting(true);
                setChatPipelineSteps(null);

                const template = PERSONA_TEMPLATES.find((t) => t.id === templateId);
                const groupName = template?.name ?? "Persona Group";
                const description =
                  template?.description ?? "Persona group created from template.";

                const formData = new FormData();
                formData.set("name", groupName);
                formData.set("description", description);

                // Prefer existing org product context as domain context if available
                const domainPieces = [];
                if (orgContext?.productName) {
                  domainPieces.push(`Product: ${orgContext.productName}`);
                }
                if (orgContext?.productDescription) {
                  domainPieces.push(`Description: ${orgContext.productDescription}`);
                }
                if (orgContext?.targetAudience) {
                  domainPieces.push(`Target audience: ${orgContext.targetAudience}`);
                }
                if (orgContext?.industry) {
                  domainPieces.push(`Industry: ${orgContext.industry}`);
                }
                if (template) {
                  domainPieces.push(`Persona template: ${template.description}`);
                }

                const domainContext =
                  domainPieces.length > 0 ? domainPieces.join("\n") : template?.description;

                if (domainContext) {
                  formData.set("domainContext", domainContext);
                }
                formData.set("count", String(personaCount));

                const result = await createGroup(formData);
                if (result.error || !result.groupId) {
                  toast.error(result.error || "Failed to create group");
                  setStarting(false);
                  return;
                }

                const gId = result.groupId;
                setPhase("progress");
                setProgressPhase("generating");
                setGenTotal(personaCount);
                const runId = startGlobalWidgetRun(gId, personaCount, "generating");

                try {
                  const response = await fetch("/api/personas/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      groupId: gId,
                      count: personaCount,
                      domainContext: domainContext ?? result.domainContext,
                      includeSkeptics,
                      clientRunId: runId,
                      sourceTypeOverride: "PROMPT_GENERATED",
                      templateId,
                      usedDeepResearchPipeline: false,
                      speedMode: personaSpeedMode,
                      async: true,
                    }),
                  });

                  await ensureGenerateResponseOk(response);
                  if (finishIfQueuedAsyncGeneration(response)) return;
                  await streamGenerationProgress(response, gId, runId);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Generation failed"
                  );
                } finally {
                  setStarting(false);
                }
              }}
            />
          )}

          {method === "deep-search" && (
            <div className="space-y-6">
              <StepDescribe
                onSubmit={handleFreetextInput}
                loading={extracting}
                hasOrgContext={!!orgContext}
                initialText={initialDescribeText ?? undefined}
                hideContinue
                text={deepSearchFreetext}
                onTextChange={setDeepSearchFreetext}
              />
              <SourcesSettings
                depth={depth}
                onDepthChange={setDepth}
                personaCount={personaCount}
                onPersonaCountChange={setPersonaCount}
                includeSkeptics={includeSkeptics}
                onIncludeSkepticsChange={setIncludeSkeptics}
                maxPersonas={maxBatchUi}
              />
              <Button
                type="button"
                onClick={() => handleFreetextInput(deepSearchFreetext)}
                disabled={extracting || deepSearchFreetext.trim().length < 5}
                className="w-full"
              >
                {extracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing your description...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {method === "company-url" && (
            <div className="space-y-6">
              <StepUrl
                url={companyUrl}
                onUrlChange={(v) => {
                  setCompanyUrl(v);
                  setCompanyUrlError(null);
                }}
                disabled={extracting}
                error={companyUrlError}
              />
              <SourcesSettings
                depth={depth}
                onDepthChange={setDepth}
                personaCount={personaCount}
                onPersonaCountChange={setPersonaCount}
                includeSkeptics={includeSkeptics}
                onIncludeSkepticsChange={setIncludeSkeptics}
                showResearchDepth={false}
                maxPersonas={maxBatchUi}
              />
              <Button
                type="button"
                onClick={() => void handleCompanyUrlContinue()}
                disabled={extracting || !isValidHttpUrl(companyUrl)}
                className="w-full"
              >
                {extracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing your description...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {method === "linkedin" && (
            <div className="space-y-6">
              <StepLinkedin
                file={cvResumeFile}
                onFileChange={(f) => {
                  setCvResumeFile(f);
                  setCvResumeError(null);
                }}
                disabled={extracting}
                error={cvResumeError}
              />
              <SourcesSettings
                depth={depth}
                onDepthChange={setDepth}
                personaCount={personaCount}
                onPersonaCountChange={setPersonaCount}
                includeSkeptics={includeSkeptics}
                onIncludeSkepticsChange={setIncludeSkeptics}
                showResearchDepth={false}
                maxPersonas={maxBatchUi}
              />
              <Button
                type="button"
                onClick={() => void handleCvResumeContinue()}
                disabled={extracting || !cvResumeFile}
                className="w-full"
              >
                {extracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing your description...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {method === "manual" && (
            <StepManual
              onSubmit={(ctx) => generateOnlyFromExtracted(ctx)}
              personaCount={personaCount}
              onPersonaCountChange={setPersonaCount}
              maxPersonas={maxBatchUi}
              loading={starting}
            />
          )}

          {method === "ai-generate" && (
            <StepAppStoreReviews
              onSubmitAppUrl={handleAppStoreReviewsFromUrl}
              onSubmitAudience={handleAppStoreReviewsFromAudience}
              loading={starting}
              hasOrgContext={!!orgContext}
              initialText={initialDescribeText ?? undefined}
              personaCount={personaCount}
              onPersonaCountChange={setPersonaCount}
              maxPersonas={maxBatchUi}
              audienceMappingStatus={audienceMappingStatus}
              audienceMappedApps={audienceMappedApps}
              audienceMappingError={audienceMappingError}
              audienceTavilyDisabled={audienceTavilyDisabled}
              onClearAudienceMapping={resetAppStoreAudienceMappingUi}
            />
          )}
          </motion.div>
        ) : null}
        {phase === "progress" ? (
          <>
            {progressViewMode === "expanded" ? (
              <motion.div
                key="progress"
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: reduced ? 0 : 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                className="space-y-4 sm:space-y-5"
              >
                <div className="flex flex-col gap-2 rounded-xl border bg-card/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Persona generation is running in background.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start sm:self-auto"
                    onClick={() => setProgressViewMode("minimized")}
                    aria-label="Minimize generation progress"
                  >
                    <Minimize2 className="mr-1 h-3.5 w-3.5" />
                    Minimize
                  </Button>
                </div>
                <PersonaStreamingProgress
                  phase={progressPhase}
                  genCompleted={genCompleted}
                  genTotal={genTotal}
                  currentName={genCurrentName || lastGeneratedName}
                  researchLabel={researchLabel}
                />
                <PersonaWorkflowCarousel
                  steps={workflowSteps}
                  done={progressPhase === "done"}
                  personaPreview={{
                    name: lastGeneratedName || genCurrentName || "Generated Persona",
                    age: "28-40",
                    role: "Primary User",
                    goals: ["Streamline workflow", "Reduce context switching"],
                    frustrations: ["Pricing confusion", "Missing integrations"],
                    behaviors: ["Mobile-first", "Frequent review reader"],
                  }}
                />
                {generationIssue ? (
                  <div className="rounded-lg border bg-card p-3">
                    <p className="text-sm text-foreground">{generationIssue.message}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setGenerationIssue(null);
                          router.refresh();
                        }}
                      >
                        Retry generation
                      </Button>
                      <Button
                        type="button"
                        onClick={() => router.push(`/personas/${generationIssue.groupId}`)}
                      >
                        Open persona group
                      </Button>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            ) : (
              <motion.div
                key="progress-minimized"
                initial={reduced ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
                className="rounded-xl border border-dashed bg-card/50 p-4 text-sm text-muted-foreground"
              >
                Progress minimized. You can keep working while personas generate.
              </motion.div>
            )}

          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
