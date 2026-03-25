import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthWithActiveOrg } from "@/lib/auth";
import { getStudy, getAnalysisReport, getAnalysisReports } from "@/lib/db/queries/studies";
import { getPersonaGroupsForOrg } from "@/lib/db/queries/personas";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { ArrowLeft } from "lucide-react";
import { StudyFlow } from "@/components/studies/study-flow";
import type { FlowStep } from "@/components/studies/study-flow-stepper";

function computeInitialStep(
  study: { interviewGuide: string | null; status: string },
  analysisReport: unknown,
  sessions: Array<{ status: string }>,
): FlowStep {
  // Fresh DRAFT with no sessions = always start at setup
  if (study.status === "DRAFT" && sessions.length === 0) return "setup";
  if (analysisReport) return "insights";
  if (sessions.some((s) => s.status === "COMPLETED")) return "insights";
  if (sessions.length > 0 || study.status === "ACTIVE") return "interviews";
  if (study.interviewGuide?.trim()) return "guide";
  return "setup";
}

export default async function StudyDetailPage({
  params,
}: {
  params: Promise<{ studyId: string }>;
}) {
  const { studyId } = await params;
  const { activeOrgId } = await requireAuthWithActiveOrg();

  const [study, analysisReport, analysisReports, availableGroups, orgContext] = await Promise.all([
    getStudy(studyId),
    getAnalysisReport(studyId),
    getAnalysisReports(studyId),
    getPersonaGroupsForOrg(activeOrgId),
    getOrgProductContext(activeOrgId),
  ]);
  if (!study || study.organizationId !== activeOrgId) {
    notFound();
  }

  // Build persona -> session mapping
  const personaSessionMap: Record<
    string,
    { sessionId: string; status: string }
  > = {};
  for (const session of study.sessions) {
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

  // Group personas by their persona group
  const personasByGroup = study.personaGroups.map((pg) => ({
    groupId: pg.personaGroup.id,
    groupName: pg.personaGroup.name,
    personas: pg.personaGroup.personas.map((p) => ({
      ...p,
      groupName: pg.personaGroup.name,
    })),
  }));

  const allPersonas = personasByGroup.flatMap((g) => g.personas);
  const pendingCount = allPersonas.filter(
    (p) => !personaSessionMap[p.id]
  ).length;
  const completedCount = study.sessions.filter(
    (s) => s.status === "COMPLETED"
  ).length;

  const selectedGroupIds = study.personaGroups.map((pg) => pg.personaGroup.id);
  const initialStep = computeInitialStep(study, analysisReport, study.sessions);

  // Calculate avg duration for results
  const completedSessions = study.sessions.filter((s) => s.status === "COMPLETED");
  const avgDurationMs =
    completedSessions.length > 0
      ? completedSessions.reduce((sum, s) => sum + (s.durationMs || 0), 0) /
        completedSessions.length
      : 0;

  const productContext = orgContext?.setupCompleted
    ? {
        productName: orgContext.productName,
        productDescription: orgContext.productDescription,
        targetAudience: orgContext.targetAudience,
        industry: orgContext.industry,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Link
        href="/studies"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Studies
      </Link>

      {/* Step-by-Step Flow */}
      <StudyFlow
        initialStep={initialStep}
        studyId={study.id}
        studyTitle={study.title}
        studyType={study.studyType}
        interviewGuide={study.interviewGuide}
        description={study.description}
        personasByGroup={personasByGroup}
        personaSessionMap={personaSessionMap}
        pendingCount={pendingCount}
        completedCount={completedCount}
        totalCount={allPersonas.length}
        analysisReport={analysisReport}
        analysisReports={analysisReports}
        availableGroups={availableGroups}
        selectedGroupIds={selectedGroupIds}
        orgContext={productContext}
        avgDurationMs={avgDurationMs}
      />
    </div>
  );
}
