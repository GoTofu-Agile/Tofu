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

const appReviewDataSourcesInclude = {
  where: { domainKnowledge: { sourceType: "APP_REVIEW" as const } },
  include: {
    domainKnowledge: true,
  },
} as const;

const allDataSourcesInclude = {
  include: {
    domainKnowledge: true,
  },
} as const;

export async function getPersonasForGroup(
  groupId: string,
  options?: { skip?: number; take?: number }
) {
  return prisma.persona.findMany({
    where: { personaGroupId: groupId, isActive: true },
    include: {
      personality: true,
      dataSources: appReviewDataSourcesInclude,
      evaluations: {
        orderBy: { evaluatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "asc" },
    skip: options?.skip,
    take: options?.take,
  });
}

/** Slim query for list/card views — excludes large text fields (backstory, llmSystemPrompt, etc.) */
export async function getPersonasForGroupList(groupId: string) {
  return prisma.persona.findMany({
    where: { personaGroupId: groupId, isActive: true },
    select: {
      id: true,
      name: true,
      age: true,
      gender: true,
      location: true,
      occupation: true,
      archetype: true,
      bio: true,
      representativeQuote: true,
      qualityScore: true,
      authenticityScore: true,
      authenticityBand: true,
      evalSummary: true,
      evaluationStatus: true,
      evaluations: {
        orderBy: { evaluatedAt: "desc" },
        take: 1,
        select: {
          trustScore: true,
          confidenceLabel: true,
          summary: true,
        },
      },
      personality: {
        select: {
          openness: true,
          conscientiousness: true,
          extraversion: true,
          agreeableness: true,
          neuroticism: true,
          communicationStyle: true,
          criticalFeedbackTendency: true,
        },
      },
      // Needed for `appStoreReviewSnippetsFromPersona(persona.dataSources)`
      // on the persona list/card view.
      dataSources: appReviewDataSourcesInclude,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getPersona(personaId: string) {
  return prisma.persona.findUnique({
    where: { id: personaId },
    include: {
      personality: true,
      dataSources: allDataSourcesInclude,
      evaluations: {
        orderBy: { evaluatedAt: "desc" },
        take: 1,
      },
      claims: true,
      similarityMatches: {
        orderBy: { similarityScore: "desc" },
        take: 5,
      },
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

/** All active personas belonging to any group in the organization (for progression / tiers). */
export async function countPersonasForOrganization(organizationId: string) {
  return prisma.persona.count({
    where: {
      isActive: true,
      personaGroup: { organizationId },
    },
  });
}
