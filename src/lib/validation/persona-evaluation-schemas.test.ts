import { describe, expect, it } from "vitest";
import {
  parsePersonaJudgeOutputLoose,
  personaJudgeOutputSchema,
  personaRetryEvaluationSchema,
} from "./schemas";

describe("persona evaluation schemas", () => {
  it("validates judge output", () => {
    const parsed = personaJudgeOutputSchema.safeParse({
      factualityScore: 80,
      consistencyScore: 77,
      realismScore: 71,
      verifiabilityScore: 66,
      summary: "Reasonably grounded with minor inferred details.",
      riskFlags: ["possible timeline inconsistency"],
      extractedClaims: [
        {
          claimText: "Works as a PM in fintech.",
          claimType: "career",
          status: "UNCERTAIN",
          confidence: 62,
          evidence: ["Backstory indicates product role."],
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("normalizes loose judge output (floats, bad enums, evidence shapes)", () => {
    const normalized = parsePersonaJudgeOutputLoose({
      factualityScore: 82.7,
      consistencyScore: "79",
      realismScore: null,
      verifiabilityScore: 64,
      summary: "Mostly coherent.",
      riskFlags: ["generic tone"],
      extractedClaims: [
        {
          claimText: "Works as a product manager",
          claimType: "Career",
          status: "uncertain",
          confidence: 61.2,
          evidence: "Backstory mentions roadmap work",
        },
      ],
    });
    expect(normalized.factualityScore).toBe(83);
    expect(normalized.consistencyScore).toBe(79);
    expect(normalized.realismScore).toBe(50);
    expect(normalized.extractedClaims[0]?.claimType).toBe("career");
    expect(normalized.extractedClaims[0]?.status).toBe("UNCERTAIN");
    expect(normalized.extractedClaims[0]?.evidence.length).toBeGreaterThan(0);
  });

  it("parses retry payload defaults", () => {
    const parsed = personaRetryEvaluationSchema.parse({});
    expect(parsed.force).toBe(false);
  });
});
