import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getStudy, getAnalysisReport } from "@/lib/db/queries/studies";
import { Badge } from "@/components/ui/badge";
import { StudyPersonaList } from "@/components/studies/study-persona-list";
import { StudySessionList } from "@/components/studies/study-session-list";
import { BatchRunButton } from "@/components/studies/batch-run-button";
import { InsightsPanel } from "@/components/studies/insights-panel";
import {
  Download,
  GitCompareArrows,
  ChevronDown,
  ArrowLeft,
  BarChart3,
} from "lucide-react";

const statusColors: Record<string, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  ARCHIVED: "bg-muted text-muted-foreground",
};

const typeLabels: Record<string, string> = {
  INTERVIEW: "Interview",
  SURVEY: "Survey",
  FOCUS_GROUP: "Focus Group",
  USABILITY_TEST: "Usability Test",
  CARD_SORT: "Card Sort",
};

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const { organizations } = await requireAuthWithOrgs();
  const activeOrgId = await getActiveOrgId(organizations);

  const [study, analysisReport] = await Promise.all([
    getStudy(studyId),
    getAnalysisReport(studyId),
  ]);
  if (!study || study.organizationId !== activeOrgId) {
    notFound();
  }

  // Flatten all personas from assigned groups
  const allPersonas = study.personaGroups.flatMap((pg) =>
    pg.personaGroup.personas.map((p) => ({
      ...p,
      groupName: pg.personaGroup.name,
    }))
  );

  // Build persona → session mapping (personaId → { sessionId, status })
  const personaSessionMap: Record<
    string,
    { sessionId: string; status: string }
  > = {};
  for (const session of study.sessions) {
    // Keep the latest session per persona
    if (
      !personaSessionMap[session.personaId] ||
      session.status === "COMPLETED"
    ) {
      personaSessionMap[session.personaId] = {
        sessionId: session.id,
        status: session.status,
      };
    }
  }

  const pendingCount = allPersonas.filter(
    (p) => !personaSessionMap[p.id]
  ).length;
  const completedCount = study.sessions.filter(
    (s) => s.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/studies"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3 w-3" />
          Studies
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            {study.title}
          </h2>
          <Badge
            variant="secondary"
            className={statusColors[study.status]}
          >
            {study.status.toLowerCase()}
          </Badge>
          <Badge variant="outline">{typeLabels[study.studyType]}</Badge>
        </div>
        {study.description && (
          <p className="mt-1 text-muted-foreground">{study.description}</p>
        )}
      </div>

      {/* View Results Button — prominent when report exists */}
      {analysisReport && (
        <Link
          href={`/studies/${study.id}/results`}
          className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 transition-colors hover:bg-primary/10"
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">View Results Dashboard</p>
              <p className="text-xs text-muted-foreground">
                Themes, quotes, and recommendations from {completedCount} interviews
              </p>
            </div>
          </div>
          <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
        </Link>
      )}

      {/* Interview Guide — collapsible */}
      {study.interviewGuide && (
        <details className="group rounded-lg border">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
            Interview Guide
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t px-4 py-3">
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {study.interviewGuide}
            </p>
          </div>
        </details>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        {allPersonas.length > 0 && (
          <BatchRunButton
            studyId={study.id}
            pendingCount={pendingCount}
            totalCount={allPersonas.length}
            completedCount={completedCount}
          />
        )}
        {completedCount > 0 && (
          <div className="flex items-center gap-2">
            {completedCount >= 2 && (
              <Link
                href={`/studies/${study.id}/compare`}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                <GitCompareArrows className="h-3 w-3" />
                Compare
              </Link>
            )}
            <Link
              href={`/api/studies/${study.id}/export`}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </Link>
          </div>
        )}
      </div>

      {/* Personas with session status */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium">
          Personas ({allPersonas.length})
        </h3>
        <p className="text-sm text-muted-foreground">
          Click a persona to start or continue an interview, or use &quot;Run
          All&quot; for automatic batch interviews.
        </p>
        <StudyPersonaList
          personas={allPersonas}
          studyId={study.id}
          personaSessionMap={personaSessionMap}
        />
      </div>

      {/* Sessions */}
      {study.sessions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium">
            Sessions ({study.sessions.length})
          </h3>
          <StudySessionList sessions={study.sessions} studyId={study.id} />
        </div>
      )}

      {/* Analysis & Insights */}
      <InsightsPanel
        studyId={study.id}
        report={analysisReport}
        hasCompletedSessions={completedCount > 0}
      />
    </div>
  );
}
