import { describe, expect, it } from "vitest";
import {
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

  it("parses retry payload defaults", () => {
    const parsed = personaRetryEvaluationSchema.parse({});
    expect(parsed.force).toBe(false);
  });
});
