"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createGroup } from "@/app/(dashboard)/personas/actions";
import { StepDescribe } from "./step-describe";
import { StepReview } from "./step-review";
import { StepSources } from "./step-sources";
import { StepProgress } from "./step-progress";
import type { ExtractedContext } from "@/lib/validation/schemas";
import {
  searchTavily,
  saveResearchResults,
} from "@/lib/research/tavily";
import { buildQueriesFromContext } from "@/lib/research/build-queries";

type Phase = "describe" | "review" | "sources" | "progress";

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

export function UnifiedCreationFlow({ orgContext }: UnifiedCreationFlowProps) {
  const router = useRouter();

  // Phase
  const [phase, setPhase] = useState<Phase>("describe");

  // Step 1: Describe
  const [extracting, setExtracting] = useState(false);
  const [freetext, setFreetext] = useState("");

  // Step 2: Review
  const [extracted, setExtracted] = useState<ExtractedContext | null>(null);

  // Step 3: Sources
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "reddit",
    "forums",
  ]);
  const [depth, setDepth] = useState<"quick" | "deep">("quick");
  const [personaCount, setPersonaCount] = useState(10);
  const [includeSkeptics, setIncludeSkeptics] = useState(true);

  // Step 4: Progress
  const [groupId, setGroupId] = useState<string | null>(null);
  const [progressPhase, setProgressPhase] = useState<
    "researching" | "generating" | "done"
  >("researching");
  const [researchCurrent, setResearchCurrent] = useState(0);
  const [researchTotal, setResearchTotal] = useState(0);
  const [researchLabel, setResearchLabel] = useState("");
  const [researchResults, setResearchResults] = useState(0);
  const [researchBySource, setResearchBySource] = useState<
    Record<string, number>
  >({});
  const [genCompleted, setGenCompleted] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genCurrentName, setGenCurrentName] = useState("");
  const [starting, setStarting] = useState(false);

  // --- Step 1: Extract ---

  async function handleDescribe(text: string) {
    setFreetext(text);
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

  // --- Step 4: Research & Generate ---

  async function handleResearchAndGenerate() {
    if (!extracted) return;
    setStarting(true);

    // 1. Create group
    const formData = new FormData();
    formData.set("name", extracted.groupName);
    formData.set(
      "description",
      `${extracted.targetUserRole}${extracted.industry ? ` — ${extracted.industry}` : ""}`
    );
    formData.set("domainContext", extracted.domainContext);
    formData.set("count", String(personaCount));

    const result = await createGroup(formData);
    if (result.error) {
      toast.error(result.error);
      setStarting(false);
      return;
    }
    const gId = result.groupId!;
    setGroupId(gId);
    setPhase("progress");

    // 2. Research
    const queries = buildQueriesFromContext({
      targetUserRole: extracted.targetUserRole,
      industry: extracted.industry,
      painPoints: extracted.painPoints,
      domainContext: extracted.domainContext,
      selectedSources,
      depth,
    });

    setResearchTotal(queries.length);
    setProgressPhase("researching");
    const searchSession = crypto.randomUUID();
    let totalFound = 0;
    const sourceCounts: Record<string, number> = {};

    for (let i = 0; i < queries.length; i++) {
      const plan = queries[i];
      setResearchCurrent(i + 1);
      setResearchLabel(plan.label);

      try {
        const results = await fetch("/api/research/quick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId: gId,
            prompt: plan.query,
          }),
        });
        if (results.ok) {
          const data = await results.json();
          totalFound += data.totalResults || 0;
        }
      } catch {
        // Continue with next query
      }
    }

    setResearchResults(totalFound);

    // 3. Generate
    setProgressPhase("generating");
    setGenTotal(personaCount);

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: gId,
          count: personaCount,
          domainContext: extracted.domainContext,
        }),
      });

      if (!response.ok) throw new Error("Generation failed");

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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Generation failed"
      );
    }
  }

  // --- Render ---

  const stepIndex =
    phase === "describe" ? 0 : phase === "review" ? 1 : phase === "sources" ? 2 : 3;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {phase === "describe" && "Create Personas"}
          {phase === "review" && "Review & Refine"}
          {phase === "sources" && "Research & Settings"}
          {phase === "progress" && "Creating Your Personas"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {phase === "describe" &&
            "Describe who you need — we'll handle the rest."}
          {phase === "review" &&
            "We extracted these details. Edit anything that's off."}
          {phase === "sources" &&
            "Choose data sources and generation settings."}
          {phase === "progress" &&
            "Researching real-world data and generating personas..."}
        </p>

        {/* Step indicator */}
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= stepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {phase === "describe" && (
        <StepDescribe
          onSubmit={handleDescribe}
          loading={extracting}
          hasOrgContext={!!orgContext}
        />
      )}

      {phase === "review" && extracted && (
        <StepReview
          extracted={extracted}
          onChange={setExtracted}
          orgContext={orgContext}
          onBack={() => setPhase("describe")}
          onContinue={() => setPhase("sources")}
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
