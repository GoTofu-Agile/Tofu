"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createGroup } from "@/app/(dashboard)/personas/actions";
import {
  RESEARCH_GOALS,
  TARGET_AUDIENCES,
} from "@/lib/research/build-queries";
import {
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Globe,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface ResearchResultItem {
  id: string;
  title: string;
  sourceType: string;
  sourceDomain: string;
  sourceUrl: string;
  publishedAt: string | null;
  relevanceScore: number;
}

interface ResearchSummary {
  totalResults: number;
  bySource: Record<string, number>;
  results: ResearchResultItem[];
}

export function CreationWizard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);

  // Step 1: Product info
  const [productName, setProductName] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [researchGoals, setResearchGoals] = useState<string[]>([
    "pain_points",
  ]);

  // Step 2: Research results
  const [researching, setResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState("");
  const [researchData, setResearchData] = useState<ResearchSummary | null>(
    null
  );
  const [groupId, setGroupId] = useState<string | null>(null);

  // Step 3: Settings
  const [groupName, setGroupName] = useState("");
  const [personaCount, setPersonaCount] = useState(10);
  const [includeSkeptics, setIncludeSkeptics] = useState(true);

  // Step 4: Generating
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState<{
    completed: number;
    total: number;
    name: string;
  } | null>(null);

  function toggleGoal(goal: string) {
    setResearchGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  function resetWizard() {
    setStep(1);
    setProductName("");
    setOneLiner("");
    setTargetAudience("");
    setCompetitors("");
    setResearchGoals(["pain_points"]);
    setResearchData(null);
    setGroupId(null);
    setGroupName("");
    setPersonaCount(10);
    setIncludeSkeptics(true);
    setGenerating(false);
    setGenProgress(null);
  }

  // Step 1 → 2: Create group + start research
  async function startResearch() {
    if (!productName || !oneLiner || !targetAudience) {
      toast.error("Please fill in all required fields");
      return;
    }

    setResearching(true);
    setResearchProgress("Creating persona group...");

    // Create the group first
    const formData = new FormData();
    const autoName = `${productName} — ${targetAudience}`;
    formData.set("name", autoName);
    formData.set(
      "description",
      `Personas for ${productName}: ${oneLiner}`
    );
    formData.set("domainContext", oneLiner);
    formData.set("count", String(personaCount));

    const result = await createGroup(formData);
    if (result.error) {
      toast.error(result.error);
      setResearching(false);
      return;
    }

    setGroupId(result.groupId!);
    setGroupName(autoName);

    // Start Tavily research
    setResearchProgress("Searching the web...");

    try {
      const competitorList = competitors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: result.groupId,
          productInfo: {
            productName,
            oneLiner,
            targetAudience,
            competitors: competitorList,
            researchGoals,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Research failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      const allResults: ResearchResultItem[] = [];
      const bySource: Record<string, number> = {};

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
            if (event.type === "searching") {
              setResearchProgress(
                `Searching ${event.current}/${event.total}: ${event.label}`
              );
            } else if (event.type === "results") {
              for (const r of event.results) {
                allResults.push(r);
                bySource[r.sourceType] =
                  (bySource[r.sourceType] || 0) + 1;
              }
            } else if (event.type === "done") {
              setResearchData({
                totalResults: event.totalResults,
                bySource,
                results: allResults,
              });
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Research failed"
      );
    } finally {
      setResearching(false);
      setStep(2);
    }
  }

  // Step 4: Generate personas
  async function startGeneration() {
    if (!groupId) return;
    setGenerating(true);
    setGenProgress({ completed: 0, total: personaCount, name: "" });
    setStep(4);

    try {
      const domainContext = `Product: ${productName}\n${oneLiner}\nTarget audience: ${targetAudience}${competitors ? `\nCompetitors: ${competitors}` : ""}`;

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
                name: event.personaName,
              });
            } else if (event.type === "done") {
              toast.success(`Generated ${event.generated} personas!`);
            } else if (event.type === "error") {
              toast.error(event.message);
            }
          } catch {
            // skip
          }
        }
      }

      setOpen(false);
      resetWizard();
      router.push(`/personas/${groupId}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Generation failed"
      );
      setGenerating(false);
    }
  }

  const sourceTypeLabels: Record<string, string> = {
    REDDIT: "Reddit",
    APP_REVIEW: "App Store",
    PLAY_STORE_REVIEW: "Play Store",
    FORUM: "Forums",
    PRODUCT_HUNT: "ProductHunt",
    G2_REVIEW: "G2",
    TRUSTPILOT: "Trustpilot",
    NEWS: "News",
    ACADEMIC: "Academic",
    SOCIAL_MEDIA: "Social Media",
    MANUAL: "Manual",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetWizard();
      }}
    >
      <DialogTrigger className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 h-9 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80">
        <Plus className="h-4 w-4" />
        Create Personas
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === 1 && "Tell us about your product"}
            {step === 2 && "Research results"}
            {step === 3 && "Customize your group"}
            {step === 4 && "Generating personas"}
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex gap-1.5 pt-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  s <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Product Info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Flo, Clue, Keleya"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oneLiner">What does it do? *</Label>
              <Textarea
                id="oneLiner"
                value={oneLiner}
                onChange={(e) => setOneLiner(e.target.value)}
                placeholder="e.g. Period tracking app that helps women understand their cycle and fertility"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Target Audience *</Label>
              <select
                id="targetAudience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select...</option>
                {TARGET_AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="competitors">
                Competitor Apps{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="competitors"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                placeholder="e.g. Flo, Clue, Natural Cycles"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. We&apos;ll search for user feedback about
                these.
              </p>
            </div>
            <div className="space-y-2">
              <Label>What do you want to learn?</Label>
              <div className="flex flex-wrap gap-2">
                {RESEARCH_GOALS.map((goal) => (
                  <button
                    key={goal.value}
                    type="button"
                    onClick={() => toggleGoal(goal.value)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      researchGoals.includes(goal.value)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground/30"
                    }`}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={startResearch}
              className="w-full"
              disabled={
                researching || !productName || !oneLiner || !targetAudience
              }
            >
              {researching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {researchProgress}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Research & Continue
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Research Results */}
        {step === 2 && (
          <div className="space-y-4">
            {researchData && researchData.totalResults > 0 ? (
              <>
                <div className="rounded-lg border bg-muted/30 p-4 text-center">
                  <Globe className="mx-auto h-8 w-8 text-primary mb-2" />
                  <p className="text-lg font-medium">
                    Found {researchData.totalResults} relevant sources
                  </p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {Object.entries(researchData.bySource).map(
                      ([type, count]) => (
                        <Badge key={type} variant="secondary">
                          {sourceTypeLabels[type] || type}: {count}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {researchData.results.slice(0, 15).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-2 rounded border p-2 text-xs"
                    >
                      <Badge
                        variant="outline"
                        className="shrink-0 text-[10px]"
                      >
                        {sourceTypeLabels[r.sourceType] || r.sourceType}
                      </Badge>
                      <span className="line-clamp-1 flex-1">
                        {r.title}
                      </span>
                    </div>
                  ))}
                  {researchData.results.length > 15 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{researchData.results.length - 15} more sources
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No results found. Your personas will be generated from the
                  product context you provided.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Customize */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Period Tracker Users"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="personaCount">
                Number of Personas: {personaCount}
              </Label>
              <input
                id="personaCount"
                type="range"
                min={3}
                max={50}
                value={personaCount}
                onChange={(e) => setPersonaCount(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3</span>
                <span>50</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="includeSkeptics"
                type="checkbox"
                checked={includeSkeptics}
                onChange={(e) => setIncludeSkeptics(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeSkeptics" className="text-sm">
                Include skeptics & critics (recommended for honest feedback)
              </Label>
            </div>
            {researchData && researchData.totalResults > 0 && (
              <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground">
                <CheckCircle2 className="inline h-4 w-4 text-green-500 mr-1" />
                Personas will be grounded in {researchData.totalResults} real
                data sources
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={startGeneration} className="flex-1">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate {personaCount} Personas
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Generating */}
        {step === 4 && genProgress && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 font-medium">
                {genProgress.name
                  ? `Creating "${genProgress.name}"...`
                  : "Preparing..."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {genProgress.completed} of {genProgress.total} personas
              </p>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width: `${(genProgress.completed / genProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
