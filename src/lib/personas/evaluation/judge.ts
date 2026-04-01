import { generateObject } from "ai";
import { getModel } from "@/lib/ai/provider";
import { personaJudgeOutputSchema } from "@/lib/validation/schemas";

export async function judgePersona(params: {
  personaText: string;
  sourceContext: string;
}) {
  const prompt = `You are evaluating a synthetic research persona for quality and trust.
Return JSON only.

Evaluate:
- factual plausibility (0-100)
- internal consistency (0-100)
- realism/authenticity (0-100)
- verifiability (0-100)

Penalize:
- contradictions
- fabricated sounding details
- generic AI tropes / repetitive backstory patterns
- shallow non-specific content

Return extractedClaims with claimType/status/confidence/evidence.

SOURCE CONTEXT:
${params.sourceContext || "No external source context provided; persona may be synthetic."}

PERSONA:
${params.personaText}
`;

  const { object } = await generateObject({
    model: getModel(),
    schema: personaJudgeOutputSchema,
    prompt,
  });

  return object;
}
