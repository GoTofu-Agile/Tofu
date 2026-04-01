import { prisma } from "@/lib/db/prisma";
import { countPersonasForOrganization } from "@/lib/db/queries/personas";
import {
  isDeepSearchUnlocked,
  maxBatchPersonasForTier,
  personasUntilDeepSearchUnlock,
  qualityTierDescription,
  qualityTierFromOrgPersonaCount,
  qualityTierLabel,
  type PersonaQualityTier,
} from "@/lib/personas/persona-creation-policy";

export type PersonaCreationContext = {
  organizationPersonaCount: number;
  platformPersonasToday: number;
  qualityTier: PersonaQualityTier;
  qualityTierLabel: string;
  qualityTierDescription: string;
  maxBatchPersonas: number;
  deepSearchUnlocked: boolean;
  personasUntilDeepSearch: number;
};

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getPersonaCreationContext(
  organizationId: string
): Promise<PersonaCreationContext> {
  const [organizationPersonaCount, platformPersonasToday] = await Promise.all([
    countPersonasForOrganization(organizationId),
    prisma.persona.count({
      where: { createdAt: { gte: startOfUtcDay() } },
    }),
  ]);

  const qualityTier = qualityTierFromOrgPersonaCount(organizationPersonaCount);
  const maxBatchPersonas = maxBatchPersonasForTier(qualityTier);

  return {
    organizationPersonaCount,
    platformPersonasToday,
    qualityTier,
    qualityTierLabel: qualityTierLabel(qualityTier),
    qualityTierDescription: qualityTierDescription(qualityTier),
    maxBatchPersonas,
    deepSearchUnlocked: isDeepSearchUnlocked(organizationPersonaCount),
    personasUntilDeepSearch: personasUntilDeepSearchUnlock(organizationPersonaCount),
  };
}
