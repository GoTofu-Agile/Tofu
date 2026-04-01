import { prisma } from "@/lib/db/prisma";
import type { PersonaEvaluationStatus, Prisma } from "@prisma/client";

export async function setPersonaEvaluationStatus(
  personaId: string,
  status: PersonaEvaluationStatus,
  error?: Prisma.InputJsonValue
) {
  return prisma.persona.update({
    where: { id: personaId },
    data: {
      evaluationStatus: status,
      evaluationError: error ?? undefined,
    },
  });
}

export async function clearPersonaEvaluationArtifacts(
  personaId: string,
  tx: Prisma.TransactionClient = prisma
) {
  await tx.similarityMatch.deleteMany({ where: { personaId } });
  await tx.personaClaim.deleteMany({ where: { personaId } });
}
