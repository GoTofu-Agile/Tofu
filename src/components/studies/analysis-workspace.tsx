"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Download,
  TrendingUp,
  Quote,
  Lightbulb,
  Send,
} from "lucide-react";
import { triggerInsights } from "@/app/(dashboard)/studies/actions";
import Link from "next/link";

interface Theme {
  name: string;
  description: string;
  frequency: number;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
}

interface KeyQuote {
  quote: string;
  personaName: string;
  context: string;
  theme: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  supportingEvidence: string;
}

interface SentimentBreakdown {
  overall: string;
  positivePercent: number;
  negativePercent: number;
  neutralPercent: number;
}

const ANALYSIS_OPTIONS = [
  { id: "pain_points", label: "Pain Points", description: "Identify key user frustrations" },
  { id: "sentiment", label: "Sentiment", description: "Analyze overall sentiment" },
  { id: "feature_priorities", label: "Feature Priorities", description: "Rank feature requests" },
  { id: "behavior_patterns", label: "Behavior Patterns", description: "Discover common behaviors" },
  { id: "competitive_insights", label: "Competitive Insights", description: "Compare to alternatives" },
];

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

const sentimentColors: Record<string, string> = {
  positive: "text-green-600 bg-green-50 border-green-200",
  negative: "text-red-600 bg-red-50 border-red-200",
  neutral: "text-gray-600 bg-gray-50 border-gray-200",
  mixed: "text-amber-600 bg-amber-50 border-amber-200",
};

interface AnalysisWorkspaceProps {
  studyId: string;
  completedCount: number;
  totalCount: number;
  hasCompletedSessions: boolean;
  analysisReport: {
    summary: string | null;
    themes: unknown;
    keyFindings: unknown;
    sentimentBreakdown: unknown;
    recommendations: unknown;
    createdAt: Date;
  } | null;
}

export function AnalysisWorkspace({
  studyId,
  completedCount,
  totalCount,
  hasCompletedSessions,
  analysisReport,
}: AnalysisWorkspaceProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(["pain_points", "sentiment"]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  function toggleOption(id: string) {
    setSelectedOptions((prev) =>
      prev.includes(id) ? prev.filter((o) => o !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    const result = await triggerInsights(studyId);
    if (result.error) {
      toast.error(result.error);
      setGenerating(false);
      return;
    }
    toast.success("Generating analysis... This may take a moment.");
    // Poll for completion (simple timeout for now)
    setTimeout(() => {
      setGenerating(false);
      window.location.reload();
    }, 8000);
  }

  // No completed sessions yet
  if (!hasCompletedSessions) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/30" />
        <h3 className="mt-3 text-sm font-medium">No interviews completed yet</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Complete some interviews first, then come back to analyze the results.
        </p>
      </div>
    );
  }

  // Analysis Planning (no report yet)
  if (!analysisReport) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold">What do you want to learn from your interviews?</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Select analysis types or write a custom question. Our AI will focus on what matters to you.
          </p>
        </div>

        {/* Quick Analysis Options */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Quick analysis</label>
          <div className="flex flex-wrap gap-2">
            {ANALYSIS_OPTIONS.map((opt) => {
              const isSelected = selectedOptions.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => toggleOption(opt.id)}
                  className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                    isSelected
                      ? "border-foreground/30 bg-stone-50 font-medium"
                      : "border-border hover:border-foreground/20"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Question */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Custom question (optional)</label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="e.g. Why do enterprise customers churn after 90 days?"
            rows={2}
            className="w-full resize-none rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
          />
        </div>

        {/* Status + Generate */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {completedCount} of {totalCount} interviews available for analysis
          </p>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Analysis
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Analysis Results
  const themes = (analysisReport.themes as Theme[]) || [];
  const quotes = (analysisReport.keyFindings as KeyQuote[]) || [];
  const sentiment = analysisReport.sentimentBreakdown as SentimentBreakdown | null;
  const recommendations = (analysisReport.recommendations as Recommendation[]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Analysis Results</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3 w-3" />
            )}
            Regenerate
          </Button>
          <a
            href={`/api/studies/${studyId}/export`}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-3 w-3" />
            CSV
          </a>
        </div>
      </div>

      {/* Summary */}
      {analysisReport.summary && (
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm leading-relaxed">{analysisReport.summary}</p>
        </div>
      )}

      {/* Sentiment */}
      {sentiment && (
        <div className="flex gap-3">
          <div className="flex-1 rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {sentiment.positivePercent}%
            </div>
            <div className="text-xs text-muted-foreground">Positive</div>
          </div>
          <div className="flex-1 rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {sentiment.neutralPercent}%
            </div>
            <div className="text-xs text-muted-foreground">Neutral</div>
          </div>
          <div className="flex-1 rounded-lg border p-3 text-center">
            <div className="text-2xl font-bold text-red-600">
              {sentiment.negativePercent}%
            </div>
            <div className="text-xs text-muted-foreground">Negative</div>
          </div>
        </div>
      )}

      {/* Themes */}
      {themes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Key Themes</h4>
          </div>
          <div className="space-y-2">
            {themes.map((theme, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{theme.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${sentimentColors[theme.sentiment] || ""}`}
                  >
                    {theme.sentiment}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {theme.frequency} mentions
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{theme.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Quotes */}
      {quotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Quote className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Key Quotes</h4>
          </div>
          <div className="space-y-2">
            {quotes.slice(0, 6).map((q, i) => (
              <div key={i} className="rounded-lg border-l-2 border-primary/30 bg-muted/10 p-3">
                <p className="text-sm italic">&ldquo;{q.quote}&rdquo;</p>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium">{q.personaName}</span>
                  <span>&middot;</span>
                  <span>{q.context}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Recommendations</h4>
          </div>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{rec.title}</span>
                  <Badge className={`text-[10px] ${priorityColors[rec.priority]}`}>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{rec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Question */}
      <div className="rounded-xl border p-4 space-y-3">
        <label className="text-xs font-medium text-muted-foreground">
          Ask a follow-up question
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="What specific onboarding steps cause the most friction?"
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:border-foreground/30"
          />
          <Button size="sm" variant="outline" disabled>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Follow-up questions coming soon
        </p>
      </div>
    </div>
  );
}
