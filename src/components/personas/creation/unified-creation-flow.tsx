"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { createGroup } from "@/app/(dashboard)/personas/actions";
import { PERSONA_TEMPLATES } from "@/lib/personas/templates";
import { StepMethodPicker, type CreationMethod } from "./step-method-picker";
import { StepDescribe } from "./step-describe";
import { StepManual } from "./step-manual";
import { StepLinkedin } from "./step-linkedin";
import { StepUrl, isValidHttpUrl } from "./step-url";
import { SourcesSettings } from "./step-sources";
import { StepProgress } from "./step-progress";
import { StepTemplates } from "./step-templates";
import { PersonaChatBar } from "./persona-chat-bar";
import { StepAppStoreReviews } from "./step-app-store-reviews";
import { ChatPipelineProgress, type ChatPipelineStepView } from "./chat-pipeline-progress";
import { type ChatDataSourceId } from "./chat-research-pipeline";
import { buildChatDisplayPipeline } from "./chat-pipeline-display-plan";
import type {
  AppStoreAudienceMappedApp,
  ExtractedContext,
} from "@/lib/validation/schemas";
import type { AudienceMappingUiStatus } from "./audience-app-mapping-preview";
import { searchTavily, saveResearchResults } from "@/lib/research/tavily";
import { ALL_RESEARCH_SOURCE_IDS, buildQueriesFromContext } from "@/lib/research/build-queries";

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

export function UnifiedCreationFlow({ orgContext }: UnifiedCreationFlowProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("pick");
  const [method, setMethod] = useState<CreationMethod | null>(null);

  // Step: Describe
  const [extracting, setExtracting] = useState(false);

  // Step: Research settings (inline). All Tavily source categories are always used.
  const [depth, setDepth] = useState<"quick" | "deep">("quick");
  const [personaCount, setPersonaCount] = useState(10);
  const [includeSkeptics, setIncludeSkeptics] = useState(true);

  // Step: Progress
  const [progressPhase, setProgressPhase] = useState<"researching" | "generating" | "done">("researching");
  const [researchCurrent, setResearchCurrent] = useState(0);
  const [researchTotal, setResearchTotal] = useState(0);
  const [researchLabel, setResearchLabel] = useState("");
  const [researchResults, setResearchResults] = useState(0);
  const [researchBySource, setResearchBySource] = useState<Record<string, number>>({});
  const [genCompleted, setGenCompleted] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genCurrentName, setGenCurrentName] = useState("");
  const [starting, setStarting] = useState(false);
  const [chatPipelineSteps, setChatPipelineSteps] = useState<ChatPipelineStepView[] | null>(null);

  // Chat entry → describe step
  const [promptText, setPromptText] = useState("");
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

  // --- Method selection ---

  function handleMethodSelect(m: CreationMethod) {
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
      setPersonaCount((c) => Math.min(100, Math.max(1, c)));
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

  // --- Quick create from chat bar (Template-like flow) ---

  async function handleChatQuickCreate(text: string) {
    setStarting(true);

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
    setProgressPhase("generating");
    setGenTotal(personaCount);

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext,
          sourceTypeOverride: "PROMPT_GENERATED",
        }),
      });

      if (!response.ok) throw new Error("Generation failed");
      await streamGenerationProgress(response, gId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    }
  }

  async function runVisualStep(ms = 350) {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  async function pipelineStepSettledPause() {
    await new Promise<void>((resolve) => setTimeout(resolve, 240));
  }

  function setPipelineStatus(stepId: string, status: ChatPipelineStepView["status"]) {
    setChatPipelineSteps((prev) => {
      if (!prev) return prev;
      return prev.map((s) => (s.id === stepId ? { ...s, status } : s));
    });
  }

  // --- Chat pipeline (All Data Sources / scoped sources) ---
  async function handleChatPipelineCreate(text: string, dataSourceId: string) {
    setStarting(true);
    setGenCompleted(0);
    setGenCurrentName("");

    const source = (dataSourceId || "all") as ChatDataSourceId;
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

    let totalSources = 0;
    const bySource: Record<string, number> = {};
    let tavilyPass = 0;

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
          const res = await fetch("/api/research/quick", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ groupId: gId, prompt: text }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || "Research failed");
          const added = data.totalResults || 0;
          totalSources += added;
          tavilyPass += 1;
          const key =
            source === "company-urls"
              ? "WEB"
              : tavilyPass === 1
                ? "FORUM"
                : "WEB";
          bySource[key] = (bySource[key] || 0) + added;
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
          sourceTypeOverride,
        }),
      });
      if (!response.ok) throw new Error("Generation failed");
      await streamGenerationProgress(response, gId, {
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

      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext,
          sourceTypeOverride: "DATA_BASED",
        }),
      });

      if (!response.ok) throw new Error("Generation failed");
      await streamGenerationProgress(response, gId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      setStarting(false);
    }
  }

  async function handleAppStoreReviewsFromAudience(audiencePlain: string) {
    const audience = audiencePlain.trim();
    setStarting(true);
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
    const tavilyOff = Boolean(mapData.tavilyDisabled);
    setAudienceTavilyDisabled(tavilyOff);
    setAudienceMappedApps(apps);
    setAudienceMappingStatus("success");

    if (tavilyOff) {
      toast.info(
        "App discovery needs Tavily (TAVILY_API_KEY). Use the App tab with a direct App Store URL."
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

      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext,
          sourceTypeOverride: "DATA_BASED",
        }),
      });

      if (!response.ok) throw new Error("Generation failed");
      await streamGenerationProgress(response, gId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
      setStarting(false);
    }
  }

  // --- Step: Describe (AI Generate + Deep Search) ---

  async function handleFreetextInput(text: string) {
    setExtracting(true);
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
    setStarting(true);

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

    const sourceTypeOverride = method ? SOURCE_TYPE_MAP[method] : undefined;

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext: extracted.domainContext,
          sourceTypeOverride,
        }),
      });

      if (!response.ok) throw new Error("Generation failed");
      await streamGenerationProgress(response, gId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    }
  }

  // --- Research + Generate (Deep Search / LinkedIn / Company URL) ---

  async function researchAndGenerateFromExtracted(extracted: ExtractedContext) {
    setStarting(true);

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

    for (let i = 0; i < queries.length; i++) {
      const plan = queries[i];
      setResearchCurrent(i + 1);
      setResearchLabel(plan.label);

      try {
        const res = await fetch("/api/research/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId: gId, prompt: plan.query }),
        });
        if (res.ok) {
          const data = await res.json();
          totalFound += data.totalResults || 0;
        }
      } catch {
        // continue
      }
    }

    setResearchResults(totalFound);
    setProgressPhase("generating");
    setGenTotal(personaCount);

    const sourceTypeOverride = method ? SOURCE_TYPE_MAP[method] : undefined;

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext: extracted.domainContext,
          sourceTypeOverride,
        }),
      });

      if (!response.ok) throw new Error("Generation failed");
      await streamGenerationProgress(response, gId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    }
  }

  async function streamGenerationProgress(
    response: Response,
    gId: string,
    opts?: { onGenerationUiComplete?: () => void }
  ) {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No stream");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (event.type === "progress") {
            setGenCompleted(event.completed);
            setGenCurrentName(event.personaName || "");
          } else if (event.type === "done") {
            opts?.onGenerationUiComplete?.();
            setProgressPhase("done");
            toast.success(`Generated ${event.generated} personas!`);
            setTimeout(() => {
              router.push(`/personas/${gId}`);
              router.refresh();
            }, 1000);
          } else if (event.type === "error") {
            toast.error(event.message);
          }
        } catch {
          // skip
        }
      }
    }
  }

  // --- Render ---
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
        : "Describe your audience or choose a creation method.";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">{headerTitle}</h2>
        <p className="text-muted-foreground mt-1">{headerSubtitle}</p>

      </div>

      {phase === "pick" && (
        <PersonaChatBar
          value={promptText}
          onChange={setPromptText}
          personaCount={personaCount}
          onPersonaCountChange={setPersonaCount}
          loading={starting || extracting}
          onSubmit={(value, dataSourceId) => {
            setPromptText(value);
            setInitialDescribeText(value);
            handleChatPipelineCreate(value, dataSourceId);
          }}
        />
      )}

      {phase === "pick" && (
        <StepMethodPicker onSelect={handleMethodSelect} />
      )}
      {phase === "form" && method && (
        <div className="space-y-6">
          {method === "templates" && (
            <StepTemplates
              personaCount={personaCount}
              onPersonaCountChange={setPersonaCount}
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

                try {
                  const response = await fetch("/api/personas/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      groupId: gId,
                      count: personaCount,
                      domainContext: domainContext ?? result.domainContext,
                      sourceTypeOverride: "PROMPT_GENERATED",
                      templateId,
                    }),
                  });

                  if (!response.ok) throw new Error("Generation failed");
                  await streamGenerationProgress(response, gId);
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
              audienceMappingStatus={audienceMappingStatus}
              audienceMappedApps={audienceMappedApps}
              audienceMappingError={audienceMappingError}
              audienceTavilyDisabled={audienceTavilyDisabled}
              onClearAudienceMapping={resetAppStoreAudienceMappingUi}
            />
          )}
        </div>
      )}

      {phase === "progress" && (
        chatPipelineSteps ? (
          <ChatPipelineProgress
            steps={chatPipelineSteps}
            genCompleted={genCompleted}
            genTotal={genTotal}
            genCurrentName={genCurrentName}
          />
        ) : (
          <StepProgress
            phase={progressPhase}
            researchCurrent={researchCurrent}
            researchTotal={researchTotal}
            researchLabel={researchLabel}
            researchResults={researchResults}
            researchBySource={researchBySource}
            genCompleted={genCompleted}
            genTotal={genTotal}
            genCurrentName={genCurrentName}
          />
        )
      )}
    </div>
  );
}
