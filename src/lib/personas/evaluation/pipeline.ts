import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { judgePersona } from "./judge";
import {
  computeTrustScore,
  confidenceFromTrust,
  clampScore,
} from "./scoring";
import {
  buildNormalizedPersonaText,
  computeUniquenessForPersona,
} from "./similarity";
import {
  clearPersonaEvaluationArtifacts,
  setPersonaEvaluationStatus,
} from "./repository";

function stringifyPersona(persona: {
  name: string;
  age: number | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  bio: string | null;
  backstory: string;
  goals: unknown;
  frustrations: unknown;
  behaviors: unknown;
  archetype: string | null;
  representativeQuote: string | null;
  dayInTheLife: string | null;
  communicationSample: string | null;
}) {
  return JSON.stringify(persona, null, 2);
}

export async function runPersonaEvaluation(personaId: string) {
  await setPersonaEvaluationStatus(personaId, "RUNNING");

  const persona = await prisma.persona.findUnique({
    where: { id: personaId },
    include: {
      personaGroup: true,
      dataSources: {
        include: { domainKnowledge: true },
      },
    },
  });
  if (!persona) {
    throw new Error("Persona not found");
  }

  const normalizedText = buildNormalizedPersonaText(persona);
  const uniqueness = await computeUniquenessForPersona({
    personaId: persona.id,
    personaGroupId: persona.personaGroupId,
    normalizedText,
  });

  const sourceContext = persona.dataSources
    .map((s) => `${s.domainKnowledge.title}: ${s.domainKnowledge.content}`)
    .join("\n\n---\n\n");

  const judge = await judgePersona({
    personaText: stringifyPersona(persona),
    sourceContext,
  });

  const trustScore = computeTrustScore({
    factualityScore: judge.factualityScore,
    consistencyScore: judge.consistencyScore,
    realismScore: judge.realismScore,
    verifiabilityScore: judge.verifiabilityScore,
    uniquenessScore: uniqueness.uniquenessScore,
  });

  await prisma.$transaction(async (tx) => {
    await tx.persona.update({
      where: { id: persona.id },
      data: {
        normalizedText,
        embeddingJson: uniqueness.embedding as unknown as Prisma.InputJsonValue,
        evaluationStatus: "COMPLETED",
        evaluationError: Prisma.JsonNull,
      },
    });

    await clearPersonaEvaluationArtifacts(persona.id, tx);

    await tx.personaEvaluation.create({
      data: {
        personaId: persona.id,
        trustScore,
        uniquenessScore: clampScore(uniqueness.uniquenessScore),
        factualityScore: clampScore(judge.factualityScore),
        consistencyScore: clampScore(judge.consistencyScore),
        realismScore: clampScore(judge.realismScore),
        verifiabilityScore: clampScore(judge.verifiabilityScore),
        confidenceLabel: confidenceFromTrust(trustScore),
        summary: judge.summary,
        riskFlags: judge.riskFlags as unknown as Prisma.InputJsonValue,
        evidence: {
          sourceCount: persona.dataSources.length,
          topSimilarityMatches: uniqueness.matches,
        } as Prisma.InputJsonValue,
        version: persona.evaluationVersion,
      },
    });

    if (judge.extractedClaims.length > 0) {
      await tx.personaClaim.createMany({
        data: judge.extractedClaims.map((claim) => ({
          personaId: persona.id,
          claimText: claim.claimText,
          claimType: claim.claimType,
          status: claim.status,
          confidence: claim.confidence,
          evidence: claim.evidence as unknown as Prisma.InputJsonValue,
        })),
      });
    }

    if (uniqueness.matches.length > 0) {
      await tx.similarityMatch.createMany({
        data: uniqueness.matches.map((m) => ({
          personaId: persona.id,
          matchedPersonaId: m.matchedPersonaId,
          similarityScore: m.similarityScore,
          reason: m.reason,
        })),
      });
    }
  });
}
