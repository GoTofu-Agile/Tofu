import { prisma } from "@/lib/db/prisma";
import type { SourceType } from "@prisma/client";

export async function getPersonaGroupsForOrg(organizationId: string) {
  return prisma.personaGroup.findMany({
    where: { organizationId },
    include: {
      _count: { select: { personas: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPersonaGroup(groupId: string) {
  return prisma.personaGroup.findUnique({
    where: { id: groupId },
    include: {
      _count: { select: { personas: true } },
    },
  });
}

export async function createPersonaGroup(data: {
  organizationId: string;
  name: string;
  description?: string;
  domainContext?: string;
  sourceType?: SourceType;
}) {
  return prisma.personaGroup.create({
    data: {
      organizationId: data.organizationId,
      name: data.name,
      description: data.description,
      domainContext: data.domainContext,
      sourceType: data.sourceType ?? "PROMPT_GENERATED",
    },
  });
}

export async function deletePersonaGroup(groupId: string) {
  return prisma.personaGroup.delete({
    where: { id: groupId },
  });
}

export async function getPersonasForGroup(
  groupId: string,
  options?: { skip?: number; take?: number }
) {
  return prisma.persona.findMany({
    where: { personaGroupId: groupId, isActive: true },
    include: {
      personality: true,
    },
    orderBy: { createdAt: "asc" },
    skip: options?.skip,
    take: options?.take,
  });
}

export async function getPersona(personaId: string) {
  return prisma.persona.findUnique({
    where: { id: personaId },
    include: {
      personality: true,
      personaGroup: {
        select: { id: true, name: true, organizationId: true },
      },
    },
  });
}

export async function getPersonaCount(groupId: string) {
  return prisma.persona.count({
    where: { personaGroupId: groupId, isActive: true },
  });
}
