import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getStudyResults } from "@/lib/db/queries/studies";
import { Badge } from "@/components/ui/badge";
import { ResultsSummary } from "@/components/studies/results-summary";
import { ResultsThemes } from "@/components/studies/results-themes";
import { ResultsQuotes } from "@/components/studies/results-quotes";
import { ResultsRecommendations } from "@/components/studies/results-recommendations";
import { RegenerateButton } from "@/components/studies/regenerate-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeft, Download, Sparkles } from "lucide-react";

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

function objectiveToText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const lines = value
      .map((v) => (typeof v === "string" ? v : ""))
      .filter(Boolean);
    return lines.length > 0 ? lines.join(" • ") : null;
  }
  if (typeof value === "object") {
    const raw = Object.values(value as Record<string, unknown>)
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    return raw.length > 0 ? raw.join(" • ") : null;
  }
  return null;
}

export default async function StudyResultsPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const { activeOrgId } = await requireAuthWithActiveOrg();

  const data = await getStudyResults(studyId);
  if (!data || data.study.organizationId !== activeOrgId) {
    notFound();
  }

  const { study, report, metrics } = data;
  const objectiveText = objectiveToText(study.researchObjectives);

  // If no report yet, show generate prompt
  if (!report) {
    return (
      <div className="space-y-8">
        <div>
          <Link
            href={`/studies/${studyId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Study
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">
            {study.title} — Results
          </h2>
        </div>
        <EmptyState
          icon={Sparkles}
          title="No insights yet"
          description={
            metrics.totalInterviews > 0
              ? "Generate AI-powered insights from your interview transcripts."
              : "Complete some interviews first, then generate insights."
          }
        >
          {metrics.totalInterviews > 0 && (
            <RegenerateButton studyId={studyId} label="Generate Insights" />
          )}
        </EmptyState>
      </div>
    );
  }

  const themes = (report.themes as unknown as Theme[]) || [];
  const quotes = (report.keyFindings as unknown as KeyQuote[]) || [];
  const sentiment = report.sentimentBreakdown as unknown as SentimentBreakdown | null;
  const recommendations = (report.recommendations as unknown as Recommendation[]) || [];

  // Extract unique persona names and theme names for filters
  const personaNames = [...new Set(quotes.map((q) => q.personaName))];
  const themeNames = themes.map((t) => t.name);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/studies/${studyId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Study
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight">
              {study.title} — Results
            </h2>
            {objectiveText && (
              <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                {objectiveText}
              </p>
            )}
          </div>
          <Link
            href={`/api/studies/${studyId}/export`}
            className="inline-flex items-center gap-1.5 self-start rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-3 w-3" />
            Export CSV
          </Link>
        </div>
      </div>

      {/* Executive Summary + Metrics */}
      <ResultsSummary
        summary={report.summary || ""}
        totalInterviews={metrics.totalInterviews}
        avgDurationMs={metrics.avgDurationMs}
        sentimentBreakdown={sentiment}
      />

      {/* Themes (interactive) */}
      {themes.length > 0 && (
        <ResultsThemes themes={themes} quotes={quotes} />
      )}

      {/* Key Quotes (filterable) */}
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

      {/* Regenerate */}
      <div className="border-t pt-6 flex justify-end">
        <RegenerateButton studyId={studyId} label="Regenerate Insights" />
      </div>
    </div>
  );
}
