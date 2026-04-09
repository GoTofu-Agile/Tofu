import {
  extractJsonMiddleware,
  generateObject,
  generateText,
  wrapLanguageModel,
} from "ai";
import { getModel } from "@/lib/ai/provider";
import {
  parsePersonaJudgeOutputLoose,
  personaJudgeOutputSchema,
} from "@/lib/validation/schemas";

const MAX_PERSONA_TEXT = 28_000;
const MAX_SOURCE_CONTEXT = 20_000;

function truncateForPrompt(label: string, text: string, max: number): string {
  if (text.length <= max) return text;
  const head = Math.floor(max * 0.55);
  const tail = max - head - 40;
  return `${text.slice(0, head)}\n\n[${label} truncated…]\n\n${text.slice(-Math.max(tail, 0))}`;
}

function buildJudgePrompt(personaText: string, sourceContext: string) {
  return `You are evaluating a synthetic research persona for quality and trust.
Return a single JSON object only (no markdown fences).

Required keys:
- factualityScore, consistencyScore, realismScore, verifiabilityScore: integers 0-100
- summary: string (under 900 characters)
- riskFlags: array of short strings (can be empty)
- extractedClaims: array of objects with claimText, claimType, status, confidence (0-100 integer), evidence (array of strings)

claimType must be one of: identity, demographic, career, education, skills, location, preference, behavioral, timeline, other.
status must be one of: SUPPORTED, UNSUPPORTED, UNCERTAIN, SYNTHETIC.

Evaluate:
- factual plausibility (factualityScore)
- internal consistency (consistencyScore)
- realism/authenticity (realismScore)
- verifiability (verifiabilityScore)

Penalize:
- contradictions
- fabricated sounding details
- generic AI tropes / repetitive backstory patterns
- shallow non-specific content

SOURCE CONTEXT:
${sourceContext || "No external source context provided; persona may be synthetic."}

PERSONA:
${personaText}
`;
}

async function stripJsonFromModelText(text: string): Promise<string> {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  if (fence) return fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return t;
}

export async function judgePersona(params: {
  personaText: string;
  sourceContext: string;
}) {
  const personaText = truncateForPrompt("Persona", params.personaText, MAX_PERSONA_TEXT);
  const sourceContext = truncateForPrompt(
    "Sources",
    params.sourceContext,
    MAX_SOURCE_CONTEXT
  );

  const baseModel = getModel();
  const model = wrapLanguageModel({
    model: baseModel,
    middleware: extractJsonMiddleware(),
  });

  const prompt = buildJudgePrompt(personaText, sourceContext);

  try {
    const { object } = await generateObject({
      model,
      schema: personaJudgeOutputSchema,
      prompt,
      temperature: 0.2,
      maxRetries: 2,
      experimental_repairText: async ({ text }) => stripJsonFromModelText(text),
    });
    return object;
  } catch (primaryError) {
    const hint =
      primaryError instanceof Error ? primaryError.message : String(primaryError);
    console.warn("[persona-judge] generateObject failed, using text fallback:", hint);

    const { text } = await generateText({
      model: baseModel,
      prompt: `${prompt}

Output rules: respond with ONLY one JSON object. No markdown, no commentary.`,
      temperature: 0.15,
      maxRetries: 1,
    });

    let raw: unknown;
    try {
      const cleaned = await stripJsonFromModelText(text);
      raw = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `Trust evaluation could not parse model output. ` +
          `Check LLM API keys and model access (LLM_PROVIDER / provider keys). ` +
          `Original error: ${hint}`
      );
    }

    try {
      return parsePersonaJudgeOutputLoose(raw);
    } catch (parseErr) {
      const parseHint =
        parseErr instanceof Error ? parseErr.message : String(parseErr);
      throw new Error(
        `Trust evaluation output was invalid after repair. ${parseHint}. Original: ${hint}`
      );
    }
  }
}
