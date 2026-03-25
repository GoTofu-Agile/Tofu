"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Quote,
  TrendingUp,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { triggerInsights } from "@/app/(dashboard)/studies/actions";

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

interface InsightsPanelProps {
  studyId: string;
  report: {
    summary: string | null;
    themes: unknown;
    keyFindings: unknown;
    sentimentBreakdown: unknown;
    recommendations: unknown;
    createdAt: Date;
  } | null;
  hasCompletedSessions: boolean;
}

const sentimentColors: Record<string, string> = {
  positive: "text-green-600 bg-green-50 border-green-200",
  negative: "text-red-600 bg-red-50 border-red-200",
  neutral: "text-gray-600 bg-gray-50 border-gray-200",
  mixed: "text-amber-600 bg-amber-50 border-amber-200",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-blue-100 text-blue-700",
};

export function InsightsPanel({
  studyId,
  report,
  hasCompletedSessions,
}: InsightsPanelProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    setGenerating(true);
    const result = await triggerInsights(studyId);
    if (result.error) {
      toast.error(result.error);
      setGenerating(false);
      return;
    }
    toast.success("Generating insights in the background. Refresh in a moment.");
    setTimeout(() => {
      router.refresh();
      setGenerating(false);
    }, 5000);
  }

  if (!report && !hasCompletedSessions) return null;

  if (!report) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <h3 className="mt-3 font-medium">No insights yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate AI-powered insights from your interview transcripts.
        </p>
        <Button
          className="mt-4"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
      </div>
    );
  }

  const themes = (report.themes as Theme[]) || [];
  const quotes = (report.keyFindings as KeyQuote[]) || [];
  const sentiment = report.sentimentBreakdown as SentimentBreakdown | null;
  const recommendations = (report.recommendations as Recommendation[]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Analysis & Insights</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-3 w-3" />
          )}
          Regenerate
        </Button>
      </div>

      {/* Summary */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="text-sm leading-relaxed">{report.summary}</p>
      </div>

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
            <h4 className="text-sm font-medium">Themes</h4>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {theme.description}
                </p>
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
                  <span>·</span>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  {rec.description}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70 italic">
                  Evidence: {rec.supportingEvidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
