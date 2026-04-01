import { describe, expect, it } from "vitest";
import {
  computeTrustScore,
  confidenceFromTrust,
  uniquenessPenaltyFromSimilarity,
} from "./scoring";

describe("persona evaluation scoring", () => {
  it("computes weighted trust score", () => {
    const trust = computeTrustScore({
      factualityScore: 80,
      consistencyScore: 70,
      realismScore: 60,
      verifiabilityScore: 50,
      uniquenessScore: 90,
    });
    expect(trust).toBe(71);
  });

  it("maps confidence label thresholds", () => {
    expect(confidenceFromTrust(20)).toBe("low");
    expect(confidenceFromTrust(55)).toBe("medium");
    expect(confidenceFromTrust(90)).toBe("high");
  });

  it("applies expected similarity penalties", () => {
    expect(uniquenessPenaltyFromSimilarity(0.93)).toBe(55);
    expect(uniquenessPenaltyFromSimilarity(0.88)).toBe(35);
    expect(uniquenessPenaltyFromSimilarity(0.8)).toBe(15);
    expect(uniquenessPenaltyFromSimilarity(0.7)).toBe(0);
  });
});
