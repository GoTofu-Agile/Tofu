import { prisma } from "@/lib/db/prisma";
import type { Prisma, StudyType, StudyStatus, SessionStatus } from "@prisma/client";

// ─── Study CRUD ───

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

export async function getStudy(studyId: string) {
  return prisma.study.findUnique({
    where: { id: studyId },
    include: {
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
      sessions: {
        include: {
          persona: {
            select: { name: true, archetype: true },
          },
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
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

export async function updateStudyStatus(
  studyId: string,
  status: StudyStatus
) {
  return prisma.study.update({
    where: { id: studyId },
    data: { status },
  });
}

export async function updateStudy(studyId: string, data: Prisma.StudyUpdateInput) {
  return prisma.study.update({
    where: { id: studyId },
    data,
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
