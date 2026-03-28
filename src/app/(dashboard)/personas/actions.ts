"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { createPersonaGroupSchema } from "@/lib/validation/schemas";
import {
  createPersonaGroup,
  deletePersonaGroup,
  getPersonaGroup,
} from "@/lib/db/queries/personas";
import { getUserRole } from "@/lib/db/queries/organizations";
import { prisma } from "@/lib/db/prisma";

export async function createGroup(formData: FormData) {
  const user = await requireAuth();

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) {
    return { error: "No active organization" };
  }

  const role = await getUserRole(activeOrgId, user.id);
  if (!role) {
    return { error: "Not a member of this organization" };
  }

  const parsed = createPersonaGroupSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    domainContext: formData.get("domainContext") || undefined,
    count: Number(formData.get("count")) || 5,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const group = await createPersonaGroup({
    organizationId: activeOrgId,
    name: parsed.data.name,
    description: parsed.data.description,
    domainContext: parsed.data.domainContext,
  });

  revalidatePath("/personas");
  return {
    success: true,
    groupId: group.id,
    count: parsed.data.count,
    domainContext: parsed.data.domainContext,
  };
}

export async function removeGroup(groupId: string) {
  const user = await requireAuth();

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) {
    return { error: "No active organization" };
  }

  const role = await getUserRole(activeOrgId, user.id);
  if (!role || role === "VIEWER") {
    return { error: "Insufficient permissions" };
  }

  // Verify group belongs to active org
  const group = await getPersonaGroup(groupId);
  if (!group || group.organizationId !== activeOrgId) {
    return { error: "Group not found" };
  }

  await deletePersonaGroup(groupId);
  revalidatePath("/personas");
  return { success: true };
}

export async function duplicatePersona(personaId: string) {
  const user = await requireAuth();
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get("activeOrgId")?.value;
  if (!activeOrgId) return { error: "No active organization" };

  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    include: {
      personality: true,
      personaGroup: { select: { organizationId: true, id: true } },
    },
  });
  if (!persona || persona.personaGroup.organizationId !== activeOrgId) {
    return { error: "Persona not found" };
  }

  const role = await getUserRole(activeOrgId, user.id);
  if (!role || role === "VIEWER") return { error: "Insufficient permissions" };

  const goals = Array.isArray(persona.goals) ? persona.goals : [];
  const frustrations = Array.isArray(persona.frustrations)
    ? persona.frustrations
    : [];
  const behaviors = Array.isArray(persona.behaviors) ? persona.behaviors : [];
  const coreValues = Array.isArray(persona.coreValues) ? persona.coreValues : [];

  const duplicate = await prisma.persona.create({
    data: {
      personaGroupId: persona.personaGroupId,
      name: `${persona.name} (Copy)`,
      age: persona.age,
      gender: persona.gender,
      location: persona.location,
      occupation: persona.occupation,
      bio: persona.bio,
      backstory: persona.backstory,
      goals,
      frustrations,
      behaviors,
      sourceType: persona.sourceType,
      qualityScore: persona.qualityScore,
      llmSystemPrompt: persona.llmSystemPrompt,
      archetype: persona.archetype,
      representativeQuote: persona.representativeQuote,
      techLiteracy: persona.techLiteracy,
      domainExpertise: persona.domainExpertise,
      dayInTheLife: persona.dayInTheLife,
      coreValues,
      communicationSample: persona.communicationSample,
      personality: persona.personality
        ? {
            create: {
              openness: persona.personality.openness,
              conscientiousness: persona.personality.conscientiousness,
              extraversion: persona.personality.extraversion,
              agreeableness: persona.personality.agreeableness,
              neuroticism: persona.personality.neuroticism,
              communicationStyle: persona.personality.communicationStyle,
              responseLengthTendency: persona.personality.responseLengthTendency,
              decisionMakingStyle: persona.personality.decisionMakingStyle,
              riskTolerance: persona.personality.riskTolerance,
              trustPropensity: persona.personality.trustPropensity,
              emotionalExpressiveness: persona.personality.emotionalExpressiveness,
              directness: persona.personality.directness,
              criticalFeedbackTendency: persona.personality.criticalFeedbackTendency,
              vocabularyLevel: persona.personality.vocabularyLevel,
              tangentTendency: persona.personality.tangentTendency,
            },
          }
        : undefined,
    },
  });

  await prisma.personaGroup.update({
    where: { id: persona.personaGroupId },
    data: {
      personaCount: {
        increment: 1,
      },
    },
  });

  revalidatePath(`/personas/${persona.personaGroupId}`);
  revalidatePath(`/personas/${persona.personaGroupId}/${persona.id}`);
  return { success: true, personaId: duplicate.id, groupId: persona.personaGroupId };
}
