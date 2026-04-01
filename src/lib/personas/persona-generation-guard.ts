import { prisma } from "@/lib/db/prisma";
import { countPersonasForOrganization } from "@/lib/db/queries/personas";
import {
  DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS,
  isDeepSearchUnlocked,
  maxBatchPersonasForTier,
  qualityTierFromOrgPersonaCount,
  type PersonaQualityTier,
} from "@/lib/personas/persona-creation-policy";

export type PersonaGenerationGuard = {
  organizationId: string;
  orgPersonaCount: number;
  tier: PersonaQualityTier;
  maxBatch: number;
  deepSearchUnlocked: boolean;
};

export async function getPersonaGenerationGuardForGroup(
  groupId: string
): Promise<PersonaGenerationGuard | null> {
  const group = await prisma.personaGroup.findUnique({
    where: { id: groupId },
    select: { organizationId: true },
  });
  if (!group) return null;
  const orgPersonaCount = await countPersonasForOrganization(group.organizationId);
  const tier = qualityTierFromOrgPersonaCount(orgPersonaCount);
  return {
    organizationId: group.organizationId,
    orgPersonaCount,
    tier,
    maxBatch: maxBatchPersonasForTier(tier),
    deepSearchUnlocked: isDeepSearchUnlocked(orgPersonaCount),
  };
}

export function assertPersonaGenerationAllowed(params: {
  guard: PersonaGenerationGuard;
  requestedCount: number;
  usedDeepResearchPipeline?: boolean;
}): void {
  const { guard, requestedCount, usedDeepResearchPipeline } = params;
  if (requestedCount > guard.maxBatch) {
    throw new Error(
      `Batch size is limited to ${guard.maxBatch} personas for your workspace tier. Generate more personas in this workspace to unlock larger batches.`
    );
  }
  if (usedDeepResearchPipeline && !guard.deepSearchUnlocked) {
    throw new Error(
      `Deep research unlocks after ${DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS} personas in this workspace. Use Quick create or other methods until then.`
    );
  }
}
