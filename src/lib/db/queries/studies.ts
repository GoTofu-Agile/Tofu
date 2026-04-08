import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { StudyType, StudyStatus, SessionStatus } from "@prisma/client";

// ─── Study CRUD ───

export type GetStudyOptions = {
  /**
   * When false, skips loading sessions (much faster for auth checks, guide gen, study page).
   * Default false — callers that need a session list should pass true.
   */
  includeSessions?: boolean;
  /** When sessions are included, cap rows (newest first). Default 250. */
  sessionLimit?: number;
};

export async function getStudiesForOrg(organizationId: string) {
  return prisma.study.findMany({
    where: { organizationId },
    include: {
      createdBy: { select: { name: true, email: true } },
      personaGroups: {
        include: {
          personaGroup: {
            select: { name: true, personaCount: true },
          },
        },
      },
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

const studyIncludeBase = {
  createdBy: { select: { name: true, email: true } },
  personaGroups: {
    include: {
      personaGroup: {
        include: {
          personas: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              archetype: true,
              occupation: true,
              age: true,
              gender: true,
            },
            orderBy: { name: "asc" },
          },
          _count: { select: { personas: true } },
        },
      },
    },
  },
} as const;

export async function getStudy(studyId: string, options: GetStudyOptions = {}) {
  const includeSessions = options.includeSessions === true;
  const sessionLimit = options.sessionLimit ?? 250;

  return prisma.study.findUnique({
    where: { id: studyId },
    include: {
      ...studyIncludeBase,
      ...(includeSessions
        ? {
            sessions: {
              include: {
                persona: {
                  select: { name: true, archetype: true },
                },
                _count: { select: { messages: true } },
              },
              orderBy: { createdAt: "desc" },
              take: sessionLimit,
            },
          }
        : {}),
    },
  });
}

/** Distinct persona ids that already have at least one session (for batch / pending counts). */
export async function getPersonaIdsWithSessionsForStudy(studyId: string) {
  const rows = await prisma.session.findMany({
    where: { studyId },
    select: { personaId: true },
    distinct: ["personaId"],
  });
  return rows.map((r) => r.personaId);
}

/** Aggregates for study workspace (accurate even when sessions are not loaded). */
export async function getStudySessionStats(studyId: string) {
  const [total, completed, agg] = await Promise.all([
    prisma.session.count({ where: { studyId } }),
    prisma.session.count({ where: { studyId, status: "COMPLETED" } }),
    prisma.session.aggregate({
      where: { studyId, status: "COMPLETED" },
      _avg: { durationMs: true },
    }),
  ]);
  return {
    total,
    completed,
    avgDurationMs: agg._avg.durationMs ?? 0,
  };
}

/**
 * One “best” session per persona: prefer COMPLETED, else newest.
 * Used for interview links / progress when we do not load full session lists.
 */
export async function getPersonaSessionMapForStudy(
  studyId: string
): Promise<Record<string, { sessionId: string; status: string }>> {
  const rows = await prisma.$queryRaw<
    { sessionId: string; personaId: string; status: string }[]
  >(Prisma.sql`
    SELECT DISTINCT ON (s."personaId")
      s.id AS "sessionId",
      s."personaId",
      s.status::text AS "status"
    FROM "Session" s
    WHERE s."studyId" = ${studyId}
    ORDER BY s."personaId",
      CASE WHEN s.status = 'COMPLETED'::"SessionStatus" THEN 0 ELSE 1 END,
      s."createdAt" DESC
  `);
  const map: Record<string, { sessionId: string; status: string }> = {};
  for (const r of rows) {
    map[r.personaId] = { sessionId: r.sessionId, status: r.status };
  }
  return map;
}

export async function createStudy(data: {
  organizationId: string;
  createdById: string;
  title: string;
  description?: string;
  studyType: StudyType;
  interviewGuide?: string;
  surveyQuestions?: unknown[];
  personaGroupIds: string[];
}) {
  const { personaGroupIds, surveyQuestions, ...studyData } = data;

  return prisma.study.create({
    data: {
      ...studyData,
      ...(surveyQuestions ? { surveyQuestions: surveyQuestions as never } : {}),
      status: "DRAFT",
      personaGroups: {
        create: personaGroupIds.map((pgId) => ({
          personaGroupId: pgId,
        })),
      },
    },
  });
}

export async function findOrCreateDraft(data: {
  organizationId: string;
  createdById: string;
}) {
  // Reuse an untouched draft from the last 24h to avoid orphaned studies
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.study.findFirst({
    where: {
      organizationId: data.organizationId,
      createdById: data.createdById,
      status: "DRAFT",
      title: "Untitled Study",
      interviewGuide: null,
      description: null,
      createdAt: { gte: cutoff },
      sessions: { none: {} },
      personaGroups: { none: {} },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) return existing;

  return prisma.study.create({
    data: {
      organizationId: data.organizationId,
      createdById: data.createdById,
      title: "Untitled Study",
      studyType: "INTERVIEW",
      status: "DRAFT",
    },
  });
}

export async function createDraftStudy(data: {
  organizationId: string;
  createdById: string;
}) {
  return findOrCreateDraft(data);
}

export async function updateStudy(
  studyId: string,
  data: {
    title?: string;
    description?: string;
    studyType?: StudyType;
    interviewGuide?: string;
  }
) {
  return prisma.study.update({
    where: { id: studyId },
    data,
  });
}

export async function addGroupToStudy(studyId: string, personaGroupId: string) {
  return prisma.studyPersonaGroup.create({
    data: { studyId, personaGroupId },
  });
}

export async function removeGroupFromStudy(studyId: string, personaGroupId: string) {
  return prisma.studyPersonaGroup.deleteMany({
    where: { studyId, personaGroupId },
  });
}

export async function updateStudyStatus(
  studyId: string,
  status: StudyStatus
) {
  return prisma.study.update({
    where: { id: studyId },
    data: { status },
  });
}

export async function deleteStudy(studyId: string) {
  return prisma.study.delete({ where: { id: studyId } });
}

// ─── Session CRUD ───

export async function getSession(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      persona: {
        include: { personality: true },
      },
      study: {
        select: {
          id: true,
          title: true,
          studyType: true,
          interviewGuide: true,
          organizationId: true,
        },
      },
      messages: {
        orderBy: { sequence: "asc" },
      },
    },
  });
}

export async function createSession(data: {
  studyId: string;
  personaId: string;
}) {
  return prisma.session.create({
    data: {
      studyId: data.studyId,
      personaId: data.personaId,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
}

export async function addMessage(data: {
  sessionId: string;
  role: "SYSTEM" | "INTERVIEWER" | "RESPONDENT";
  content: string;
  sequence: number;
}) {
  return prisma.sessionMessage.create({ data });
}

export async function getMessageCount(sessionId: string) {
  return prisma.sessionMessage.count({
    where: { sessionId },
  });
}

// ─── Analysis Reports ───

export async function getAnalysisReport(studyId: string) {
  return prisma.analysisReport.findFirst({
    where: { studyId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAnalysisReports(studyId: string, limit = 5) {
  return prisma.analysisReport.findMany({
    where: { studyId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function createAnalysisReport(data: {
  studyId: string;
  title: string;
  summary: string;
  keyFindings: Record<string, unknown>[] | unknown[];
  themes: Record<string, unknown>[] | unknown[];
  sentimentBreakdown: Record<string, unknown>;
  recommendations: Record<string, unknown>[] | unknown[];
}) {
  return prisma.analysisReport.create({
    data: {
      studyId: data.studyId,
      title: data.title,
      summary: data.summary,
      keyFindings: data.keyFindings as never,
      themes: data.themes as never,
      sentimentBreakdown: data.sentimentBreakdown as never,
      recommendations: data.recommendations as never,
    },
  });
}

// ─── Results Dashboard ───

export async function getStudyResults(studyId: string) {
  const [study, report, sessions] = await Promise.all([
    prisma.study.findUnique({
      where: { id: studyId },
      select: {
        id: true,
        title: true,
        description: true,
        studyType: true,
        status: true,
        interviewGuide: true,
        organizationId: true,
        researchObjectives: true,
      },
    }),
    prisma.analysisReport.findFirst({
      where: { studyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.session.findMany({
      where: { studyId, status: "COMPLETED" },
      select: {
        id: true,
        durationMs: true,
        persona: {
          select: { name: true, archetype: true, occupation: true, age: true },
        },
      },
    }),
  ]);

  if (!study) return null;

  const totalInterviews = sessions.length;
  const avgDurationMs =
    totalInterviews > 0
      ? sessions.reduce((sum, s) => sum + (s.durationMs || 0), 0) /
        totalInterviews
      : 0;

  return {
    study,
    report,
    metrics: {
      totalInterviews,
      avgDurationMs,
      personas: sessions.map((s) => s.persona),
    },
  };
}

export async function getStudyTranscripts(studyId: string) {
  return prisma.session.findMany({
    where: { studyId, status: "COMPLETED" },
    include: {
      persona: {
        select: { name: true, archetype: true, occupation: true, age: true },
      },
      messages: {
        where: { role: { not: "SYSTEM" } },
        orderBy: { sequence: "asc" },
        select: { role: true, content: true, sequence: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function completeSession(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { startedAt: true, studyId: true },
  });

  const durationMs = session?.startedAt
    ? Date.now() - session.startedAt.getTime()
    : null;

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      durationMs,
    },
  });

  // Update study completed count
  if (session?.studyId) {
    const completedCount = await prisma.session.count({
      where: { studyId: session.studyId, status: "COMPLETED" },
    });
    await prisma.study.update({
      where: { id: session.studyId },
      data: { completedCount },
    });
  }
}
