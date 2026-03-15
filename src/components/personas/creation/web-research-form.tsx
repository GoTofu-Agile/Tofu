"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Search,
  Loader2,
  Globe,
} from "lucide-react";
import {
  RESEARCH_GOALS,
  TARGET_AUDIENCES,
} from "@/lib/research/build-queries";

interface ResearchResultItem {
  id: string;
  title: string;
  sourceType: string;
  sourceDomain: string;
  sourceUrl: string;
}

interface WebResearchFormProps {
  groupId: string | null;
  onCreateGroup: (data: {
    productName: string;
    oneLiner: string;
    targetAudience: string;
  }) => Promise<string | null>;
  onResearchComplete: (data: {
    totalResults: number;
    domainContext: string;
    groupName: string;
  }) => void;
  onBack: () => void;
  initialProductName?: string;
  initialOneLiner?: string;
  initialTargetAudience?: string;
  initialCompetitors?: string;
}

const SOURCE_LABELS: Record<string, string> = {
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
};

export function WebResearchForm({
  groupId: initialGroupId,
  onCreateGroup,
  onResearchComplete,
  onBack,
  initialProductName,
  initialOneLiner,
  initialTargetAudience,
  initialCompetitors,
}: WebResearchFormProps) {
  const [productName, setProductName] = useState(initialProductName || "");
  const [oneLiner, setOneLiner] = useState(initialOneLiner || "");
  const [targetAudience, setTargetAudience] = useState(initialTargetAudience || "");
  const [competitors, setCompetitors] = useState(initialCompetitors || "");
  const [researchGoals, setResearchGoals] = useState<string[]>(["pain_points"]);

  const [researching, setResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState("");
  const [researchDone, setResearchDone] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [bySource, setBySource] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ResearchResultItem[]>([]);

  function toggleGoal(goal: string) {
    setResearchGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }

  async function startResearch() {
    if (!productName || !oneLiner || !targetAudience) return;

    setResearching(true);
    setResearchProgress("Creating group...");

    let gId = initialGroupId;
    if (!gId) {
      gId = await onCreateGroup({ productName, oneLiner, targetAudience });
      if (!gId) {
        setResearching(false);
        return;
      }
    }

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
          groupId: gId,
          productInfo: {
            productName,
            oneLiner,
            targetAudience,
            competitors: competitorList,
            researchGoals,
          },
        }),
      });

      if (!response.ok) throw new Error("Research failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      const allResults: ResearchResultItem[] = [];
      const sourceCounts: Record<string, number> = {};

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
                sourceCounts[r.sourceType] =
                  (sourceCounts[r.sourceType] || 0) + 1;
              }
              setResults([...allResults]);
              setBySource({ ...sourceCounts });
            } else if (event.type === "done") {
              setTotalResults(event.totalResults);
            }
          } catch {
            // skip malformed
          }
        }
      }

      setResearchDone(true);
    } catch {
      // Research failed — we can still generate without it
      setResearchDone(true);
    } finally {
      setResearching(false);
    }
  }

  function handleContinue() {
    const domainContext = `Product: ${productName}\n${oneLiner}\nTarget audience: ${targetAudience}${competitors ? `\nCompetitors: ${competitors}` : ""}`;
    const groupName = `${productName} — ${targetAudience}`;
    onResearchComplete({ totalResults, domainContext, groupName });
  }

  return (
    <div className="space-y-5">
      {/* Form fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="productName">
            Product Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. Flo, Clue, Keleya"
            disabled={researching || researchDone}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetAudience">
            Target Audience <span className="text-destructive">*</span>
          </Label>
          <select
            id="targetAudience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            disabled={researching || researchDone}
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="oneLiner">
          What does it do? <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="oneLiner"
          value={oneLiner}
          onChange={(e) => setOneLiner(e.target.value)}
          placeholder="e.g. Period tracking app that helps women understand their cycle and fertility"
          rows={2}
          disabled={researching || researchDone}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="competitors">Competitors (optional)</Label>
        <Input
          id="competitors"
          value={competitors}
          onChange={(e) => setCompetitors(e.target.value)}
          placeholder="e.g. Flo, Clue, Natural Cycles"
          disabled={researching || researchDone}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated. We&apos;ll search for user feedback about these.
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
              disabled={researching || researchDone}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                researchGoals.includes(goal.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30"
              } disabled:opacity-50`}
            >
              {goal.label}
            </button>
          ))}
        </div>
      </div>

      {/* Research results (inline, appears after research) */}
      {researchDone && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {totalResults > 0
                ? `Found ${totalResults} relevant sources`
                : "No sources found — personas will use your description"}
            </span>
          </div>
          {Object.keys(bySource).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(bySource).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="text-xs">
                  {SOURCE_LABELS[type] || type}: {count}
                </Badge>
              ))}
            </div>
          )}
          {results.length > 0 && (
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {results.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="flex items-start gap-2 text-xs text-muted-foreground"
                >
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {SOURCE_LABELS[r.sourceType] || r.sourceType}
                  </Badge>
                  <span className="line-clamp-1">{r.title}</span>
                </div>
              ))}
              {results.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{results.length - 10} more
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={researching}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {!researchDone ? (
          <Button
            onClick={startResearch}
            disabled={
              researching || !productName || !oneLiner || !targetAudience
            }
            className="flex-1"
          >
            {researching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {researchProgress}
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Research
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleContinue} className="flex-1">
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
