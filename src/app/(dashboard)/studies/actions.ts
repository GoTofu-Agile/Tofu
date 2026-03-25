"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getUserRole } from "@/lib/db/queries/organizations";
import {
  createStudy,
  createSession,
  updateStudyStatus,
  deleteStudy,
  getStudy,
  completeSession,
  updateStudy,
} from "@/lib/db/queries/studies";
import { prisma } from "@/lib/db/prisma";
import type { StudyType } from "@prisma/client";

async function getActiveOrg() {
  const user = await requireAuth();
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) throw new Error("No active organization");

  const role = await getUserRole(activeOrgId, user.id);
  if (!role) throw new Error("Not a member of this organization");

  return { user, activeOrgId, role };
}

export async function createNewStudy(data: {
  title: string;
  description?: string;
  studyType: StudyType;
  interviewGuide?: string;
  surveyQuestions?: unknown[];
  personaGroupIds: string[];
}) {
  const { user, activeOrgId } = await getActiveOrg();

  if (!data.title || !data.studyType || data.personaGroupIds.length === 0) {
    return { error: "Title, study type, and at least one persona group are required" };
  }

  const study = await createStudy({
    organizationId: activeOrgId,
    createdById: user.id,
    title: data.title,
    description: data.description,
    studyType: data.studyType,
    interviewGuide: data.interviewGuide,
    surveyQuestions: data.surveyQuestions,
    personaGroupIds: data.personaGroupIds,
  });

  revalidatePath("/studies");
  return { success: true, studyId: study.id };
}

export async function startStudy(studyId: string) {
  await getActiveOrg();
  await updateStudyStatus(studyId, "ACTIVE");
  revalidatePath(`/studies/${studyId}`);
  return { success: true };
}

export async function startSession(studyId: string, personaId: string) {
  const { activeOrgId } = await getActiveOrg();

  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }

  // Auto-activate if still draft
  if (study.status === "DRAFT") {
    await updateStudyStatus(studyId, "ACTIVE");
  }

  const session = await createSession({ studyId, personaId });

  revalidatePath(`/studies/${studyId}`);
  return { success: true, sessionId: session.id };
}

export async function endSession(sessionId: string) {
  await getActiveOrg();
  await completeSession(sessionId);
  revalidatePath("/studies");
  return { success: true };
}

export async function updateStudyTitle(studyId: string, title: string) {
  const { activeOrgId, role } = await getActiveOrg();
  if (role === "VIEWER") {
    return { error: "Insufficient permissions" };
  }
  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }
  const trimmed = title.trim();
  if (!trimmed) {
    return { error: "Title is required" };
  }
  await updateStudy(studyId, { title: trimmed });
  revalidatePath(`/studies/${studyId}`);
  return { success: true };
}

export async function updateStudyType(studyId: string, studyType: StudyType) {
  const { activeOrgId, role } = await getActiveOrg();
  if (role === "VIEWER") {
    return { error: "Insufficient permissions" };
  }
  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }
  await updateStudy(studyId, { studyType });
  revalidatePath(`/studies/${studyId}`);
  return { success: true };
}

export async function updateStudyDescription(studyId: string, description: string) {
  const { activeOrgId, role } = await getActiveOrg();
  if (role === "VIEWER") {
    return { error: "Insufficient permissions" };
  }
  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }
  await updateStudy(studyId, { description: description.trim() || null });
  revalidatePath(`/studies/${studyId}`);
  return { success: true };
}

export async function updateStudyGuide(studyId: string, interviewGuide: string) {
  const { activeOrgId, role } = await getActiveOrg();
  if (role === "VIEWER") {
    return { error: "Insufficient permissions" };
  }
  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }
  await updateStudy(studyId, { interviewGuide });
  revalidatePath(`/studies/${studyId}`);
  return { success: true };
}

export async function toggleStudyGroup(
  studyId: string,
  groupId: string,
  selected: boolean
) {
  const { activeOrgId, role } = await getActiveOrg();
  if (role === "VIEWER") {
    return { error: "Insufficient permissions" };
  }
  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }
  const group = await prisma.personaGroup.findUnique({
    where: { id: groupId },
    select: { organizationId: true },
  });
  if (!group || group.organizationId !== activeOrgId) {
    return { error: "Persona group not found" };
  }
  if (selected) {
    await prisma.studyPersonaGroup.upsert({
      where: {
        studyId_personaGroupId: { studyId, personaGroupId: groupId },
      },
      update: {},
      create: { studyId, personaGroupId: groupId },
    });
  } else {
    await prisma.studyPersonaGroup.deleteMany({
      where: { studyId, personaGroupId: groupId },
    });
  }
  revalidatePath(`/studies/${studyId}`);
  return { success: true };
}

export async function getSessionMessages(sessionId: string) {
  const { activeOrgId } = await getActiveOrg();
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      study: { select: { organizationId: true } },
      messages: { orderBy: { sequence: "asc" } },
    },
  });
  if (!session || session.study.organizationId !== activeOrgId) {
    return { messages: [] as Array<{ id: string; role: "user" | "assistant"; content: string }> };
  }
  const messages = session.messages
    .filter((m) => m.role === "INTERVIEWER" || m.role === "RESPONDENT")
    .map((m) => ({
      id: m.id,
      role: m.role === "INTERVIEWER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
  return { messages };
}

export async function runBatchInterviews(studyId: string) {
  const { activeOrgId } = await getActiveOrg();

  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }

  // Count pending personas
  const existingPersonaIds = new Set(study.sessions.map((s) => s.personaId));
  const allPersonas = study.personaGroups.flatMap(
    (spg) => spg.personaGroup.personas
  );
  const pendingCount = allPersonas.filter(
    (p) => !existingPersonaIds.has(p.id)
  ).length;

  if (pendingCount === 0) {
    return { error: "All personas already have sessions" };
  }

  // Send event directly to Inngest (no HTTP round-trip)
  const { inngest } = await import("@/lib/inngest/client");
  await inngest.send({
    name: "study/run-batch",
    data: { studyId },
  });

  revalidatePath(`/studies/${studyId}`);
  return { success: true, pendingCount };
}

export async function triggerInsights(
  studyId: string,
  options?: { analysisTypes?: string[]; customPrompt?: string }
) {
  const { activeOrgId } = await getActiveOrg();

  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }

  const completedSessions = study.sessions.filter(
    (s) => s.status === "COMPLETED"
  );
  if (completedSessions.length === 0) {
    return { error: "No completed interviews to analyze" };
  }

  const { inngest } = await import("@/lib/inngest/client");
  await inngest.send({
    name: "study/generate-insights",
    data: {
      studyId,
      ...(options?.analysisTypes?.length ? { analysisTypes: options.analysisTypes } : {}),
      ...(options?.customPrompt ? { customPrompt: options.customPrompt } : {}),
    },
  });

  revalidatePath(`/studies/${studyId}`);
  return { success: true };
}

export async function removeStudy(studyId: string) {
  const { activeOrgId, role } = await getActiveOrg();

  if (role === "VIEWER") {
    return { error: "Insufficient permissions" };
  }

  const study = await getStudy(studyId);
  if (!study || study.organizationId !== activeOrgId) {
    return { error: "Study not found" };
  }

  await deleteStudy(studyId);
  revalidatePath("/studies");
  return { success: true };
}
