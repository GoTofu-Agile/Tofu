"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createGroup } from "@/app/(dashboard)/personas/actions";
import { MethodSelector, type CreationMethod } from "./method-selector";
import { QuickPromptForm } from "./quick-prompt-form";
import { ManualForm } from "./manual-form";
import { WebResearchForm } from "./web-research-form";
import { GroupSettings } from "./group-settings";
import { GenerationProgress } from "./generation-progress";
import type { ManualFormInput } from "@/lib/validation/schemas";

type Phase = "select-method" | "configure" | "settings" | "generating";

export interface OrgContext {
  productName?: string;
  productDescription?: string;
  targetAudience?: string;
  industry?: string;
  competitors?: string;
}

interface PersonaCreationFlowProps {
  orgContext?: OrgContext;
}

export function PersonaCreationFlow({ orgContext }: PersonaCreationFlowProps) {
  const router = useRouter();

  // Flow state
  const [phase, setPhase] = useState<Phase>("select-method");
  const [method, setMethod] = useState<CreationMethod | null>(null);

  // Group state
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [domainContext, setDomainContext] = useState("");
  const [personaCount, setPersonaCount] = useState(10);
  const [includeSkeptics, setIncludeSkeptics] = useState(true);
  const [researchCount, setResearchCount] = useState(0);

  // Loading states
  const [autoResearching, setAutoResearching] = useState(false);
  const [researchMessage, setResearchMessage] = useState("");

  // Generation state
  const [genProgress, setGenProgress] = useState({
    completed: 0,
    total: 0,
    name: "",
  });
  const [genDone, setGenDone] = useState(false);

  // --- Helpers ---

  async function createGroupForMethod(
    name: string,
    description: string,
    context: string
  ): Promise<string | null> {
    const formData = new FormData();
    formData.set("name", name);
    formData.set("description", description);
    formData.set("domainContext", context);
    formData.set("count", String(personaCount));

    const result = await createGroup(formData);
    if (result.error) {
      toast.error(result.error);
      return null;
    }
    setGroupId(result.groupId!);
    return result.groupId!;
  }

  async function runAutoResearch(
    gId: string,
    params: {
      prompt?: string;
      role?: string;
      industry?: string;
      painPoints?: string;
    }
  ): Promise<number> {
    setAutoResearching(true);
    setResearchMessage("Searching for real-world data...");

    try {
      const response = await fetch("/api/research/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: gId, ...params }),
      });

      if (!response.ok) return 0;
      const data = await response.json();
      const count = data.totalResults || 0;
      setResearchCount(count);
      return count;
    } catch {
      return 0;
    } finally {
      setAutoResearching(false);
      setResearchMessage("");
    }
  }

  async function startGeneration() {
    if (!groupId) return;

    setPhase("generating");
    setGenProgress({ completed: 0, total: personaCount, name: "" });

    try {
      const response = await fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          count: personaCount,
          domainContext,
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
              setGenProgress({
                completed: event.completed,
                total: event.total,
                name: event.personaName || "",
              });
            } else if (event.type === "done") {
              setGenDone(true);
              toast.success(`Generated ${event.generated} personas!`);
              setTimeout(() => {
                router.push(`/personas/${groupId}`);
                router.refresh();
              }, 800);
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
      setPhase("settings");
    }
  }

  // --- Method Handlers ---

  function handleMethodSelect(m: CreationMethod) {
    setMethod(m);
    setPhase("configure");
  }

  function buildOrgContextString(): string {
    if (!orgContext) return "";
    const parts: string[] = [];
    if (orgContext.productName)
      parts.push(`Product: ${orgContext.productName}`);
    if (orgContext.productDescription)
      parts.push(`Description: ${orgContext.productDescription}`);
    if (orgContext.targetAudience)
      parts.push(`Target audience: ${orgContext.targetAudience}`);
    if (orgContext.industry) parts.push(`Industry: ${orgContext.industry}`);
    if (orgContext.competitors)
      parts.push(`Competitors: ${orgContext.competitors}`);
    return parts.length > 0
      ? `\n\nOrganization context:\n${parts.join("\n")}`
      : "";
  }

  async function handleQuickPromptSubmit(prompt: string) {
    const name = prompt.length > 60 ? prompt.slice(0, 57) + "..." : prompt;
    const context = `Generate personas matching this description: ${prompt}${buildOrgContextString()}`;

    const gId = await createGroupForMethod(
      name,
      `Quick prompt: ${prompt}`,
      context
    );
    if (!gId) return;

    setGroupName(name);
    setDomainContext(context);

    // Auto-research
    const count = await runAutoResearch(gId, { prompt });
    setResearchCount(count);
    setPhase("settings");
  }

  async function handleManualSubmit(data: ManualFormInput) {
    const parts: string[] = [];
    parts.push(`Role/Occupation: ${data.role}`);
    if (data.industry) parts.push(`Industry: ${data.industry}`);
    if (data.company) parts.push(`Company type: ${data.company}`);
    if (data.ageRange !== "Any") parts.push(`Age range: ${data.ageRange}`);
    if (data.location) parts.push(`Location: ${data.location}`);
    if (data.background) parts.push(`Background: ${data.background}`);
    if (data.painPoints) parts.push(`Pain points: ${data.painPoints}`);
    if (data.tools) parts.push(`Tools/products: ${data.tools}`);

    const context = parts.join("\n") + buildOrgContextString();
    const name = `${data.role}${data.industry ? ` — ${data.industry}` : ""}`;

    const gId = await createGroupForMethod(
      name,
      `Manual: ${data.role}${data.industry ? ` in ${data.industry}` : ""}`,
      context
    );
    if (!gId) return;

    setGroupName(name);
    setDomainContext(context);

    // Auto-research
    const count = await runAutoResearch(gId, {
      role: data.role,
      industry: data.industry || undefined,
      painPoints: data.painPoints || undefined,
    });
    setResearchCount(count);
    setPhase("settings");
  }

  async function handleWebResearchCreateGroup(data: {
    productName: string;
    oneLiner: string;
    targetAudience: string;
  }) {
    const name = `${data.productName} — ${data.targetAudience}`;
    const context = `Product: ${data.productName}\n${data.oneLiner}\nTarget audience: ${data.targetAudience}`;

    const gId = await createGroupForMethod(name, data.oneLiner, context);
    return gId;
  }

  function handleWebResearchComplete(data: {
    totalResults: number;
    domainContext: string;
    groupName: string;
  }) {
    setDomainContext(data.domainContext);
    setGroupName(data.groupName);
    setResearchCount(data.totalResults);
    setPhase("settings");
  }

  function handleBack() {
    if (phase === "configure") {
      setPhase("select-method");
      setMethod(null);
      setGroupId(null);
    } else if (phase === "settings") {
      setPhase("configure");
    }
  }

  // --- Render ---

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {phase === "select-method" && "Create Personas"}
          {phase === "configure" && method === "quick-prompt" && "Quick Prompt"}
          {phase === "configure" && method === "web-research" && "Web Research"}
          {phase === "configure" && method === "manual" && "Manual + AI"}
          {phase === "settings" && "Customize Your Group"}
          {phase === "generating" && "Generating Personas"}
        </h2>
        <p className="text-muted-foreground mt-1">
          {phase === "select-method" &&
            "Choose how you want to create your personas."}
          {phase === "configure" &&
            method === "quick-prompt" &&
            "Describe your target user — we'll research and generate diverse personas."}
          {phase === "configure" &&
            method === "web-research" &&
            "Tell us about your product — we'll search the web for real user data."}
          {phase === "configure" &&
            method === "manual" &&
            "Provide key details — AI fills in personality, backstory, and interview behavior."}
          {phase === "settings" &&
            "Review and adjust before generating."}
          {phase === "generating" && "This may take a minute..."}
        </p>

        {/* Step indicator */}
        {phase !== "select-method" && (
          <div className="flex gap-1.5 mt-4">
            {["configure", "settings", "generating"].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s === phase ||
                  (s === "configure" && (phase === "settings" || phase === "generating")) ||
                  (s === "settings" && phase === "generating")
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Phase: Select Method */}
      {phase === "select-method" && (
        <MethodSelector onSelect={handleMethodSelect} />
      )}

      {/* Phase: Configure (method-specific) */}
      {phase === "configure" && method === "quick-prompt" && (
        <QuickPromptForm
          onSubmit={handleQuickPromptSubmit}
          onBack={handleBack}
          loading={autoResearching}
          loadingMessage={researchMessage}
        />
      )}

      {phase === "configure" && method === "manual" && (
        <ManualForm
          onSubmit={handleManualSubmit}
          onBack={handleBack}
          loading={autoResearching}
          loadingMessage={researchMessage}
        />
      )}

      {phase === "configure" && method === "web-research" && (
        <WebResearchForm
          groupId={groupId}
          onCreateGroup={handleWebResearchCreateGroup}
          onResearchComplete={handleWebResearchComplete}
          onBack={handleBack}
          initialProductName={orgContext?.productName}
          initialOneLiner={orgContext?.productDescription}
          initialTargetAudience={orgContext?.targetAudience}
          initialCompetitors={orgContext?.competitors}
        />
      )}

      {/* Phase: Settings */}
      {phase === "settings" && (
        <GroupSettings
          groupName={groupName}
          onGroupNameChange={setGroupName}
          personaCount={personaCount}
          onPersonaCountChange={setPersonaCount}
          includeSkeptics={includeSkeptics}
          onIncludeSkepticsChange={setIncludeSkeptics}
          researchCount={researchCount}
          onBack={handleBack}
          onGenerate={startGeneration}
          generating={false}
        />
      )}

      {/* Phase: Generating */}
      {phase === "generating" && (
        <GenerationProgress
          completed={genProgress.completed}
          total={genProgress.total}
          currentName={genProgress.name}
          done={genDone}
        />
      )}
    </div>
  );
}
