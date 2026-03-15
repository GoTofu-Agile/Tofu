import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthWithOrgs, getActiveOrgId } from "@/lib/auth";
import { getStudy, getAnalysisReport } from "@/lib/db/queries/studies";
import { Badge } from "@/components/ui/badge";
import { StudyPersonaList } from "@/components/studies/study-persona-list";
import { StudySessionList } from "@/components/studies/study-session-list";
import { BatchRunButton } from "@/components/studies/batch-run-button";
import { InsightsPanel } from "@/components/studies/insights-panel";
import { Download, GitCompareArrows } from "lucide-react";

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

  // Track which personas already have sessions
  const personasWithSessions = new Set(
    study.sessions.map((s) => s.personaId)
  );

  const pendingCount = allPersonas.filter(
    (p) => !personasWithSessions.has(p.id)
  ).length;
  const completedCount = study.sessions.filter(
    (s) => s.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
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
        {study.interviewGuide && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground mb-2">
              Interview Guide
            </p>
            <p className="text-sm whitespace-pre-wrap">{study.interviewGuide}</p>
          </div>
        )}
      </div>

      {/* Batch Interview Button */}
      {allPersonas.length > 0 && (
        <BatchRunButton
          studyId={study.id}
          pendingCount={pendingCount}
          totalCount={allPersonas.length}
          completedCount={completedCount}
        />
      )}

      {/* Sessions + Export */}
      {study.sessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Sessions ({study.sessions.length})
            </h3>
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
          <StudySessionList sessions={study.sessions} studyId={study.id} />
        </div>
      )}

      {/* Analysis & Insights */}
      <InsightsPanel
        studyId={study.id}
        report={analysisReport}
        hasCompletedSessions={completedCount > 0}
      />

      {/* Personas to interview */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium">
          Personas ({allPersonas.length})
        </h3>
        <p className="text-sm text-muted-foreground">
          Click a persona to start a manual interview, or use &quot;Run All&quot; above for automatic batch interviews.
        </p>
        <StudyPersonaList
          personas={allPersonas}
          studyId={study.id}
          personasWithSessions={Array.from(personasWithSessions)}
        />
      </div>
    </div>
  );
}
