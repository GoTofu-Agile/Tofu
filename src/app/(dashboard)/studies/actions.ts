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
} from "@/lib/db/queries/studies";
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
