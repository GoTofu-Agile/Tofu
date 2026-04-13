import { embed, generateObject } from "ai";
import { z } from "zod";
import type { PersonaOutput } from "@/lib/validation/schemas";
import { getEmbeddingModel, getModel } from "@/lib/ai/provider";

const evalSchema = z.object({
  eval_summary: z.string().min(10).max(600),
  eval_dimensions: z.object({
    specificity: z.number().int().min(0).max(100),
    plausibility: z.number().int().min(0).max(100),
    non_genericity: z.number().int().min(0).max(100),
    consistency: z.number().int().min(0).max(100),
    diversity: z.number().int().min(0).max(100),
  }),
  flags: z.array(
    z.enum([
      "generic_upbringing",
      "cliche_language",
      "too_polished",
      "repetitive_structure",
      "low_specificity",
      "implausible_timeline",
    ])
  ),
});

export type PersonaAuthenticityResult = {
  authenticity_score: number;
  authenticity_band: "low" | "medium" | "high";
  eval_summary: string;
  eval_dimensions: {
    specificity: number;
    plausibility: number;
    non_genericity: number;
    consistency: number;
    diversity: number;
  };
  flags: string[];
  evalRaw: unknown;
  backstoryEmbedding: number[];
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 2);
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

function fallbackEmbedding(text: string): number[] {
  const v = new Array(128).fill(0);
  for (let i = 0; i < text.length; i++) {
    v[i % 128] += text.charCodeAt(i) / 255;
  }
  return v;
}

export function detectBackstoryCliches(text: string): string[] {
  const normalized = text.toLowerCase();
  const matches: string[] = [];
  const cliches = [
    "grew up in a small village",
    "small village",
    "humble beginnings",
    "always had a passion",
    "from a young age",
    "dreamed of success",
    "worked hard to achieve",
  ];
  if (cliches.some((phrase) => normalized.includes(phrase))) {
    matches.push("cliche_language");
    matches.push("generic_upbringing");
  }
  if (/passionate|visionary|exceptional|driven by purpose/.test(normalized)) {
    matches.push("too_polished");
  }
  if (text.length < 180) matches.push("low_specificity");
  return Array.from(new Set(matches));
}

/** Local-only similarity (no embedding API). Used for fast-path authenticity scoring. */
export function computePersonaSimilarityLocal(
  text: string,
  corpus: string[]
): { maxSimilarity: number; averageSimilarity: number; embedding: number[] } {
  const embedding = fallbackEmbedding(text);
  if (corpus.length === 0) {
    return { maxSimilarity: 0, averageSimilarity: 0, embedding };
  }
  const similarities = corpus.map((candidate) =>
    cosineSimilarity(embedding, fallbackEmbedding(candidate))
  );
  const maxSimilarity = Math.max(...similarities);
  const averageSimilarity =
    similarities.reduce((acc, n) => acc + n, 0) / similarities.length;
  return { maxSimilarity, averageSimilarity, embedding };
}

export async function computePersonaSimilarity(text: string, corpus: string[]): Promise<{
  maxSimilarity: number;
  averageSimilarity: number;
  embedding: number[];
}> {
  let embedding: number[];
  try {
    const result = await embed({ model: getEmbeddingModel(), value: text });
    embedding = result.embedding;
  } catch {
    embedding = fallbackEmbedding(text);
  }

  if (corpus.length === 0) {
    return { maxSimilarity: 0, averageSimilarity: 0, embedding };
  }

  const similarities = corpus.map((candidate) => {
    const candidateEmbedding = fallbackEmbedding(candidate);
    return cosineSimilarity(embedding, candidateEmbedding);
  });
  const maxSimilarity = Math.max(...similarities);
  const averageSimilarity =
    similarities.reduce((acc, n) => acc + n, 0) / similarities.length;
  return { maxSimilarity, averageSimilarity, embedding };
}

export function mapScoreToBand(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "high";
  if (score >= 40) return "medium";
  return "low";
}

function personaEvalCorpusText(persona: PersonaOutput): string {
  return [
    persona.name,
    persona.location,
    persona.occupation,
    persona.backstory,
    persona.dayInTheLife,
    persona.communicationSample,
    persona.behaviors.join("\n"),
    persona.contradictions.join("\n"),
    persona.formativeExperiences.join("\n"),
    persona.recurringHabit,
    persona.habits.join("\n"),
    persona.opinions.join("\n"),
    persona.quirks.join("\n"),
    persona.communicationFingerprint,
    persona.cognitiveBiasOrIrrationalStreak,
  ].join("\n");
}

/**
 * Fast path: no LLM, no embedding API — rule-based score suitable for persistence and UI.
 * Full `scorePersonaAuthenticity` remains available for quality mode.
 */
export async function scorePersonaAuthenticityHeuristic(
  persona: PersonaOutput,
  recentPersonas: Array<{
    backstory: string | null;
    dayInTheLife: string | null;
    archetype: string | null;
  }>
): Promise<PersonaAuthenticityResult> {
  const personaText = personaEvalCorpusText(persona);

  const clicheFlags = detectBackstoryCliches(personaText);
  const corpus = recentPersonas.map((p) =>
    [p.backstory ?? "", p.dayInTheLife ?? "", p.archetype ?? ""].join("\n")
  );
  const similarity = computePersonaSimilarityLocal(personaText, corpus);

  let ruleScore = 78;
  if (similarity.maxSimilarity >= 0.92) {
    ruleScore -= 45;
  } else if (similarity.maxSimilarity >= 0.85) {
    ruleScore -= 28;
  } else if (similarity.maxSimilarity >= 0.75) {
    ruleScore -= 12;
  }
  ruleScore -= clicheFlags.length * 8;

  const traitWord = /\b(friendly|hardworking|funny|passionate|driven|resilient|people person|team player)\b/i;
  if (persona.behaviors.some((b) => traitWord.test(b))) {
    ruleScore -= 6;
  }

  let richnessBonus = 0;
  if (persona.contradictions.length >= 1) richnessBonus += 4;
  if (persona.behaviors.length >= 3 && persona.behaviors.every((b) => b.length >= 28)) richnessBonus += 3;
  if (persona.communicationFingerprint.length >= 55) richnessBonus += 2;
  if (persona.formativeExperiences[0].length >= 40 && persona.formativeExperiences[1].length >= 40) {
    richnessBonus += 2;
  }
  ruleScore += richnessBonus;

  ruleScore = Math.max(0, Math.min(100, ruleScore));

  const dim = Math.max(35, Math.min(92, ruleScore + (personaText.length > 400 ? 4 : -4)));
  const eval_dimensions = {
    specificity: dim,
    plausibility: dim,
    non_genericity: Math.max(30, dim - clicheFlags.length * 5),
    consistency: dim,
    diversity: Math.max(40, dim - (similarity.maxSimilarity > 0.7 ? 12 : 0)),
  };

  const authenticity_score = ruleScore;
  const flags = Array.from(new Set(clicheFlags));

  return {
    authenticity_score,
    authenticity_band: mapScoreToBand(authenticity_score),
    eval_summary:
      "Fast-path heuristic evaluation (no judge LLM). Scores reflect length, cliché checks, and rough corpus distance.",
    eval_dimensions,
    flags,
    evalRaw: {
      heuristic: true,
      ruleScore,
      richnessBonus,
      similarity,
      tokenCount: tokenize(personaText).length,
    },
    backstoryEmbedding: similarity.embedding,
  };
}

export async function scorePersonaAuthenticity(
  persona: PersonaOutput,
  recentPersonas: Array<{
    backstory: string | null;
    dayInTheLife: string | null;
    archetype: string | null;
  }>
): Promise<PersonaAuthenticityResult> {
  const personaText = personaEvalCorpusText(persona);

  const clicheFlags = detectBackstoryCliches(personaText);
  const corpus = recentPersonas.map((p) =>
    [p.backstory ?? "", p.dayInTheLife ?? "", p.archetype ?? ""].join("\n")
  );
  const similarity = await computePersonaSimilarity(personaText, corpus);

  const { object: modelEval } = await generateObject({
    model: getModel(),
    schema: evalSchema,
    prompt: `Evaluate this synthetic persona for authenticity quality.
Return JSON only.

Score dimensions (0-100):
- specificity
- plausibility
- non_genericity
- consistency
- diversity (vs recent personas context)

Penalize:
- cliche upbringing tropes
- repetitive structure
- polished inspirational fluff
- implausible life timelines

Recent personas context:
${corpus.slice(0, 10).join("\n\n---\n\n") || "No recent personas."}

Persona:
${personaText}`,
  });

  const modelScore = Math.round(
    (modelEval.eval_dimensions.specificity +
      modelEval.eval_dimensions.plausibility +
      modelEval.eval_dimensions.non_genericity +
      modelEval.eval_dimensions.consistency +
      modelEval.eval_dimensions.diversity) /
      5
  );

  let ruleScore = 100;
  if (similarity.maxSimilarity >= 0.92) {
    ruleScore -= 45;
  } else if (similarity.maxSimilarity >= 0.85) {
    ruleScore -= 28;
  } else if (similarity.maxSimilarity >= 0.75) {
    ruleScore -= 12;
  }
  ruleScore -= clicheFlags.length * 8;
  ruleScore = Math.max(0, Math.min(100, ruleScore));

  const authenticity_score = Math.max(
    0,
    Math.min(100, Math.round(modelScore * 0.7 + ruleScore * 0.3))
  );
  const flags = Array.from(new Set([...modelEval.flags, ...clicheFlags]));

  return {
    authenticity_score,
    authenticity_band: mapScoreToBand(authenticity_score),
    eval_summary: modelEval.eval_summary,
    eval_dimensions: modelEval.eval_dimensions,
    flags,
    evalRaw: {
      modelEval,
      ruleScore,
      modelScore,
      similarity,
      tokenCount: tokenize(personaText).length,
    },
    backstoryEmbedding: similarity.embedding,
  };
}
