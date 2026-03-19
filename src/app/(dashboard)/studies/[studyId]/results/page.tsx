import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getStudyResults } from "@/lib/db/queries/studies";
import { Badge } from "@/components/ui/badge";
import { ResultsSummary } from "@/components/studies/results-summary";
import { ResultsThemes } from "@/components/studies/results-themes";
import { ResultsQuotes } from "@/components/studies/results-quotes";
import { ResultsRecommendations } from "@/components/studies/results-recommendations";
import { RegenerateButton } from "@/components/studies/regenerate-button";
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

export default async function StudyResultsPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const data = await getStudyResults(studyId);
  if (!data || data.study.organizationId !== activeOrgId) {
    notFound();
  }

  const { study, report, metrics } = data;

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
        <div className="rounded-lg border border-dashed p-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <h3 className="mt-3 font-medium">No insights yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {metrics.totalInterviews > 0
              ? "Generate AI-powered insights from your interview transcripts."
              : "Complete some interviews first, then generate insights."}
          </p>
          {metrics.totalInterviews > 0 && (
            <RegenerateButton studyId={studyId} label="Generate Insights" />
          )}
        </div>
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href={`/studies/${studyId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Study
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {study.title} — Results
            </h2>
            {study.researchObjectives && (
              <p className="mt-1 text-sm text-muted-foreground">
                {typeof study.researchObjectives === "string"
                  ? study.researchObjectives
                  : JSON.stringify(study.researchObjectives)}
              </p>
            )}
          </div>
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
