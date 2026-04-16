import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthWithActiveOrg } from "@/lib/auth";
import {
  getStudy,
  getAnalysisReport,
  getAnalysisReports,
  getStudySessionStats,
  getPersonaSessionMapForStudy,
} from "@/lib/db/queries/studies";
import { getPersonaGroupsForOrg } from "@/lib/db/queries/personas";
import { getOrgProductContext } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";
import { ArrowLeft } from "lucide-react";
import { StudyFlow } from "@/components/studies/study-flow";
import type { FlowStep } from "@/components/studies/study-flow-stepper";
import { SetupContextCallout } from "@/components/onboarding/setup-context-callout";

function computeInitialStep(
  study: { interviewGuide: string | null; status: string },
  analysisReport: unknown,
  sessionStats: { total: number; completed: number },
): FlowStep {
  // Fresh DRAFT with no sessions = always start at setup
  if (study.status === "DRAFT" && sessionStats.total === 0) return "setup";
  if (analysisReport) return "insights";
  if (sessionStats.completed > 0) return "insights";
  if (sessionStats.total > 0 || study.status === "ACTIVE") return "interviews";
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

  const [
    study,
    analysisReport,
    analysisReports,
    availableGroups,
    orgContext,
    sessionStats,
    personaSessionMap,
    orgStudyCount,
    orgPersonaGroupCount,
  ] = await Promise.all([
    getStudy(studyId),
    getAnalysisReport(studyId),
    getAnalysisReports(studyId),
    getPersonaGroupsForOrg(activeOrgId),
    getOrgProductContext(activeOrgId),
    getStudySessionStats(studyId),
    getPersonaSessionMapForStudy(studyId),
    prisma.study.count({ where: { organizationId: activeOrgId } }),
    prisma.personaGroup.count({ where: { organizationId: activeOrgId } }),
  ]);
  if (!study || study.organizationId !== activeOrgId) {
    notFound();
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
  const completedCount = sessionStats.completed;

  const selectedGroupIds = study.personaGroups.map((pg) => pg.personaGroup.id);
  const initialStep = computeInitialStep(study, analysisReport, sessionStats);

  const avgDurationMs = sessionStats.avgDurationMs;

  const productContext = orgContext?.setupCompleted
    ? {
        productName: orgContext.productName,
        productDescription: orgContext.productDescription,
        targetAudience: orgContext.targetAudience,
        industry: orgContext.industry,
      }
    : null;

  const contextNudgeOptional =
    orgPersonaGroupCount > 0 || orgStudyCount > 1;

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

      {!orgContext?.setupCompleted && study.status === "DRAFT" ? (
        <SetupContextCallout
          orgId={activeOrgId}
          variant={contextNudgeOptional ? "optional" : "primary"}
        />
      ) : null}

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
