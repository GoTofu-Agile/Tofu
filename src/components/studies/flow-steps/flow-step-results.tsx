"use client";

import Link from "next/link";
import { Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResultsSummary } from "@/components/studies/results-summary";
import { ResultsThemes } from "@/components/studies/results-themes";
import { ResultsQuotes } from "@/components/studies/results-quotes";
import { ResultsRecommendations } from "@/components/studies/results-recommendations";
import { RegenerateButton } from "@/components/studies/regenerate-button";

interface Theme {
  name: string;
  description: string;
  frequency: number;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  personaNames?: string[];
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

interface FlowStepResultsProps {
  studyId: string;
  report: {
    summary: string | null;
    themes: unknown;
    keyFindings: unknown;
    sentimentBreakdown: unknown;
    recommendations: unknown;
    createdAt: Date;
  };
  totalInterviews: number;
  avgDurationMs: number;
}

export function FlowStepResults({
  studyId,
  report,
  totalInterviews,
  avgDurationMs,
}: FlowStepResultsProps) {
  const themes = (report.themes as Theme[]) || [];
  const quotes = (report.keyFindings as KeyQuote[]) || [];
  const sentiment = report.sentimentBreakdown as SentimentBreakdown | null;
  const recommendations = (report.recommendations as Recommendation[]) || [];

  const personaNames = [...new Set(quotes.map((q) => q.personaName))];
  const themeNames = themes.map((t) => t.name);

  return (
    <div className="space-y-8">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Results</h3>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/studies/${studyId}/export`}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-3 w-3" />
            Export CSV
          </Link>
        </div>
      </div>

      {/* Executive Summary + Metrics */}
      <ResultsSummary
        summary={report.summary || ""}
        totalInterviews={totalInterviews}
        avgDurationMs={avgDurationMs}
        sentimentBreakdown={sentiment}
      />

      {/* Themes */}
      {themes.length > 0 && (
        <ResultsThemes themes={themes} quotes={quotes} />
      )}

      {/* Key Quotes */}
      {quotes.length > 0 && (
        <ResultsQuotes
          quotes={quotes}
          themes={themeNames}
          personaNames={personaNames}
        />
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <ResultsRecommendations recommendations={recommendations} />
      )}

      {/* Compare Transcripts */}
      {totalInterviews >= 2 && (
        <Link
          href={`/studies/${studyId}/compare`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Compare transcripts side-by-side
        </Link>
      )}

      {/* Follow-up Question (Coming Soon) */}
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

      {/* Regenerate */}
      <div className="border-t pt-6 flex justify-end">
        <RegenerateButton studyId={studyId} label="Regenerate Insights" />
      </div>
    </div>
  );
}
