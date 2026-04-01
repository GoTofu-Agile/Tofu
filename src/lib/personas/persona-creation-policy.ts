/**
 * Persona creation progression: quality tier, batch caps, and feature gates.
 * Thresholds are org-wide (count of Persona rows in the organization).
 */

export type PersonaQualityTier = 1 | 2 | 3;

/** Org persona count → tier (evaluated before each generation batch). */
export function qualityTierFromOrgPersonaCount(orgPersonaCount: number): PersonaQualityTier {
  if (orgPersonaCount < 5) return 1;
  if (orgPersonaCount < 25) return 2;
  return 3;
}

export function maxBatchPersonasForTier(tier: PersonaQualityTier): number {
  if (tier === 1) return 15;
  if (tier === 2) return 50;
  return 100;
}

/** Deep search (heavy research path) unlocks after the org has this many personas. */
export const DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS = 5;

export function isDeepSearchUnlocked(orgPersonaCount: number): boolean {
  return orgPersonaCount >= DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS;
}

export function personasUntilDeepSearchUnlock(orgPersonaCount: number): number {
  return Math.max(0, DEEP_SEARCH_UNLOCK_AT_ORG_PERSONAS - orgPersonaCount);
}

export function qualityTierLabel(tier: PersonaQualityTier): string {
  if (tier === 1) return "Standard";
  if (tier === 2) return "Enhanced";
  return "Premium";
}

export function qualityTierDescription(tier: PersonaQualityTier): string {
  if (tier === 1) {
    return "Generate more personas in this workspace to unlock higher model quality and larger batches.";
  }
  if (tier === 2) {
    return "Your workspace uses an enhanced model tier. Keep building toward Premium for the strongest settings.";
  }
  return "Premium model tier — largest batches and deepest generation settings for this workspace.";
}
