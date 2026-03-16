"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createGroup } from "@/app/(dashboard)/personas/actions";
import { StepMethodPicker, type CreationMethod } from "./step-method-picker";
import { StepDescribe } from "./step-describe";
import { StepManual } from "./step-manual";
import { StepLinkedin } from "./step-linkedin";
import { StepUrl } from "./step-url";
import { StepReview } from "./step-review";
import { StepSources } from "./step-sources";
import { StepProgress } from "./step-progress";
import type { ExtractedContext } from "@/lib/validation/schemas";
import { searchTavily, saveResearchResults } from "@/lib/research/tavily";
import { buildQueriesFromContext } from "@/lib/research/build-queries";

type Phase = "pick" | "describe" | "manual" | "linkedin" | "url" | "review" | "sources" | "progress";

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
const SKIP_SOURCES_METHODS: CreationMethod[] = ["ai-generate", "manual"];

// sourceType override per method
const SOURCE_TYPE_MAP: Partial<Record<CreationMethod, string>> = {
  "ai-generate": "PROMPT_GENERATED",
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

  // Step: Review
  const [extracted, setExtracted] = useState<ExtractedContext | null>(null);

  // Step: Sources
  const [selectedSources, setSelectedSources] = useState<string[]>(["reddit", "forums"]);
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

  // --- Method selection ---

  function handleMethodSelect(m: CreationMethod) {
    setMethod(m);
    if (m === "deep-search" || m === "ai-generate") {
      setPhase("describe");
    } else {
      setPhase(m as Phase);
    }
  }

  // --- Step: Describe (AI Generate + Deep Search) ---

  async function handleDescribe(text: string) {
    setExtracting(true);
    try {
      const response = await fetch("/api/personas/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freetext: text, orgContext }),
      });
      if (!response.ok) throw new Error("Extraction failed");
      const data: ExtractedContext = await response.json();
      setExtracted(data);
      setPhase("review");
    } catch {
      toast.error("Failed to analyze your description. Please try again.");
    } finally {
      setExtracting(false);
    }
  }

  // --- From Review: decide next step ---

  function handleReviewContinue() {
    if (method && SKIP_SOURCES_METHODS.includes(method)) {
      // No research — go straight to generate
      handleGenerateOnly();
    } else {
      setPhase("sources");
    }
  }

  // --- Generate without research ---

  async function handleGenerateOnly() {
    if (!extracted) return;
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

  async function handleResearchAndGenerate() {
    if (!extracted) return;
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
    setPhase("progress");
    setProgressPhase("researching");

    const queries = buildQueriesFromContext({
      targetUserRole: extracted.targetUserRole,
      industry: extracted.industry,
      painPoints: extracted.painPoints,
      domainContext: extracted.domainContext,
      selectedSources,
      depth,
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

  async function streamGenerationProgress(response: Response, gId: string) {
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

  const isPickPhase = phase === "pick";
  const stepLabels =
    method && SKIP_SOURCES_METHODS.includes(method)
      ? ["Input", "Review", "Generate"]
      : ["Input", "Review", "Sources", "Generate"];

  const stepIndex =
    phase === "describe" || phase === "manual" || phase === "linkedin" || phase === "url" ? 0
    : phase === "review" ? 1
    : phase === "sources" ? 2
    : phase === "progress" ? (stepLabels.length - 1)
    : -1;

  const titles: Partial<Record<Phase, string>> = {
    pick: "Create Personas",
    describe: "Describe Your Personas",
    manual: "Build Manually",
    linkedin: "Upload LinkedIn PDF",
    url: "Enter Company URL",
    review: "Review & Refine",
    sources: "Research & Settings",
    progress: "Creating Your Personas",
  };

  const subtitles: Partial<Record<Phase, string>> = {
    pick: "Choose a creation method.",
    describe: "Describe who you need — AI extracts the details.",
    manual: "Fill in the persona details directly.",
    linkedin: "We'll extract persona context from the PDF.",
    url: "We'll scrape the URL to infer target users.",
    review: "We extracted these details. Edit anything that's off.",
    sources: "Choose data sources and generation settings.",
    progress: "Researching real-world data and generating personas...",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">{titles[phase]}</h2>
        <p className="text-muted-foreground mt-1">{subtitles[phase]}</p>

        {!isPickPhase && stepIndex >= 0 && (
          <div className="flex gap-1.5 mt-4">
            {stepLabels.map((_, s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${s <= stepIndex ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        )}
      </div>

      {phase === "pick" && (
        <StepMethodPicker onSelect={handleMethodSelect} />
      )}

      {phase === "describe" && (
        <StepDescribe
          onSubmit={handleDescribe}
          loading={extracting}
          hasOrgContext={!!orgContext}
        />
      )}

      {phase === "manual" && (
        <StepManual
          onSubmit={(ctx) => { setExtracted(ctx); setPhase("review"); }}
          onBack={() => setPhase("pick")}
        />
      )}

      {phase === "linkedin" && (
        <StepLinkedin
          onExtracted={(ctx) => { setExtracted(ctx); setPhase("review"); }}
          onBack={() => setPhase("pick")}
        />
      )}

      {phase === "url" && (
        <StepUrl
          onExtracted={(ctx) => { setExtracted(ctx); setPhase("review"); }}
          onBack={() => setPhase("pick")}
        />
      )}

      {phase === "review" && extracted && (
        <StepReview
          extracted={extracted}
          onChange={setExtracted}
          orgContext={orgContext}
          onBack={() => {
            if (method === "deep-search" || method === "ai-generate") setPhase("describe");
            else if (method) setPhase(method as Phase);
            else setPhase("pick");
          }}
          onContinue={handleReviewContinue}
        />
      )}

      {phase === "sources" && (
        <StepSources
          selectedSources={selectedSources}
          onSourcesChange={setSelectedSources}
          depth={depth}
          onDepthChange={setDepth}
          personaCount={personaCount}
          onPersonaCountChange={setPersonaCount}
          includeSkeptics={includeSkeptics}
          onIncludeSkepticsChange={setIncludeSkeptics}
          onBack={() => setPhase("review")}
          onGenerate={handleResearchAndGenerate}
          loading={starting}
        />
      )}

      {phase === "progress" && (
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
      )}
    </div>
  );
}
