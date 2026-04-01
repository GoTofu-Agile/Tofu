import type { ConfidenceLabel } from "@prisma/client";

export type ScoreInput = {
  factualityScore: number;
  consistencyScore: number;
  realismScore: number;
  verifiabilityScore: number;
  uniquenessScore: number;
};

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeTrustScore(scores: ScoreInput): number {
  const weighted =
    0.35 * scores.factualityScore +
    0.2 * scores.consistencyScore +
    0.2 * scores.realismScore +
    0.15 * scores.verifiabilityScore +
    0.1 * scores.uniquenessScore;
  return clampScore(weighted);
}

export function confidenceFromTrust(score: number): ConfidenceLabel {
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function uniquenessPenaltyFromSimilarity(similarity: number): number {
  if (similarity >= 0.92) return 55;
  if (similarity >= 0.85) return 35;
  if (similarity >= 0.75) return 15;
  return 0;
}
