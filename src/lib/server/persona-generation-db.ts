import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type { PersonaGenerationStatus } from "@/lib/server/persona-generation-types";

/** JSON key on PersonaGroup.metadata (must match SQL below). */
const META_FRAGMENT = "activePersonaGeneration" as const;

export const PERSONA_GEN_STALE_MS = 45 * 60 * 1000;

function isTerminal(phase: PersonaGenerationStatus["phase"]): boolean {
  return phase === "done" || phase === "error";
}

function toStatus(raw: Record<string, unknown>): PersonaGenerationStatus | null {
  if (typeof raw.runId !== "string" || typeof raw.userId !== "string" || typeof raw.groupId !== "string") {
    return null;
  }
  const phase = raw.phase as PersonaGenerationStatus["phase"];
  if (
    phase !== "starting" &&
    phase !== "researching" &&
    phase !== "generating" &&
    phase !== "done" &&
    phase !== "error"
  ) {
    return null;
  }
  return {
    runId: raw.runId,
    userId: raw.userId,
    groupId: raw.groupId,
    phase,
    completed: Number(raw.completed ?? 0),
    total: Number(raw.total ?? 0),
    currentName: raw.currentName == null ? null : String(raw.currentName),
    generated: Number(raw.generated ?? 0),
    errors: Number(raw.errors ?? 0),
    message: raw.message == null ? null : String(raw.message),
    updatedAt: Number(raw.updatedAt ?? Date.now()),
  };
}

export function parseActiveGenerationFromMetadata(metadata: unknown): PersonaGenerationStatus | null {
  if (!metadata || typeof metadata !== "object") return null;
  const ag = (metadata as Record<string, unknown>)[META_FRAGMENT];
  if (!ag || typeof ag !== "object") return null;
  return toStatus(ag as Record<string, unknown>);
}

export async function getActivePersonaGenerationForGroup(
  groupId: string
): Promise<PersonaGenerationStatus | null> {
  const row = await prisma.personaGroup.findUnique({
    where: { id: groupId },
    select: { metadata: true },
  });
  return parseActiveGenerationFromMetadata(row?.metadata ?? null);
}

export async function getPersonaGenerationStatusByRunId(
  runId: string
): Promise<PersonaGenerationStatus | null> {
  const rows = await prisma.$queryRaw<Array<{ metadata: unknown }>>`
    SELECT metadata FROM "PersonaGroup"
    WHERE metadata->'activePersonaGeneration'->>'runId' = ${runId}
    LIMIT 1
  `;
  return parseActiveGenerationFromMetadata(rows[0]?.metadata ?? null);
}

/** True when another non-terminal run is in progress (unless stale). */
export async function isPersonaGenerationBlockedForGroup(groupId: string): Promise<{
  blocked: boolean;
  reason?: string;
}> {
  const active = await getActivePersonaGenerationForGroup(groupId);
  if (!active) return { blocked: false };
  if (isTerminal(active.phase)) return { blocked: false };
  if (Date.now() - active.updatedAt > PERSONA_GEN_STALE_MS) return { blocked: false };
  return {
    blocked: true,
    reason:
      "Persona generation is already running for this group. Wait for it to finish or try again in a few minutes.",
  };
}

export async function savePersonaGenerationStatusToDb(status: PersonaGenerationStatus): Promise<void> {
  const row = await prisma.personaGroup.findUnique({
    where: { id: status.groupId },
    select: { metadata: true },
  });
  const meta = { ...((row?.metadata as Record<string, unknown> | null) ?? {}) };
  meta[META_FRAGMENT] = {
    runId: status.runId,
    userId: status.userId,
    groupId: status.groupId,
    phase: status.phase,
    completed: status.completed,
    total: status.total,
    currentName: status.currentName,
    generated: status.generated,
    errors: status.errors,
    message: status.message,
    updatedAt: status.updatedAt,
  };
  await prisma.personaGroup.update({
    where: { id: status.groupId },
    data: { metadata: meta as Prisma.InputJsonValue },
  });
}
