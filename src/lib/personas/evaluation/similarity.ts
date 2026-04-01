import { embed } from "ai";
import { prisma } from "@/lib/db/prisma";
import { getEmbeddingModel } from "@/lib/ai/provider";
import { uniquenessPenaltyFromSimilarity, clampScore } from "./scoring";

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

function fallbackEmbedding(text: string): number[] {
  const vec = new Array(128).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % 128] += text.charCodeAt(i) / 255;
  }
  return vec;
}

export async function buildPersonaEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: getEmbeddingModel(),
      value: text,
    });
    return embedding;
  } catch {
    return fallbackEmbedding(text);
  }
}

export function buildNormalizedPersonaText(persona: {
  name: string;
  bio: string | null;
  backstory: string;
  goals: unknown;
  frustrations: unknown;
  behaviors: unknown;
  archetype: string | null;
  representativeQuote: string | null;
  dayInTheLife: string | null;
  communicationSample: string | null;
}): string {
  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((v) => typeof v === "string").join(" | ") : "";
  return normalizeText(
    [
      persona.name,
      persona.archetype ?? "",
      persona.bio ?? "",
      persona.backstory,
      persona.representativeQuote ?? "",
      persona.dayInTheLife ?? "",
      persona.communicationSample ?? "",
      list(persona.goals),
      list(persona.frustrations),
      list(persona.behaviors),
    ].join("\n")
  );
}

export async function computeUniquenessForPersona(params: {
  personaId: string;
  personaGroupId: string;
  normalizedText: string;
}): Promise<{
  uniquenessScore: number;
  embedding: number[];
  matches: Array<{ matchedPersonaId: string; similarityScore: number; reason: string }>;
}> {
  const embedding = await buildPersonaEmbedding(params.normalizedText);
  const others = await prisma.persona.findMany({
    where: {
      personaGroupId: params.personaGroupId,
      isActive: true,
      NOT: { id: params.personaId },
    },
    select: {
      id: true,
      normalizedText: true,
      embeddingJson: true,
      archetype: true,
    },
    take: 30,
  });

  const scored = others
    .map((other) => {
      const otherEmbedding = Array.isArray(other.embeddingJson)
        ? (other.embeddingJson as number[])
        : other.normalizedText
          ? fallbackEmbedding(other.normalizedText)
          : [];
      const similarity = cosineSimilarity(embedding, otherEmbedding);
      return {
        matchedPersonaId: other.id,
        similarityScore: similarity,
        reason: other.archetype ? `Similar archetype: ${other.archetype}` : "High semantic similarity",
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);

  const penalty = scored.reduce((sum, item) => sum + uniquenessPenaltyFromSimilarity(item.similarityScore), 0);
  return {
    uniquenessScore: clampScore(100 - penalty),
    embedding,
    matches: scored,
  };
}
